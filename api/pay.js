// api/pay.js — Stripe "Pay Any Amount" Rent Payment Link
// Serverless function — stateless, no DB, no secrets in code.
// Every GET request creates a fresh Checkout Session and redirects the tenant.

"use strict";

const Stripe = require("stripe");

// ---------------------------------------------------------------------------
// Config — all values come from environment variables. NEVER hardcode keys.
// ---------------------------------------------------------------------------
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});

const CURRENCY    = "usd";
const SUCCESS_URL = process.env.SUCCESS_URL  || "https://illion-rent-pay.vercel.app/success.html";
const CANCEL_URL  = process.env.CANCEL_URL   || "https://illion-rent-pay.vercel.app/pay";

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------
module.exports = async function handler(req, res) {
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",

      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: CURRENCY,
            product_data: {
              name: "Rent Payment",
            },
            // ↓ THIS is the "type any amount" box — only works with inline
            //   price_data in a Checkout Session (not on Payment Links or
            //   saved Prices).
            custom_unit_amount: {
              enabled: true,
              // Stripe enforces a minimum of ~$0.50; no max needed.
            },
          },
        },
      ],

      // Custom fields so the owner knows WHO paid on the shared link.
      // All 3 values appear on the payment record in the Stripe dashboard.
      custom_fields: [
        {
          key: "tenant_name",
          label: { type: "custom", custom: "Your full name" },
          type: "text",
        },
        {
          key: "flat_number",
          label: { type: "custom", custom: "Flat number" },
          type: "text",
        },
        {
          key: "property_address",
          label: { type: "custom", custom: "Property address" },
          type: "text",
        },
      ],

      success_url: SUCCESS_URL,
      cancel_url:  CANCEL_URL,
    });

    // 303 See Other — browser follows the redirect to Stripe's hosted page.
    res.writeHead(303, { Location: session.url });
    res.end();
  } catch (err) {
    // Log the real error server-side but never leak it to the tenant.
    console.error("[pay.js] Stripe session error:", err.message);
    res.writeHead(500, { "Content-Type": "text/plain" });
    res.end("Something went wrong creating the payment session. Please try again.");
  }
};
