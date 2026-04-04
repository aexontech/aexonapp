import { Router } from "express";

const router = Router();

const xenditSecret = process.env["XENDIT_SECRET_KEY"];

router.post("/xendit/create-invoice", async (req, res) => {
  try {
    if (!xenditSecret) {
      return res.status(500).json({ error: "Xendit not configured" });
    }

    const {
      orderId,
      amount,
      payerEmail,
      description,
      planName,
      billingCycle,
      userName,
      promoCode,
      promoDiscount,
      successRedirectUrl,
      failureRedirectUrl,
    } = req.body;

    if (!orderId || !amount || !payerEmail) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const payload: Record<string, any> = {
      external_id: orderId,
      amount,
      payer_email: payerEmail,
      description: description || `Langganan Aexon - ${planName} (${billingCycle})`,
      currency: "IDR",
      customer: {
        given_names: userName || payerEmail,
        email: payerEmail,
      },
      customer_notification_preference: {
        invoice_created: ["email", "whatsapp"],
        invoice_paid: ["email", "whatsapp"],
      },
      invoice_duration: 86400,
      metadata: {
        order_id: orderId,
        plan_name: planName,
        billing_cycle: billingCycle,
        promo_code: promoCode || null,
        promo_discount: promoDiscount || 0,
      },
    };

    if (successRedirectUrl) payload.success_redirect_url = successRedirectUrl;
    if (failureRedirectUrl) payload.failure_redirect_url = failureRedirectUrl;

    const xenditRes = await fetch("https://api.xendit.co/v2/invoices", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(xenditSecret + ":").toString("base64")}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await xenditRes.json();

    if (!xenditRes.ok) {
      console.error("Xendit API error:", data);
      return res.status(xenditRes.status).json({
        error: data?.message || "Failed to create invoice",
      });
    }

    return res.json({
      invoiceId: data.id,
      invoiceUrl: data.invoice_url,
      externalId: data.external_id,
      status: data.status,
    });
  } catch (err: any) {
    console.error("Xendit create invoice error:", err);
    return res.status(500).json({
      error: err?.message || "Failed to create invoice",
    });
  }
});

router.post("/xendit/webhook", async (req, res) => {
  try {
    const callbackToken = process.env["XENDIT_WEBHOOK_TOKEN"];
    const headerToken = req.headers["x-callback-token"];

    if (callbackToken && headerToken !== callbackToken) {
      return res.status(403).json({ error: "Invalid callback token" });
    }

    const { external_id, status, paid_amount, payment_method } = req.body;

    console.log(`Xendit webhook: ${external_id} → ${status} (${paid_amount})`);

    return res.json({ received: true });
  } catch (err: any) {
    console.error("Xendit webhook error:", err);
    return res.status(500).json({ error: "Webhook processing failed" });
  }
});

export default router;
