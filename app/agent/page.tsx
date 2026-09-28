"use client";

import Link from "next/link";
import { useState } from "react";
import { SignedEnvelope, IntentMandate, CartMandate, CartApproval, PaymentMandate } from "@/lib/ap2/types";
import { verifyEnvelopeInBrowser } from "@/lib/ap2/verifyClient";
import type { Order } from "@/lib/orderStore";

type VerifyState = "idle" | "checking" | "valid" | "invalid";

export default function AgentPage() {
  const [message, setMessage] = useState("หาหนังสือ Go ราคาไม่เกิน 500 บาท");
  const [intentEnvelope, setIntentEnvelope] = useState<SignedEnvelope<IntentMandate> | null>(null);
  const [intentVerify, setIntentVerify] = useState<VerifyState>("idle");
  const [loadingIntent, setLoadingIntent] = useState(false);

  const [cartEnvelope, setCartEnvelope] = useState<SignedEnvelope<CartMandate> | null>(null);
  const [cartVerify, setCartVerify] = useState<VerifyState>("idle");
  const [cartError, setCartError] = useState<string | null>(null);
  const [loadingCart, setLoadingCart] = useState(false);

  const [tamperError, setTamperError] = useState<string | null>(null);
  const [tamperLoading, setTamperLoading] = useState(false);

  const [autoApprove, setAutoApprove] = useState(false);
  const [approvalEnvelope, setApprovalEnvelope] = useState<SignedEnvelope<CartApproval> | null>(null);
  const [approvalVerify, setApprovalVerify] = useState<VerifyState>("idle");
  const [approvalError, setApprovalError] = useState<string | null>(null);
  const [loadingApproval, setLoadingApproval] = useState(false);

  const [paymentEnvelope, setPaymentEnvelope] = useState<SignedEnvelope<PaymentMandate> | null>(null);
  const [paymentVerify, setPaymentVerify] = useState<VerifyState>("idle");
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [loadingPayment, setLoadingPayment] = useState(false);

  const [tamperPayError, setTamperPayError] = useState<string | null>(null);
  const [tamperPayLoading, setTamperPayLoading] = useState(false);

  const [order, setOrder] = useState<Order | null>(null);
  const [orderLoading, setOrderLoading] = useState(false);

  const [budgetTestResult, setBudgetTestResult] = useState<string | null>(null);
  const [budgetTestLoading, setBudgetTestLoading] = useState(false);

  const [expiryTestResult, setExpiryTestResult] = useState<string | null>(null);
  const [expiryTestLoading, setExpiryTestLoading] = useState(false);

  const [declineTestResult, setDeclineTestResult] = useState<string | null>(null);
  const [declineTestLoading, setDeclineTestLoading] = useState(false);

  const [disputeResult, setDisputeResult] = useState<string | null>(null);
  const [disputeLoading, setDisputeLoading] = useState(false);

  async function askAgent() {
    setLoadingIntent(true);
    setIntentVerify("idle");
    setCartEnvelope(null);
    setCartError(null);
    setTamperError(null);
    try {
      const res = await fetch("/api/agent/intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const data: SignedEnvelope<IntentMandate> = await res.json();
      setIntentEnvelope(data);
      setIntentVerify("checking");
      const ok = await verifyEnvelopeInBrowser(data);
      setIntentVerify(ok ? "valid" : "invalid");
    } finally {
      setLoadingIntent(false);
    }
  }

  async function buildCart() {
    if (!intentEnvelope) return;
    setLoadingCart(true);
    setCartError(null);
    setCartVerify("idle");
    setApprovalEnvelope(null);
    setApprovalError(null);
    try {
      const res = await fetch("/api/agent/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(intentEnvelope),
      });
      const data = await res.json();
      if (!res.ok) {
        setCartError(data.error ?? "unknown error");
        return;
      }
      setCartEnvelope(data);
      setCartVerify("checking");
      const ok = await verifyEnvelopeInBrowser(data);
      setCartVerify(ok ? "valid" : "invalid");
      if (ok && autoApprove) {
        await approveCart(data, "auto-approved-within-budget");
      }
    } finally {
      setLoadingCart(false);
    }
  }

  async function approveCart(
    cart: SignedEnvelope<CartMandate>,
    method: "human-click" | "auto-approved-within-budget"
  ) {
    if (!intentEnvelope) return;
    setLoadingApproval(true);
    setApprovalError(null);
    setApprovalVerify("idle");
    try {
      const res = await fetch("/api/agent/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intentEnvelope, cartEnvelope: cart, approvalMethod: method }),
      });
      const data = await res.json();
      if (!res.ok) {
        setApprovalError(data.error ?? "unknown error");
        return;
      }
      setApprovalEnvelope(data);
      setApprovalVerify("checking");
      const ok = await verifyEnvelopeInBrowser(data);
      setApprovalVerify(ok ? "valid" : "invalid");
    } finally {
      setLoadingApproval(false);
    }
  }

  async function payWithStripe() {
    if (!intentEnvelope || !cartEnvelope || !approvalEnvelope) return;
    setLoadingPayment(true);
    setPaymentError(null);
    setPaymentVerify("idle");
    try {
      const res = await fetch("/api/agent/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intentEnvelope, cartEnvelope, approvalEnvelope }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPaymentError(data.error ?? "unknown error");
        return;
      }
      setPaymentEnvelope(data);
      setPaymentVerify("checking");
      const ok = await verifyEnvelopeInBrowser(data);
      setPaymentVerify(ok ? "valid" : "invalid");
      await refreshOrder(data.payload.paymentIntentId);
    } finally {
      setLoadingPayment(false);
    }
  }

  async function refreshOrder(paymentIntentId: string) {
    setOrderLoading(true);
    try {
      const res = await fetch(`/api/orders/${paymentIntentId}`);
      if (res.ok) setOrder(await res.json());
    } finally {
      setOrderLoading(false);
    }
  }

  async function testInsufficientBudget() {
    setBudgetTestLoading(true);
    setBudgetTestResult(null);
    try {
      const intentRes = await fetch("/api/agent/intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "หาหนังสือ Go ราคาไม่เกิน 5 บาท" }),
      });
      const intentData = await intentRes.json();
      const cartRes = await fetch("/api/agent/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(intentData),
      });
      const cartData = await cartRes.json();
      setBudgetTestResult(
        cartRes.ok
          ? "⚠️ unexpected: merchant built a cart despite the ฿5 budget"
          : `merchant ปฏิเสธ: "${cartData.error}"`
      );
    } finally {
      setBudgetTestLoading(false);
    }
  }

  async function testExpiredMandate() {
    setExpiryTestLoading(true);
    setExpiryTestResult(null);
    try {
      const intentRes = await fetch("/api/agent/intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "หาหนังสือ Go ราคาไม่เกิน 500 บาท", ttlSeconds: 2 }),
      });
      const intentData = await intentRes.json();
      await new Promise((resolve) => setTimeout(resolve, 2500));
      const cartRes = await fetch("/api/agent/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(intentData),
      });
      const cartData = await cartRes.json();
      setExpiryTestResult(
        cartRes.ok
          ? "⚠️ unexpected: merchant built a cart from an expired intent"
          : `merchant ปฏิเสธ: "${cartData.error}"`
      );
    } finally {
      setExpiryTestLoading(false);
    }
  }

  async function testCardDecline() {
    if (!intentEnvelope || !cartEnvelope || !approvalEnvelope) return;
    setDeclineTestLoading(true);
    setDeclineTestResult(null);
    try {
      const res = await fetch("/api/agent/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intentEnvelope, cartEnvelope, approvalEnvelope, simulate: "decline" }),
      });
      const data = await res.json();
      setDeclineTestResult(
        res.ok ? "⚠️ unexpected: a declined test card still succeeded" : `Stripe ปฏิเสธ: "${data.error}"`
      );
    } finally {
      setDeclineTestLoading(false);
    }
  }

  async function simulateDispute() {
    if (!paymentEnvelope) return;
    setDisputeLoading(true);
    setDisputeResult(null);
    try {
      const res = await fetch("/api/dev/simulate-dispute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentIntentId: paymentEnvelope.payload.paymentIntentId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setDisputeResult(`จำลอง dispute ไม่สำเร็จ: ${data.error}`);
        return;
      }
      await refreshOrder(paymentEnvelope.payload.paymentIntentId);
      setDisputeResult("ส่ง charge.dispute.created (จำลอง, เซ็นจริง) แล้ว — ดูสถานะ order ด้านล่าง");
    } finally {
      setDisputeLoading(false);
    }
  }

  async function tamperPayTest() {
    if (!intentEnvelope || !cartEnvelope || !approvalEnvelope) return;
    setTamperPayLoading(true);
    setTamperPayError(null);
    try {
      const tamperedApproval = {
        ...approvalEnvelope,
        payload: { ...approvalEnvelope.payload, approvedTotalCents: approvalEnvelope.payload.approvedTotalCents - 1 },
      };
      const res = await fetch("/api/agent/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intentEnvelope, cartEnvelope, approvalEnvelope: tamperedApproval }),
      });
      const data = await res.json();
      setTamperPayError(
        res.ok
          ? "⚠️ payment went through with a tampered approval (this should not happen)"
          : `remote verifier (Go, separate process) rejected it: "${data.error}"`
      );
    } finally {
      setTamperPayLoading(false);
    }
  }

  async function tamperTest() {
    if (!intentEnvelope) return;
    setTamperLoading(true);
    setTamperError(null);
    try {
      const tampered = {
        ...intentEnvelope,
        payload: { ...intentEnvelope.payload, constraints: { ...intentEnvelope.payload.constraints, maxAmountCents: intentEnvelope.payload.constraints.maxAmountCents + 100000 } },
      };
      const res = await fetch("/api/agent/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tampered),
      });
      const data = await res.json();
      setTamperError(res.ok ? "⚠️ server accepted a tampered mandate (this should not happen)" : `merchant rejected it: "${data.error}"`);
    } finally {
      setTamperLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <header className="border-b border-black/10 dark:border-white/10 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-sm font-medium underline">
          ← Back to shop
        </Link>
        <h1 className="text-xl font-semibold">🤖 Shopping agent</h1>
      </header>
      <main className="max-w-2xl mx-auto px-6 py-10 flex flex-col gap-4">
        <label className="text-sm font-medium">บอก agent ว่าอยากได้หนังสืออะไร</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={2}
          className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 p-3 text-sm"
        />
        <button
          onClick={askAgent}
          disabled={loadingIntent || message.trim().length === 0}
          className="self-start rounded-full bg-black text-white dark:bg-white dark:text-black text-sm px-5 py-2 disabled:opacity-40"
        >
          {loadingIntent ? "Agent กำลังสร้าง mandate..." : "Ask agent"}
        </button>

        <div className="rounded-xl border border-dashed border-black/20 dark:border-white/20 p-4 flex flex-col gap-3 mt-4">
          <span className="text-xs font-semibold text-zinc-500">
            บทเรียนที่ 8 — ทดสอบสถานการณ์ล้มเหลว (สร้าง intent/cart ของตัวเอง ไม่กระทบ flow ด้านล่าง)
          </span>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={testInsufficientBudget}
              disabled={budgetTestLoading}
              className="rounded-full border border-orange-300 text-orange-600 text-xs px-4 py-2 disabled:opacity-40"
            >
              {budgetTestLoading ? "กำลังทดสอบ..." : "ทดสอบ: งบไม่พอ (฿5)"}
            </button>
            <button
              onClick={testExpiredMandate}
              disabled={expiryTestLoading}
              className="rounded-full border border-orange-300 text-orange-600 text-xs px-4 py-2 disabled:opacity-40"
            >
              {expiryTestLoading ? "กำลังทดสอบ (รอ 2.5 วิ)..." : "ทดสอบ: intent หมดอายุ (TTL 2 วิ)"}
            </button>
          </div>
          {budgetTestResult && <p className="text-xs text-orange-700 dark:text-orange-400">{budgetTestResult}</p>}
          {expiryTestResult && <p className="text-xs text-orange-700 dark:text-orange-400">{expiryTestResult}</p>}
        </div>

        {intentEnvelope && (
          <div className="mt-6 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="font-semibold">1. Intent Mandate</span>
              <VerifyBadge state={intentVerify} />
              <span className="text-xs text-zinc-400">signed by user agent</span>
            </div>
            <pre className="text-xs overflow-x-auto rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 p-4 max-h-56">
              {JSON.stringify(intentEnvelope, null, 2)}
            </pre>
            <p className="text-xs text-zinc-500">
              Budget: ฿{(intentEnvelope.payload.constraints.maxAmountCents / 100).toFixed(2)} · หมดอายุ{" "}
              {new Date(intentEnvelope.payload.expiresAt).toLocaleTimeString("th-TH")} · parsed by{" "}
              {intentEnvelope.payload.parsedBy}
            </p>

            <label className="flex items-center gap-2 text-xs text-zinc-500">
              <input type="checkbox" checked={autoApprove} onChange={(e) => setAutoApprove(e.target.checked)} />
              Auto-approve cart ถ้าอยู่ในงบของ intent (ข้ามขั้นตอนให้ human กดเอง)
            </label>

            <div className="flex items-center gap-3 mt-2">
              <button
                onClick={buildCart}
                disabled={loadingCart}
                className="self-start rounded-full bg-black text-white dark:bg-white dark:text-black text-sm px-5 py-2 disabled:opacity-40"
              >
                {loadingCart ? "Merchant กำลังจัด cart..." : "2. Build cart (merchant)"}
              </button>
              <button
                onClick={tamperTest}
                disabled={tamperLoading}
                className="self-start rounded-full border border-red-300 text-red-600 text-sm px-4 py-2 disabled:opacity-40"
              >
                {tamperLoading ? "กำลังทดสอบ..." : "ทดสอบ tamper intent"}
              </button>
            </div>

            {tamperError && <p className="text-xs text-red-600">{tamperError}</p>}
            {cartError && <p className="text-xs text-red-600">merchant ปฏิเสธ: {cartError}</p>}

            {cartEnvelope && (
              <div className="flex flex-col gap-3 mt-4">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">3. Cart Mandate</span>
                  <VerifyBadge state={cartVerify} />
                  <span className="text-xs text-zinc-400">signed by merchant (different key)</span>
                </div>
                <pre className="text-xs overflow-x-auto rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 p-4 max-h-56">
                  {JSON.stringify(cartEnvelope, null, 2)}
                </pre>
                <p className="text-xs text-zinc-500">
                  รวม ฿{(cartEnvelope.payload.totalCents / 100).toFixed(2)} · {cartEnvelope.payload.items.length} เล่ม ·
                  ผูกกับ intent {cartEnvelope.payload.intentMandateId.slice(0, 8)}…
                </p>

                {!autoApprove && !approvalEnvelope && (
                  <button
                    onClick={() => approveCart(cartEnvelope, "human-click")}
                    disabled={loadingApproval}
                    className="self-start rounded-full bg-green-600 text-white text-sm px-5 py-2 disabled:opacity-40"
                  >
                    {loadingApproval ? "กำลังขออนุมัติ..." : "4. Approve & authorize payment (human)"}
                  </button>
                )}

                {approvalError && <p className="text-xs text-red-600">ขออนุมัติไม่ผ่าน: {approvalError}</p>}

                {approvalEnvelope && (
                  <div className="flex flex-col gap-3 mt-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">5. Cart Approval</span>
                      <VerifyBadge state={approvalVerify} />
                      <span className="text-xs text-zinc-400">
                        signed by human approver ({approvalEnvelope.payload.approvalMethod})
                      </span>
                    </div>
                    <pre className="text-xs overflow-x-auto rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 p-4 max-h-56">
                      {JSON.stringify(approvalEnvelope, null, 2)}
                    </pre>

                    {!paymentEnvelope && (
                      <div className="flex items-center gap-3">
                        <button
                          onClick={payWithStripe}
                          disabled={loadingPayment}
                          className="self-start rounded-full bg-indigo-600 text-white text-sm px-5 py-2 disabled:opacity-40"
                        >
                          {loadingPayment ? "กำลังเรียก Stripe..." : "6. Pay with Stripe (test mode)"}
                        </button>
                        <button
                          onClick={tamperPayTest}
                          disabled={tamperPayLoading}
                          className="self-start rounded-full border border-red-300 text-red-600 text-sm px-4 py-2 disabled:opacity-40"
                        >
                          {tamperPayLoading ? "กำลังทดสอบ..." : "ทดสอบ tamper แล้วจ่ายเงิน"}
                        </button>
                        <button
                          onClick={testCardDecline}
                          disabled={declineTestLoading}
                          className="self-start rounded-full border border-orange-300 text-orange-600 text-sm px-4 py-2 disabled:opacity-40"
                        >
                          {declineTestLoading ? "กำลังทดสอบ..." : "ทดสอบ card declined"}
                        </button>
                      </div>
                    )}
                    {declineTestResult && (
                      <p className="text-xs text-orange-700 dark:text-orange-400">{declineTestResult}</p>
                    )}
                    <p className="text-xs text-zinc-400">
                      ก่อนจ่ายเงินทุกครั้ง /api/agent/pay จะยิงไปให้{" "}
                      <span className="font-medium">Go verifier service (คนละ process, คนละภาษา)</span> ยืนยัน
                      signature ทั้ง 3 ใบ ไม่เชื่อผลจาก Next.js เอง
                    </p>

                    {tamperPayError && <p className="text-xs text-red-600">{tamperPayError}</p>}

                    {paymentError && (
                      <p className="text-xs text-red-600">
                        settlement ไม่สำเร็จ: {paymentError}
                        {paymentError.includes("STRIPE_SECRET_KEY") && (
                          <>
                            {" "}
                            — ดูวิธีตั้งค่าใน{" "}
                            <code className="bg-red-50 dark:bg-red-950 px-1 rounded">.env.example</code>
                          </>
                        )}
                      </p>
                    )}

                    {paymentEnvelope && (
                      <div className="flex flex-col gap-3 mt-2">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">7. Payment Mandate</span>
                          <VerifyBadge state={paymentVerify} />
                          <span className="text-xs text-zinc-400">
                            signed by merchant · settled via Stripe · chain verified by Go service
                          </span>
                        </div>
                        <pre className="text-xs overflow-x-auto rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 p-4 max-h-56">
                          {JSON.stringify(paymentEnvelope, null, 2)}
                        </pre>
                        <p className="text-xs text-zinc-500">
                          Stripe PaymentIntent {paymentEnvelope.payload.paymentIntentId} · sync response said{" "}
                          <span className="font-medium">{paymentEnvelope.payload.paymentIntentStatus}</span>
                        </p>
                      </div>
                    )}

                    {order && (
                      <div className="flex flex-col gap-3 mt-4">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">8. Order status (reconciliation)</span>
                          <OrderStatusBadge status={order.status} />
                          <button
                            onClick={() => refreshOrder(order.paymentIntentId)}
                            disabled={orderLoading}
                            className="text-xs underline text-zinc-400 disabled:opacity-40"
                          >
                            {orderLoading ? "กำลังโหลด..." : "รีเฟรช"}
                          </button>
                        </div>
                        <p className="text-xs text-zinc-500">
                          ตัว sync response จาก Stripe บอกว่า &quot;{paymentEnvelope?.payload.paymentIntentStatus}
                          &quot; ทันที แต่ order จะยัง <code className="bg-zinc-100 dark:bg-zinc-800 px-1 rounded">pending_confirmation</code>{" "}
                          จนกว่า webhook จะมายืนยันอิสระอีกที (async, มาทีหลัง)
                        </p>
                        <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 p-4 text-xs flex flex-col gap-2">
                          {order.events.map((ev, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                  ev.source === "webhook"
                                    ? "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200"
                                    : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                                }`}
                              >
                                {ev.source}
                              </span>
                              <span className="text-zinc-500">{ev.type}</span>
                              <span className="text-zinc-400">{new Date(ev.receivedAt).toLocaleTimeString("th-TH")}</span>
                            </div>
                          ))}
                        </div>

                        {order.status === "succeeded" && (
                          <button
                            onClick={simulateDispute}
                            disabled={disputeLoading}
                            className="self-start rounded-full border border-purple-300 text-purple-600 text-xs px-4 py-2 disabled:opacity-40"
                          >
                            {disputeLoading ? "กำลังจำลอง..." : "จำลอง dispute (charge.dispute.created)"}
                          </button>
                        )}
                        {disputeResult && <p className="text-xs text-purple-700 dark:text-purple-400">{disputeResult}</p>}

                        {order.status === "disputed" && (
                          <div className="rounded-xl border border-purple-300 bg-purple-50 dark:bg-purple-950 p-4 text-xs flex flex-col gap-1">
                            <span className="font-semibold text-purple-800 dark:text-purple-200">
                              หลักฐาน AP2 mandate chain สำหรับ dispute
                            </span>
                            <span>Intent Mandate: {order.intentMandateId}</span>
                            <span>Cart Mandate: {order.cartMandateId}</span>
                            <span>Cart Approval: {order.cartApprovalId}</span>
                            <span>Stripe PaymentIntent: {order.paymentIntentId}</span>
                            <span className="text-purple-600 dark:text-purple-300 mt-1">
                              ทั้ง 4 ใบผูกกันด้วย id ตั้งแต่ user พิมพ์คำขอ จนเงินเข้าบัญชี — ใช้เป็นหลักฐานตอบ dispute ได้ทันที
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function OrderStatusBadge({ status }: { status: Order["status"] }) {
  const styles: Record<Order["status"], string> = {
    pending_confirmation: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    succeeded: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    failed: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    disputed: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  };
  const label = {
    pending_confirmation: "⏳ pending confirmation",
    succeeded: "✓ confirmed",
    failed: "✕ failed",
    disputed: "⚠️ disputed",
  }[status];
  return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${styles[status]}`}>{label}</span>;
}

function VerifyBadge({ state }: { state: VerifyState }) {
  if (state === "idle") return null;
  const styles: Record<Exclude<VerifyState, "idle">, string> = {
    checking: "bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200",
    valid: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    invalid: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  };
  const label = { checking: "verifying…", valid: "✓ signature valid", invalid: "✕ signature invalid" }[
    state as Exclude<VerifyState, "idle">
  ];
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${styles[state as Exclude<VerifyState, "idle">]}`}>
      {label}
    </span>
  );
}
