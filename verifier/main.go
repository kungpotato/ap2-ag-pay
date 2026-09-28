// AP2 signature verifier — a standalone service, deliberately not part of
// the Next.js app or its Node process. It re-implements Ed25519 signature
// verification independently in a different language, so "this mandate's
// signature is valid" is a fact two unrelated codebases agree on, not just
// something the app that needs the answer asserts about itself.
package main

import (
	"bytes"
	"crypto/ed25519"
	"crypto/x509"
	"encoding/base64"
	"encoding/json"
	"encoding/pem"
	"errors"
	"fmt"
	"log"
	"net/http"
)

type verifyRequest struct {
	Payload         json.RawMessage `json:"payload"`
	Signature       string          `json:"signature"`
	SignerPublicKey string          `json:"signerPublicKey"`
}

type verifyResponse struct {
	Valid  bool   `json:"valid"`
	Reason string `json:"reason,omitempty"`
}

// canonicalize mirrors lib/ap2/sign.ts's canonicalize(): decode with
// UseNumber so integers keep their exact original text, then re-marshal —
// encoding/json sorts map keys and uses compact output by default, which is
// exactly what the TypeScript side does by hand.
func canonicalize(raw json.RawMessage) ([]byte, error) {
	dec := json.NewDecoder(bytes.NewReader(raw))
	dec.UseNumber()
	var v any
	if err := dec.Decode(&v); err != nil {
		return nil, err
	}
	return json.Marshal(v)
}

func parsePublicKey(pemStr string) (ed25519.PublicKey, error) {
	block, _ := pem.Decode([]byte(pemStr))
	if block == nil {
		return nil, errors.New("invalid PEM block")
	}
	pub, err := x509.ParsePKIXPublicKey(block.Bytes)
	if err != nil {
		return nil, err
	}
	edPub, ok := pub.(ed25519.PublicKey)
	if !ok {
		return nil, errors.New("not an Ed25519 public key")
	}
	return edPub, nil
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func verifyHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req verifyRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, verifyResponse{Reason: "invalid request body"})
		return
	}

	canon, err := canonicalize(req.Payload)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, verifyResponse{Reason: "invalid payload JSON"})
		return
	}

	pub, err := parsePublicKey(req.SignerPublicKey)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, verifyResponse{Reason: fmt.Sprintf("invalid public key: %v", err)})
		return
	}

	sig, err := base64.StdEncoding.DecodeString(req.Signature)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, verifyResponse{Reason: "invalid base64 signature"})
		return
	}

	writeJSON(w, http.StatusOK, verifyResponse{Valid: ed25519.Verify(pub, canon, sig)})
}

func main() {
	http.HandleFunc("/verify", verifyHandler)
	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	})

	const port = "8787"
	log.Printf("AP2 verifier listening on :%s", port)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}
