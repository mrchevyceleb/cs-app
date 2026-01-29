# Studio Commerce Features

## Overview

R-Link's Studio includes a comprehensive suite of commerce tools that enable hosts to monetize live sessions directly within the video experience. Commerce features span real-time checkout flows, product showcases, live auctions, tipping, a full merchandise store, contract signing with third-party integrations, and lead capture forms. All commerce features are rendered as stage elements or modal overlays within the Studio interface, allowing seamless integration into any Meeting, Webinar, or Live Stream session.

---

## Checkout

### How Checkout Works

The checkout system provides a real-time purchasing flow embedded directly into the Studio session. When a host triggers a checkout, attendees see a checkout modal overlaid on their Studio view.

**Core Components:**
- **CheckoutModal** -- The host-facing modal for configuring and launching a checkout.
- **CheckoutRenderer** -- The attendee-facing renderer that displays the checkout experience on the stage.
- **activeCheckout** -- The state object tracking the currently active checkout session.
- **purchaseNotifications** -- A queue of notifications displayed when purchases are completed.
- **PurchaseNotification** -- The UI component rendering individual purchase alerts to the host and/or attendees.

### Step-by-Step: Running a Checkout

1. The host opens the Checkout tool from the Studio toolbar or commerce menu.
2. The **CheckoutModal** appears, allowing the host to configure the product, pricing, and checkout parameters.
3. The host launches the checkout, which sets the **activeCheckout** state.
4. Attendees see the **CheckoutRenderer** on the Studio stage, presenting the purchase option.
5. When an attendee completes a purchase, a **PurchaseNotification** fires and is added to the **purchaseNotifications** queue.
6. The host sees real-time purchase notifications as they come in.
7. The host can close the checkout at any time, clearing the **activeCheckout** state.

### Purchase Notifications

Purchase notifications appear in real time as attendees complete transactions. They are queued in the **purchaseNotifications** array and rendered by the **PurchaseNotification** component. These notifications provide social proof during live sessions and can be visible to all participants.

---

## Product Showcase

### How Product Showcase Works

The Product Showcase feature allows hosts to highlight a specific product on the Studio stage for all attendees to see. This is typically used to draw attention to a featured item before or during a checkout flow.

**Core Components:**
- **ProductShowcaseModal** -- The host-facing modal for selecting and configuring a product to showcase.
- **ProductShowcaseRenderer** -- The stage renderer that displays the showcased product to all participants.
- **activeProductShowcase** -- The state object tracking the currently showcased product.

### Step-by-Step: Running a Product Showcase

1. The host opens the Product Showcase tool from the Studio toolbar.
2. The **ProductShowcaseModal** appears with product selection and configuration options.
3. The host selects a product and activates the showcase, which sets the **activeProductShowcase** state.
4. All attendees see the **ProductShowcaseRenderer** on the Studio stage, displaying the product details.
5. The host can dismiss the showcase at any time, clearing the **activeProductShowcase** state.

---

## Auctions

### How Auctions Work

The auction system provides a full live auction experience within Studio sessions. Auctions follow a defined lifecycle and support real-time bidding, automatic time extensions, and detailed session tracking.

**Core Components:**
- **AuctionModal** -- The host-facing modal for creating and managing auctions.
- **AuctionRenderer** -- The stage renderer displaying the auction to all participants.
- **activeAuction** -- The state object tracking the currently active auction.

### AuctionSession Entity

Each auction is represented by an **AuctionSession** entity with the following fields:

| Field | Type | Description |
|-------|------|-------------|
| `auction_id` | string | Unique identifier for the auction session |
| `element_id` | string | The Studio element ID associated with this auction |
| `room_id` | string | The room/session ID where the auction is running |
| `host_id` | string | The user ID of the host running the auction |
| `status` | enum | Current lifecycle state: `scheduled`, `active`, `paused`, or `ended` |
| `current_price` | number | The current highest bid price |
| `total_bids` | number | Total number of bids placed in this auction |
| `unique_bidders` | number | Count of distinct users who have placed bids |
| `time_extensions` | number | Number of time extensions that have occurred |

### Auction Lifecycle

Auctions progress through a defined set of statuses:

1. **Scheduled** -- The auction has been created but has not started yet. The host can configure item details, starting price, and duration.
2. **Active** -- The auction is live. Attendees can place bids. The **current_price** updates in real time as bids come in.
3. **Paused** -- The host has temporarily paused bidding. No new bids are accepted. The host can resume the auction to return it to the **active** state.
4. **Ended** -- The auction has concluded. The final **current_price** represents the winning bid. The host can view **total_bids** and **unique_bidders** statistics.

### Time Extensions

When a bid is placed near the end of an auction, the system may automatically extend the auction timer to prevent last-second sniping. The **time_extensions** field tracks how many extensions have occurred during the session.

### Step-by-Step: Running an Auction

1. The host opens the Auction tool from the Studio toolbar.
2. The **AuctionModal** appears for configuring the auction item, starting price, and duration.
3. The host schedules or immediately starts the auction, creating an **AuctionSession** entity.
4. When the auction is **active**, the **AuctionRenderer** displays on the Studio stage showing the item, current price, bid count, and timer.
5. Attendees place bids, which update `current_price`, `total_bids`, and `unique_bidders` in real time.
6. The host can **pause** the auction at any time, halting bids.
7. The host can **resume** a paused auction to return it to the **active** state.
8. When the timer expires (including any time extensions), the auction status changes to **ended**.
9. The host reviews final auction statistics.

---

## Tipping

### How Tipping Works

The tipping feature allows attendees to send monetary tips to the host during a live session. The **TippingWidget** is toggled by the **showTippingWidget** state and provides a streamlined interface for sending tips.

### Step-by-Step: Sending a Tip

1. The host enables tipping for the session (if not enabled by default).
2. Attendees see the tipping option in the Studio interface.
3. Clicking the tip button opens the **TippingWidget**.
4. The attendee selects a tip amount and confirms.
5. The tip is processed and the host receives a notification.

---

## Merchandise Store

### How the Merch Store Works

The merchandise store is a full e-commerce experience embedded within Studio sessions. Hosts can configure products in advance and display them to attendees during live sessions. The store supports both physical and digital products.

**Core Components:**
- **MerchStoreWidget** -- The main merchandise store interface visible to attendees.
- **MerchFloatingOverlay** -- A floating overlay that can display merch product highlights during the session without blocking the main stage content.
- **MerchProductEditor** -- The host-facing editor for creating and managing merchandise products.

### Product Data Structure

Each merchandise product has the following structure:

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique product identifier |
| `name` | string | Product display name |
| `price` | number | Product price in USD |
| `image` | string | URL to the product image |
| `description` | string | Product description text |
| `stock` | number | Available inventory count |
| `type` | enum | Product type: `physical` or `digital` |

### Default Product Catalog

R-Link includes default sample products that hosts can customize or replace:

| Product | Type | Price | Stock |
|---------|------|-------|-------|
| T-shirt | Physical | $29.99 | 50 |
| VIP Pass | Digital | $99.99 | 20 |
| Digital Collectible | Digital | $49.99 | 100 |

### Physical vs. Digital Products

- **Physical products** (e.g., T-shirts) require shipping information at checkout. Stock is tracked and decremented on purchase.
- **Digital products** (e.g., VIP Pass, Digital Collectible) are delivered electronically. No shipping information is required. Stock is tracked and decremented on purchase.

### Step-by-Step: Setting Up Merchandise

1. The host opens the **MerchProductEditor** from the Studio settings or commerce menu.
2. The host creates products by entering name, price, description, image, stock count, and product type.
3. During a live session, the **MerchStoreWidget** displays the product catalog to attendees.
4. The **MerchFloatingOverlay** can highlight specific products on screen.
5. Attendees browse products, add items to cart, and complete purchases.
6. Stock levels update in real time as purchases are made.

---

## Contracts

### How Contracts Work

The contract feature allows hosts to present documents for review and signing within the Studio session. Contracts integrate with third-party signing platforms for legally binding electronic signatures.

**Core Components:**
- **ContractModal** -- The host-facing modal for uploading and configuring contracts.
- **ContractRenderer** -- The stage renderer displaying the contract to participants.
- **ContractStageRenderer** -- An alternative renderer for displaying contracts directly on the Studio stage.

### Contract Entity Fields

| Field | Type | Description |
|-------|------|-------------|
| `file_url` | string | URL to the contract document file |
| `display_mode` | string | How the contract is displayed (default: `modal`) |
| `name` | string | Display name for the contract |
| `mode` | string | Contract operating mode |
| `content` | string | Contract content (if inline) |
| `file_name` | string | Original file name of the uploaded document |

### Third-Party Integrations

Contracts support integration with the following services:

**DocuSign:**
- `enabled` -- Boolean toggle to enable/disable DocuSign integration.
- `auto_sync` -- When enabled, automatically syncs contract status and signatures with DocuSign.

**GoHighLevel:**
- `enabled` -- Boolean toggle to enable/disable GoHighLevel integration.
- `auto_sync` -- When enabled, automatically syncs contract data with GoHighLevel CRM.

### Step-by-Step: Using Contracts in a Session

1. The host opens the Contract tool from the Studio toolbar.
2. The **ContractModal** appears for uploading a document (via `file_url`) or entering inline content.
3. The host configures the contract name, display mode, and integration settings (DocuSign and/or GoHighLevel).
4. The host presents the contract, which renders via **ContractRenderer** or **ContractStageRenderer**.
5. Participants review and sign the contract.
6. If DocuSign or GoHighLevel integrations are enabled with `auto_sync`, signed contract data is automatically synced to the respective platforms.

---

## Lead Capture

### How Lead Capture Works

The lead capture feature allows hosts to collect contact information and other data from attendees during a live session. This is commonly used in webinar and live stream contexts to capture leads for follow-up.

**Core Components:**
- **LeadCaptureModal** -- The host-facing modal for creating and configuring lead capture forms.
- **LeadCaptureRenderer** -- The stage renderer displaying the lead capture form to attendees.
- **activeLeadCapture** -- The state object tracking the currently active lead capture form.

### Step-by-Step: Running Lead Capture

1. The host opens the Lead Capture tool from the Studio toolbar.
2. The **LeadCaptureModal** appears for configuring form fields and appearance.
3. The host activates the form, which sets the **activeLeadCapture** state.
4. Attendees see the **LeadCaptureRenderer** on the Studio stage presenting the form.
5. Attendees fill out and submit the form.
6. Collected data is stored and available for the host to export or integrate with CRM tools.
7. The host can close the lead capture form at any time, clearing the **activeLeadCapture** state.

---

## Settings and Options

| Setting | Scope | Description |
|---------|-------|-------------|
| Checkout configuration | Per-session | Product, price, and checkout flow settings |
| Product showcase | Per-session | Which product is currently being showcased |
| Auction parameters | Per-session | Starting price, duration, item details |
| Tipping toggle | Per-session | Enable/disable tipping widget |
| Merch catalog | Per-room | Product catalog persists across sessions |
| Contract integrations | Per-account | DocuSign and GoHighLevel integration settings |
| Lead capture forms | Per-session | Form configuration and field definitions |

---

## Troubleshooting

### Checkout not appearing for attendees
- Verify the **activeCheckout** state is set (host must have successfully launched the checkout).
- Check that the attendee has not already completed the purchase.
- Ensure the session is active and not in a disconnected state.

### Purchase notifications not showing
- Confirm the **purchaseNotifications** queue is being populated (check for successful purchase completion).
- Ensure the notification component is not hidden by other UI elements.

### Auction bids not registering
- Verify the auction status is **active** (not **paused** or **ended**).
- Check the attendee's connection status.
- Ensure the bid amount is higher than the **current_price**.

### Merch store not displaying products
- Verify products have been created in the **MerchProductEditor** with valid data (name, price, stock > 0).
- Check that the **MerchStoreWidget** is enabled for the session.

### Contract signing issues
- Verify the **file_url** is accessible and points to a valid document.
- If using DocuSign integration, confirm that `docusign.enabled` is `true` and credentials are properly configured.
- Check that the document has not already been signed by the participant.

### Lead capture form not appearing
- Verify the **activeLeadCapture** state is set.
- Ensure the form has at least one field configured.

---

## FAQ

**Q: Can I run multiple commerce features simultaneously?**
A: Yes, you can have a product showcase, tipping, and merch store active at the same time. However, only one checkout, one auction, and one lead capture form can be active at a time.

**Q: Do auction time extensions happen automatically?**
A: Yes, when a bid is placed near the end of the auction timer, the system automatically extends the timer. The number of extensions is tracked in the **time_extensions** field.

**Q: Can I sell both physical and digital products in the same merch store?**
A: Yes, the merch store supports mixed catalogs with both physical and digital products. Each product has a `type` field that determines the checkout flow (physical products require shipping info; digital products do not).

**Q: How do I integrate contracts with DocuSign?**
A: In the contract configuration, enable the DocuSign integration and optionally turn on `auto_sync`. This requires your DocuSign account credentials to be configured in your account settings.

**Q: Are purchase notifications visible to all attendees?**
A: Purchase notifications can be configured to display publicly to all attendees (providing social proof) or only to the host.

**Q: Can I edit merchandise products during a live session?**
A: Yes, the **MerchProductEditor** can be accessed during a live session. Changes to stock levels and product details take effect immediately.

---

## Known Limitations

- Only one checkout session can be active at a time per room.
- Only one auction can be active at a time per room.
- Only one lead capture form can be active at a time per room.
- Contract `display_mode` currently defaults to `modal`; other display modes may be added in the future.
- GoHighLevel integration requires a GoHighLevel account with API access.
- DocuSign integration requires a DocuSign account with API access.
- Merchandise product images must be hosted at accessible URLs; direct file upload for images may have size limits.
- The default product catalog is illustrative; hosts should replace default products with their own before going live.

---

## Plan Requirements

| Feature | Basic Plan | Business Plan |
|---------|-----------|---------------|
| Checkout | Available | Available |
| Product Showcase | Available | Available |
| Auctions | Available | Available |
| Tipping | Available | Available |
| Merchandise Store | Available | Available |
| Contracts | Available | Available |
| Lead Capture | Available | Available |

Commerce features are available across both plans. Advanced integration features (DocuSign, GoHighLevel) may require additional third-party subscriptions.

---

## Related Documents

- [01 - Platform Overview](01-platform-overview.md) -- General platform capabilities and session modes.
- [18 - Studio Collaboration](18-studio-collaboration.md) -- Collaboration features that complement commerce workflows.
- [19 - Studio Reactions & Engagement](19-studio-reactions-engagement.md) -- Engagement tools that drive commerce activity.
