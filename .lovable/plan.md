

# Stripe Subscription Integration Plan

## What We're Building
A complete subscription billing system where tuition admins pay ₹1199/month with a 21-day free trial, supporting UPI and card payments via Stripe Checkout.

---

## Requirements Recap
- **Price**: ₹1199/month (INR)
- **Free trial**: 21 days (no card required upfront)
- **Payment methods**: UPI + Cards (Stripe India supports both)
- **Flow**: Super Admin creates tuition → tuition gets 21-day trial → after trial, tuition admin subscribes via Stripe

---

## Implementation Steps

### Step 1: Enable Stripe Integration
- Use the Lovable Stripe tooling to enable Stripe and collect the secret key
- Create a Stripe product ("Tutly Pro") with a ₹1199/month recurring price

### Step 2: Database Changes
- Add columns to `tuitions` table:
  - `stripe_customer_id` (text, nullable)
  - `stripe_subscription_id` (text, nullable)
  - `trial_ends_at` (timestamptz, nullable — set to `now() + 21 days` on creation)
- Update `subscription_status` to support values: `trial`, `active`, `past_due`, `expired`, `suspended`

### Step 3: Edge Function — `create-checkout-session`
- Creates a Stripe Checkout session in `subscription` mode
- Sets `trial_period_days: 21` if tuition is still in trial
- Enables UPI via `payment_method_types: ['card', 'upi']`
- Passes `tuition_id` as metadata
- Returns the checkout URL to redirect the tuition admin

### Step 4: Edge Function — `stripe-webhook`
- Handles Stripe webhook events:
  - `checkout.session.completed` → update `stripe_customer_id`, `stripe_subscription_id`, set status to `active`
  - `invoice.paid` → extend `subscription_end_date`, set status `active`
  - `invoice.payment_failed` → set status `past_due`
  - `customer.subscription.deleted` → set status `expired`
- Uses `verify_jwt = false` (Stripe sends the webhook, not a user)
- Validates webhook signature using Stripe signing secret

### Step 5: Subscription Management Page
- New `/subscription` route for tuition admins
- Shows current plan status (trial/active/expired), days remaining
- "Subscribe Now" / "Manage Billing" button
- For active subscribers: link to Stripe Customer Portal for invoice history, cancellation, payment method updates

### Step 6: Update Existing Components
- **`CreateTuitionDialog`**: Auto-set `trial_ends_at = now() + 21 days`, `subscription_status = 'trial'`
- **`SubscriptionExpiryAlert`**: Update to handle trial expiry ("Your free trial ends in X days")
- **`TuitionInactiveScreen`**: Add "Subscribe Now" CTA that triggers checkout
- **`ProtectedRoute`**: Already blocks expired/suspended — no changes needed

### Step 7: Super Admin Visibility
- Show Stripe subscription status and payment history in `TuitionDetailsDialog`
- Badge showing `trial` / `active` / `past_due` in `TuitionsList`

---

## Architecture Flow

```text
Tuition Created → trial (21 days)
         ↓
Trial Expiring → SubscriptionExpiryAlert shown
         ↓
Click "Subscribe" → Edge Function creates Checkout Session
         ↓
Stripe Checkout (Card/UPI) → Payment
         ↓
Stripe Webhook → Updates tuitions table (status=active, dates set)
         ↓
Monthly Invoice → Stripe auto-charges → Webhook confirms
         ↓
Payment Failed → status=past_due → Grace period → expired
```

---

## Prerequisites Before Implementation
1. **Stripe account** with India entity (for INR + UPI support)
2. **Stripe Secret Key** — will be collected via the Stripe enable tool
3. **Stripe Webhook Signing Secret** — needed after setting up the webhook endpoint

---

## What UPI on Stripe Requires
- Stripe India account (registered Indian business)
- UPI is automatically available for INR subscriptions via Stripe Checkout
- No additional configuration needed beyond enabling it in Stripe Dashboard payment methods

