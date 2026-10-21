# Frontend (Next.js storefront)

```
src/
  app/                      App Router routes (SRS 5.2)
  components/
    layout/                 Header, Footer, AnnouncementBar, CartLink
    product/                ProductCard, ProductGrid, PriceDisplay, StockBadge, AddToCart, ShopFilters, Pagination
    cart/                   CartView, CartLineItem, QuantityStepper
    checkout/               CheckoutView, FulfilmentSelector, AddressFields, OrderSummary
    support/                WhatsAppButton, EmptyState, ErrorState, Skeleton
  lib/
    api/client.ts           The single Axios instance (credentials, timeout, refresh-once, error mapping)
    api/server.ts           fetch() helper for Server Components (ISR-friendly catalogue reads)
    api/*.ts                Typed endpoint functions by feature
  stores/                   Zustand: cart (persisted, versioned) and session
  hooks/                    useHydrated, useRequireSession
```

## Main landing page (`/`)

Layout follows the store-style reference: a utility bar, a burgundy masthead with search and cart total, and a menu bar. Below that, two columns.

- **Left column:**
  - Category menu with icons and expandable sub-categories.
  - Hot deals (one sale item at a time).
  - Best sellers (from real paid orders).
  - New in.
  - Newsletter signup (with consent).
  - A real approved review.
  - A tall promo.
- **Main column:**
  - Hero slider.
  - Two promos.
  - "Shop by category" tabs.
  - Featured carousel.
  - Wide banner.
  - Specials (sale items).
  - Offers and giveaways (or custom-cake services when none are running).
  - New arrivals.
- **Bottom:** a "why shop with us" strip and the dark four-column footer.

On phones the category menu becomes a row of chips and the left column moves below the main content.

Every image slot is managed in **Admin → Banners**:

| Placement | Slot |
| --- | --- |
| `home.hero` | Slider, up to 5 |
| `home.promo` | Two under the slider |
| `home.feature` | Wide mid-page |
| `home.sidebar` | Tall, left column |

Until banners are uploaded, each slot shows a text design in brand colours, so the page never looks broken. Product cards across the site use the new style: framed image, hover buttons for add to cart and save, sale badge, and stars in caramel.

## Inner pages (same reference)

Menu tabs: Home · You imagine, We create · Special offers · Custom cakes · Brands · Contact · Site map. The three departments are matched to your categories by slug, so they always lead the menu.

| Page | What it has |
| --- | --- |
| `/shop`, `/categories/…`, `/specials`, `/shop?brand=…` | Left column: categories, price filter, hot deals. Breadcrumb bar. Toolbar: list/grid, in stock only, sort, show 12/24/48. "Showing 1 to 12 of 40 (4 pages)" |
| `/brands` | A–Z brand index (kitchenware and decoration makers) linking to filtered listings |
| `/contact` | Our location (address, phone and WhatsApp, opening times). Enquiry form with topic and order number, sent to Admin → Messages and emailed to the owner |
| `/sitemap` | Every category and page. `/sitemap.xml` is generated for Google (set `NEXT_PUBLIC_SITE_URL`) |
| `/login`, `/register` | "New customer" and "Returning customer" side by side, plus a full register page |
| `/account/*` | Breadcrumb bar, side menu (order history, requests, wish list, address book, my details) and plain "is empty / Continue" states |

The reference's "Product compare" was left out. It suits electronics specs more than cakes and kitchenware; say if you want it.

## Product page, cart and related products

- **Product page:**
  - The left column shows categories and Hot deals, with a breadcrumb bar above.
  - The main area has a gallery with thumbnails and a details table (brand, category, product code, availability, returns), then price and was-price.
  - "Available options" lists each option's price difference. Then come quantity, Add to cart, wish list, and a success message.
  - Below that: a pickup-only notice where it applies, stars with "N reviews / Write a review", and share buttons (WhatsApp, Facebook, X, copy link).
  - At the bottom are tabs: **Description** (paragraphs; `- ` lines become bullets) · **Specification** (grouped table from Admin → product → Specification) · **Reviews (n)**.
- **Mini-cart:** the header cart opens a dropdown (also briefly after adding): items, remove, sub-total, View cart and Checkout.
- **Cart:**
  - Items table, then "What would you like to do next?": use coupon code · estimate delivery and tax by region and town · pick up for free.
  - A totals table (sub-total, coupon, delivery, each tax line, total) comes from `POST /cart/estimate`, the same pricing as checkout. Checkout carries over the coupon and region.
- **Related products** (centred cards carousel) appear on the product page, cart, wish list and order confirmation, never the landing page. They're based on the same categories, topped up with best sellers.

## Cake section (`/cakes`)

The cake section has its own look, modelled on the cake-shop reference, with its own header and footer. Product, cart, checkout and account pages stay in the main shop.

- **Header:** a rose ribbon menu with notched ends and stitching, a scalloped badge logo, and account, search (within cakes), mini-cart and phone menu.
- **Page sections, top to bottom:**
  - The hero slider uses banners at `cakes.hero`, or soft text slides. It has a scalloped edge.
  - A rose band with three scalloped icon rings (your first three cake sub-categories, else Cupcakes, Wedding cakes, Party cakes).
  - **Most popular creations:** sub-category photo cards.
  - **Best deals:** on-sale cakes, two large and three small, with Sale and "Save 40%" badges.
  - **Find your cake:** a scalloped icon tab per sub-category, one cake at a time with prev/next.
  - **Popular flavours:** pastel tiles with round photos.
  - **Fresh from the oven:** a framed grid.
  - A newsletter band with consent.
  - A cocoa footer with occasion tags (prefilling a custom-cake request), opening hours, contact and optional social links (`NEXT_PUBLIC_INSTAGRAM_URL`, …).
- **Look:**
  - Accent tokens `rose`, `blush`, `butter`, `pistachio`, `peach` and `sky`, with Caveat script headings.
  - Scallops, stars and zig-zags are SVG shapes in solid colours.
- **Inner pages** (same look; the sky-blue title band with breadcrumb and scalloped edge):

  | Page | What it has |
  | --- | --- |
  | `/cakes/shop` | Sidebar with Category (sub-categories, + to expand), Availability (in stock / sold out with counts, Clear/Apply), Price (highest price, from/to, Clear/Apply), Clear all and a "Customer favourites" mini-carousel. Grid/list toolbar, "Show 9/18/36", Sort by, and numbered pagination (current page in blue) |
  | `/cakes/contact` | Phone (call and WhatsApp), Email and Address cards; contact form (name, email, phone, topic, message) into Admin → Messages |
  | `/cakes/cart` | Product cards with × remove and −/+ quantity. Order summary: subtotal, "Add a note to your order" (carried into checkout notes), Proceed to checkout, Get delivery estimate (region and town) |
  | `/cakes/checkout` | Distraction-free page with only the store name and cart icon, no site menu. Same secure checkout (sign-in, server quote, verified payment) in rose, plus an unticked "Email me with news and offers" |

- **Menu drawer:** "Menu" opens a slide-out panel: Home, **Shop ›** (each cake sub-category with a few of its cakes), **Popular cakes ›** (photo tiles with name and price), Flavours, Custom cakes, Contact, Main shop.
- **Content:** everything comes from the cake category (the slug containing "cake" or "pastr") and its sub-categories. Give sub-categories a description and image in Admin → Categories for the best result.

## Decoration studio (`/decor`)

The decoration studio is modelled on the flower-studio reference, with its own calm, elegant chrome. Product, cart and checkout pages stay in the main shop.

- **Header:** white, with your name as a script wordmark and an "EST." line (`NEXT_PUBLIC_ESTABLISHED`), condensed uppercase menu with an underline on the current item, cart count and search (within decoration).
- **Page sections, top to bottom:**
  - Hero photo (banner `decor.hero`, else your category or product photo) with "crafting celebrations since…", a two-line serif headline and an outlined offset-shadow button.
  - Blush intro: kicker, large italic headline, text, "What we do" (event styling request).
  - "When words are not enough": a tall and a shorter photo.
  - **Our seasonal bestsellers:** featured decoration, with outlined SALE tag, taupe stars, category, condensed name and italic price. "Add to cart" appears on hover.
  - Blush story band (banner `decor.feature`).
  - **Our collections:** decoration sub-categories, three across, with square arrow buttons.
  - "Inspired by…" with a follow-us hashtag (`NEXT_PUBLIC_HASHTAG`).
  - Blush footer: wordmark, newsletter with consent, social links, legal line.
- **Product page (`/decor/products/[slug]`):** decoration product links open here. Products from other categories redirect to the main product page.
  - Italic title band with a "Home : Category : Product" breadcrumb.
  - Photo with an outlined SALE tag and thumbnails.
  - Outline stars, italic price (with was-price) and the opening paragraph.
  - Option picker, quantity, outlined offset-shadow ADD TO CART and wish list, then category, brand, product code and returns.
  - Right sidebar: product search, product categories, popular products (round photos), Your cart.
  - DESCRIPTION / ADDITIONAL INFORMATION / REVIEWS (n) tabs, with › bullets. Then "You may also like".
- **Shop (`/decor/shop`):**
  - Italic "Shop" title band with breadcrumb.
  - Sorting dropdown and "Showing 1–9 of 16 results".
  - Three-across decoration cards (SALE tag, outline stars, category, condensed name, italic price) and square page buttons.
  - `?category=` limits it to a decoration sub-category. Header Shop, studio search, collections and breadcrumbs all lead here.
- **Studio sidebar** (shared by shop and product pages):
  - Product search and product categories.
  - **Filter by price:** a two-handle slider bounded by your cheapest and dearest decoration, plus a Filter button.
  - Popular products.
  - **Your cart:** round photos, × remove, subtotal, outlined View cart / Checkout.
  - **Recently viewed products:** kept only in the visitor's browser.
- **Look:** tokens `petal`, `petal-deep` and `taupe`. Fonts are Cormorant Garamond (italic headings), Oswald (condensed labels) and Great Vibes (wordmark). Solid colours only.

## One store, three looks (shared building blocks)

The main shop, cake shop and decoration studio share one cart, one checkout, one account area and one set of policies. Only the presentation differs. Shared code lives in one place:

| Concern | Single source | Used by |
| --- | --- | --- |
| Sign-in, register, password reset, account | `app/(shop)/login`, `/register`, `/forgot-password`, `/reset-password`, `/account/*`; links built by `loginHref()` in `lib/site-links.ts` | All sections, admin, checkout gate (`useRequireSession`) |
| Policies (delivery, returns, privacy, terms) | One page each in `app/(shop)`; links from `POLICY_LINKS` via `<PolicyLinks>` | Main, cake and studio footers, cake checkout, register |
| Departments (which category is cakes / decoration / kitchenware) | `lib/departments.ts` | Header menu, landing pages, cake and studio pages, site map, icons |
| Add to cart, wish list (with sign-in redirect) | `hooks/use-shop-actions.ts` | Product cards and buy boxes in all three sections |
| Cart validation, delivery zones, cart estimate | `hooks/use-cart-data.ts` | `/cart` and `/cakes/cart` |
| Checkout | `components/checkout/CheckoutView.tsx` | `/checkout` and `/cakes/checkout` (restyled) |
| Newsletter signup, contact form | `hooks/use-forms.ts` (`useNewsletter`, `subscribeToNewsletter`, `useContactForm`, `CONTACT_TOPICS`) | Home sidebar, cake band, studio footer, checkout opt-in; `/contact` and `/cakes/contact` |
| Star ratings | `components/product/Stars.tsx` (`variant="filled"` or `"outline"`) | All sections |
| Hero sliders | `hooks/use-slider.ts` | Main and cake heroes |
| Pagination numbers, WhatsApp links to customers | `pageWindow()`, `whatsAppTo()` in `lib/format.ts` | All pagers; admin orders, requests, messages |
| Product loading | `lib/api/products-server.ts` | `/products/[slug]` and `/decor/products/[slug]` |
| Backend phone and money rules | `backend/src/common/validation.ts` | Every DTO |

When adding a feature, put the logic in one of these places and give each section only its own markup.

## Rules this code follows

- **Display-only prices.** Prices in the cart are for display. Every total shown at checkout comes from `POST /checkout/quote`.
- **Server-owned payment state.** Payment and order state are never kept in the browser. `/checkout/result` asks the API.
- **Cart lifetime.** The cart is cleared only after the API reports `PAID`. A failed payment leaves the cart intact.
- **Idempotent orders.** Each order submission sends a `checkoutKey`, so double-clicks and retries cannot create two orders.
- **Design tokens.** Tokens live in `src/app/globals.css` (`@theme`). The look uses no gradients and no emoji UI.

## Admin dashboard (`/admin`)

Sign in with the seeded admin account (`SEED_ADMIN_EMAIL`). Staff are taken to `/admin` after signing in.

| Page | Who | What |
| --- | --- | --- |
| Overview | Admin, orders staff | Today's sales, plus a "needs attention" list (payment checks, orders to prepare, low stock, failed emails) |
| Cake and event requests | Admin, orders staff | Queue sorted by event date. Send or re-send quotes (total, deposit, validity, what's included). Reject, cancel, complete. Staff notes. Customer photos via short-lived private links |
| Coupons | Admin, marketing | Percent or fixed, cap, minimum spend, date window (Ghana time), total and per-customer limits, first order only, category restriction, usage count and live/scheduled/ended status |
| Reviews | Admin, marketing | Approve or reject reviews; shows whether the writer is a verified buyer |
| Banners and ad spots | Admin, marketing | Image banners in 4 spots (home feature, home strip, category top, product page) with desktop/phone images, schedule, priority, "Sponsored" label and click counts |
| Campaign pages | Admin, marketing | Landing pages at `/promotions/…` with headline, text, image, hand-picked products and a coupon code. Staff can preview drafts |
| Giveaways | Admin, marketing | Rules template, entry window, entries per customer, a fair random draw after close (audited) with winner email, admin-only redraw. Entries are deleted 90 days after the draw |
| Reports | Admin | Any date range: sales, average order, discounts, delivery, tax collected, deposits, refunds, net. Daily chart, best sellers, categories, coupon performance, banner clicks. CSV download |
| Activity log | Admin | Every audited change, filterable, with before/after |
| Services | Admin | Edit what customers can request quotes for |
| Orders | Admin, orders staff | Filters and order detail. One-click status steps that email the customer. Payment check with the provider. WhatsApp the customer |
| Products and stock | Admin | Create and edit products. Photo upload to Cloudinary (signed). Options and per-option prices. Recorded stock adjustments. Per-product returns override |
| Categories and returns | Admin | Category tree, returns period per category (inherited when empty), visibility |
| Delivery fees | Admin | Region-wide and town-specific rates, minimum order, free-delivery threshold, delivery time. Warns about regions with no rate |
| Tax and settings | Admin | Tax lines (%, applies to delivery, active). Payment window. Default returns period. Public holidays |
| Failed messages | Admin | Emails that failed after retries, with a retry button |
| Staff | Admin | Grant or remove the Orders staff and Admin roles by email |

Photo uploads use Cloudinary signed uploads. Set the `CLOUDINARY_*` values in `backend/.env`; see "Images and email" in the root README.

Layouts: storefront pages live in `src/app/(shop)/` (with header and footer); the dashboard has its own layout in `src/app/admin/`.

Order page (admin) also has **Refunds**: full or partial, optional restock, "through the provider" (when supported) or "already refunded, record it". The customer is emailed. Double-submits are blocked.

Customer account: orders, cake and event requests, saved for later (wishlist), addresses (used at checkout), your details (name, phone, password), download my data, delete account.

Customer side: `/services` (what you make plus how booking works), `/services/request` (request form with private photo upload), and `/account/requests` (see quotes, accept and pay the deposit, decline or cancel).

Storefront marketing: banners appear automatically in their spots when live; `/promotions` and `/giveaways` list what's running. Product pages show ratings, reviews and a "Save for later" button.
