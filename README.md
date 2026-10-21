# Cake, Kitchenware & Decoration Shop

Monorepo scaffold that implements the v1.0 SRS planning baseline.

```
cake-shop/
  frontend/   Next.js (App Router) storefront + account + checkout. Uses TypeScript, Zustand, Axios and Tailwind v4.
  backend/    NestJS REST API (/api/v1). Uses Prisma 7, Supabase Postgres, a payment gateway abstraction and a Resend outbox.
```

## Quick start

```bash
# 1. API
cd backend
cp .env.example .env            # fill DATABASE_URL / DIRECT_URL / JWT secret
npm install
npx prisma migrate dev --name init
npm run seed                    # categories, products, delivery zones, admin user
npm run start:dev               # http://localhost:4000/api/v1/health

# 2. Storefront (new terminal)
cd frontend
cp .env.example .env.local
npm install
npm run dev                     # http://localhost:3000
```

By default `PAYMENT_PROVIDER=mock`. Checkout redirects you to a local "simulate payment" page.
That page drives the same verification path a real Hubtel callback will use.

## What is implemented

| Area | Status |
| --- | --- |
| Catalogue | Products, variants, nested categories, search/filter/sort and pagination. |
| Guest cart | Done. The cart lives in a versioned client store and is validated server-side. |
| Auth | Email + password (argon2id) with HTTP-only cookies. Refresh tokens rotate and are checked for reuse. Includes password reset. |
| Checkout | Authenticated quote and order creation. Pickup or delivery-zone fees, coupons and tax rate. |
| Order transaction | Runs serializable with retry. Stock is reserved atomically and the coupon cap is enforced atomically. Checkout requests are idempotent. |
| Payments | Gateway interface, mock gateway, idempotent callback handling and server-side verification. Includes amount checks, an expiry job and admin reconcile. |
| Notifications | Database outbox with a worker, backoff retries and dead-lettering. Uses Resend, falling back to console logging. |
| Admin API | Products, variants, stock, image uploads, categories, orders (state machine), delivery zones, tax rates, settings, coupons, staff roles, payments reconcile, failed notifications and audit logs. |
| Admin dashboard | `/admin`: overview, orders, products and stock, categories and returns, delivery fees, tax and settings, failed messages, staff. |
| Storefront pages | Home, shop, category, product, cart, login/register, checkout, result, account orders. |

## Deliberately left as TODO (phase 4–5 of the SRS)

- **`HubtelGateway`** (`backend/src/modules/payments/gateways/hubtel.gateway.ts`). Wire it to Hubtel's *current* official docs and your merchant account. Do not guess the callback signature scheme.
- **Automated WhatsApp messaging.** Only click-to-chat is implemented, which matches the SRS default.
- **Campaigns, giveaways, reviews and service requests.** These are modelled in the Prisma schema, but their modules and UI are not built yet.
- **Automated WhatsApp messages, bundles, flash sales, abandoned-cart reminders, loyalty.** These are optional later-phase items in the SRS.

## Images and email

### Images: Cloudinary, signed uploads

1. **Sign:** the browser asks the API for a signed ticket (`POST /admin/uploads/signature`, or `/service-requests/uploads/signature` for customers). The signature, made with your API secret on the server, fixes the folder, file name, delivery type and allowed formats (JPG, PNG, WebP).
2. **Upload:** the browser sends the file straight to Cloudinary. No image passes through the API.
3. **Confirm:** the API checks the upload with Cloudinary's Admin API (right folder, real image format, 5 MB or less) before saving it. Anything off-policy is deleted.

Where photos go, and who can see them:

| What | Folder | Who can see it |
| --- | --- | --- |
| Product, banner and category photos | `<CLOUDINARY_FOLDER>/catalogue/<year>/` | Public. Served resized and in the best format by Cloudinary (`next/image` loader and `cloudinaryUrl()`). |
| Customers' cake and event reference photos | `<CLOUDINARY_FOLDER>/requests/<customer id>/` | **Private** ("authenticated" type). Shown only through download links that expire after 1 hour, to the customer and staff. Deleted when the customer deletes their account. |

Setup:

1. Create a Cloudinary account.
2. Copy the cloud name, API key and API secret into `backend/.env` (`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`). Never put the secret in the frontend.
3. Production refuses to start without these values.

### Email: Resend

- **How it sends:** every email (receipts, order updates, quotes, password resets, owner alerts, contact messages, newsletter welcome) goes through one Resend sender. It sits behind the database outbox, so emails retry with backoff, and failures show in **Admin → Failed messages**.
- **Setup:** verify your sending domain in Resend, then set `RESEND_API_KEY`, `EMAIL_FROM` (an address on that domain) and optionally `EMAIL_REPLY_TO` (where customer replies go).
- **Production:** it refuses to start without Resend. In development, emails are printed to the API log instead.

## Storefront sections

The main shop, cake shop (`/cakes`) and decoration studio (`/decor`) are three looks over one store: one cart, one checkout, one account and sign-in, and one set of policy pages. See "One store, three looks" in `frontend/README.md` for where shared code lives.


- **Main landing page (`/`):** done, modelled on the store-style reference. See `frontend/README.md`.
- **Inner store pages:** done in the same style: listings with grid/list toolbar, special offers, brands A–Z, contact form with an admin inbox, site map, two-panel login, and account pages.
- **Cake section (`/cakes`):** done, modelled on the cake-shop reference.
- **Decoration studio (`/decor`):** home done, modelled on the flower-studio reference. Inner pages can follow. Each gets its own home and look, modelled on the cake-shop and flower-shop references.

Newsletter: signups need ticked consent. Each signup gets a welcome email with an unsubscribe link, and staff export the list at **Admin → Newsletter**.

## Custom cake and event requests

1. The customer sends a request with service, event date (at least `serviceLeadDays` ahead, default 3), guests, budget, venue and up to 5 reference photos. The photos are stored in a **private** bucket.
2. Staff send a quote: the total, the deposit (0 = none), a valid-until date and what's included. They can re-quote if the customer declines.
3. The customer accepts. The deposit becomes a normal order and is paid through the same verified Hubtel flow, using the same 10-minute window and receipt handling. Verified payment moves the request to **Booked** and emails both sides.
4. The balance is collected on pickup or delivery. Staff mark the request completed.

Edge cases:

- **Cancelled or re-quoted while paying.** If a request is cancelled or re-quoted while the customer is paying, a late deposit is flagged for a payment check rather than silently booking.
- **Cancelling a booked request.** Cancelling a booked request reminds staff to refund the deposit through Hubtel.

## Refunds, reviews, accounts (policies built in)

- **Refunds** (owner-confirmed)
  - Refunds are made against the verified payment, either partial or full. A full refund of an unfinished order cancels it.
  - Coupon uses are **not** returned on refund, so a one-time code can't be reused after a refund.
  - Refunds go through **Hubtel's refund API**. They may finish later (mobile money), so a pending refund is re-checked server-to-server:
    - every 5 minutes;
    - on Hubtel's refund callback (`/api/v1/payments/hubtel/refund-callback`), which is authenticated, deduplicated and only treated as a hint;
    - when staff press "Check with Hubtel now".
  - Refunds pending over a day are flagged on the admin overview.
  - **To switch on:** implement `refund`, `refundStatus` and `parseRefundCallback` in `HubtelGateway` from Hubtel's current docs, test in the sandbox, then set `HUBTEL_REFUNDS_ENABLED=true`. Until then the admin only offers "record a refund made outside the system".
  - The mock gateway supports API refunds for local testing.
- **Reviews** (owner-confirmed)
  - Every review is moderated, and only customers who bought the product can review (switch: Tax and settings → reviews).
  - Public names are shortened to "Ama M.".
  - Editing a review sends it back for approval.
- **Account deletion**
  - Deleting an account anonymises it.
  - Order records are kept without personal details, for tax.
  - Request photos are deleted from storage.
  - Deletion is blocked while an order or booking is in progress.
- **Data export**
  - Customers can download everything held about them as JSON.

## Business decisions (confirmed)

All of these are **owner-editable at runtime**. Nothing below needs a redeploy.

- **Market.** The store sells in Ghana and prices are in GHS (`CURRENCY=GHS`, timezone `Africa/Accra`).
- **Delivery.** Delivery is nationwide. Each of Ghana's 16 regions has its own fee and lead time, and specific towns can have a cheaper or dearer rate. The most specific match wins. The seeded fees are **placeholders**. Manage them at `/admin/delivery-zones`.
- **Tax.**
  - Tax lines (name, rate, whether delivery is taxed) live in the `TaxRate` table and are applied in order. They are shown on the checkout, the receipt email and the order page, and snapshotted on every order.
  - Shelf prices **exclude** tax (`pricesIncludeTax=false`), so tax is added at checkout.
  - Seeded tax lines are **inactive**. Confirm the current rates and structure with your accountant, then activate them.
- **Returns.** The window is counted in working days (Mon–Fri, skipping holidays you list), from when the order is completed.
  - Current policy is set per category: cakes and pastries **0** (not returnable), decoration and baking accessories **3**, kitchenware and cooking utensils **7**.
  - A product can override its category's window. Sub-categories inherit from their parent, and the store default (3) is the last fallback.
  - Edit category windows at `PATCH /api/v1/admin/categories/:id` with `{ "returnWindowDays": n }`. Send `null` to inherit.
  - Each order item snapshots its window, so policy changes don't affect past orders.
- **Payment window.** Stock is held for **10 minutes** while the customer pays (`paymentWindowMinutes`). The expiry job runs every 30 s.

Settings endpoints:

- `GET/PATCH /api/v1/admin/settings` covers `paymentWindowMinutes`, `returnWindowWorkingDays`, `pricesIncludeTax` and `publicHolidays`.
- `GET/POST/PATCH /api/v1/admin/tax-rates` manages tax lines.
- `GET /api/v1/settings` is the public subset the storefront reads.

## Other decisions (change if needed)

- **Cart.** The cart is client-side (Zustand + localStorage, versioned) and survives login. The server clamps quantities on every validation.
- **Failed payment.** The order moves to `PAYMENT_FAILED` and its stock and coupon are released. The customer can use "reorder".
- **Late payment.** A payment that succeeds after its order expired is recorded and flagged `needsReconciliation` for staff.
- **Cookies.** Cookies are SameSite=Lax. Deploy the API on a subdomain of the storefront and set `COOKIE_DOMAIN`.
- **Prisma.** It is pinned to `^7`. Verify that 7.10.0 exists, then pin it exactly.
