# 17 - Studio Commerce Features

## Overview

R-Link Studio provides a comprehensive suite of commerce features that enable hosts to monetize their live sessions. This includes direct product checkout, product showcases, live auctions, tipping, a built-in merchandise store, contract management with e-signature integration, and lead capture. All commerce features are accessible from the Studio interface and designed for real-time interaction during live sessions.

---

## Table of Contents

1. [Checkout System](#checkout-system)
2. [Product Showcase](#product-showcase)
3. [Live Auctions](#live-auctions)
4. [Tipping](#tipping)
5. [Merchandise Store](#merchandise-store)
6. [Contracts & E-Signatures](#contracts--e-signatures)
7. [Lead Capture](#lead-capture)
8. [Purchase Notifications](#purchase-notifications)
9. [Common Questions & Troubleshooting](#common-questions--troubleshooting)
10. [Technical Reference](#technical-reference)

---

## Checkout System

### What It Is

The checkout system is the core payment processing flow used across all commerce features in Studio. When an attendee clicks "Buy," "Bid," or otherwise initiates a purchase, the checkout system handles the entire transaction from cart to confirmation.

### Key Components

| Component | Purpose |
|-----------|---------|
| **CheckoutModal** | The pop-up dialog that appears when a user initiates a purchase. Displays product details, pricing, quantity selection, and payment form fields. |
| **CheckoutRenderer** | Renders the checkout experience within the Studio stage area. Handles layout, responsive display, and visual presentation of the checkout flow. |

### How Checkout Works

1. A user clicks a purchase trigger (product card, auction bid, merch item, tip button).
2. The **CheckoutModal** opens with the relevant product or item pre-loaded.
3. The user reviews the item details including name, description, price, and any options.
4. The user enters payment information and confirms the purchase.
5. A **purchaseNotification** is generated and displayed to the host and optionally to other attendees.
6. The transaction is recorded and the host can view it in their commerce dashboard.

### Common Customer Questions

**Q: The checkout modal is not appearing when I click "Buy."**
A: This is typically caused by a browser pop-up blocker or an ad blocker extension. Ask the customer to:
- Disable pop-up blockers for the R-Link domain.
- Try an incognito/private browsing window.
- Clear browser cache and refresh the page.
- Try a different browser (Chrome recommended).

**Q: My payment failed during checkout.**
A: Payment failures can occur for several reasons:
- Insufficient funds or card declined by the issuing bank.
- Incorrect card details entered.
- The customer's bank may be blocking the transaction as suspicious. Recommend they contact their bank.
- If the issue persists, collect the error message and escalate to the payments team.

**Q: Can I customize the checkout experience?**
A: The checkout modal uses the room's branding and theme settings. Hosts can customize colors and branding from their room settings. The checkout flow itself follows a standardized process to ensure security and compliance.

---

## Product Showcase

### What It Is

Product Showcase allows hosts to display and highlight specific products during a live session. This feature is designed for product demonstrations, launches, and sales presentations where the host wants to draw attention to specific items.

### How It Works

1. The host configures products before or during a session from the Elements panel.
2. During the session, the host can "showcase" a product, which brings it to prominent display on the stage.
3. Attendees see the product details including images, description, and pricing.
4. A "Buy Now" or similar call-to-action button is displayed, linking to the checkout flow.
5. The host can cycle through multiple products during a session.

### Common Customer Questions

**Q: How many products can I showcase in a single session?**
A: There is no hard limit on the number of products you can showcase. You can add as many products as needed to your room elements and showcase them one at a time during the session.

**Q: Can attendees see all products or only the one being showcased?**
A: When a product is actively showcased, it is prominently displayed. Attendees can also browse other available products through the product panel if the host has made it accessible.

**Q: Do I need to upload product images?**
A: Product images are recommended for best results. Products without images will display with a placeholder, which may reduce conversion rates.

---

## Live Auctions

### What It Is

The Live Auctions feature enables hosts to run real-time auctions during their Studio sessions. This is ideal for charity events, collectible sales, exclusive item drops, and any scenario where competitive bidding adds excitement and value.

### AuctionSession Entity

The `AuctionSession` entity is the core data structure for every auction. It contains:

| Field | Type | Description |
|-------|------|-------------|
| `auction_id` | String (UUID) | Unique identifier for the auction session |
| `element_id` | String (UUID) | Links the auction to a specific room element |
| `room_id` | String (UUID) | The room where the auction is taking place |
| `host_id` | String (UUID) | The user ID of the auction host |
| `status` | Enum | Current auction state: `active`, `scheduled`, `paused`, or `ended` |
| `current_price` | Number | The current highest bid amount in the auction |
| `total_bids` | Integer | Total number of bids placed across all bidders |
| `unique_bidders` | Integer | Count of distinct users who have placed at least one bid |
| `time_extensions` | Integer | Number of times the auction timer has been extended (typically triggered when a bid is placed near the end) |

### Auction Statuses Explained

| Status | Description |
|--------|-------------|
| **scheduled** | The auction has been created but has not yet started. The host can set a future start time. Attendees can see that an auction is upcoming. |
| **active** | The auction is currently running and accepting bids. The timer is counting down and the current price updates in real time. |
| **paused** | The host has temporarily paused the auction. No bids are accepted while paused. The timer stops. The host can resume at any time. |
| **ended** | The auction has concluded, either because the timer expired or the host manually ended it. The highest bidder wins. |

### Auction Flow

1. **Setup**: The host creates an auction element in the room admin panel, specifying the item, starting price, and duration.
2. **Schedule/Start**: The auction can be scheduled for a future time or started immediately. Status becomes `scheduled` or `active`.
3. **Bidding**: Once `active`, attendees place bids. Each bid must exceed the current price. The `current_price`, `total_bids`, and `unique_bidders` fields update in real time.
4. **Time Extensions**: If a bid is placed near the end of the auction timer, the system may automatically extend the timer to prevent "sniping." The `time_extensions` counter increments each time this occurs.
5. **Pause (optional)**: The host can pause the auction if needed (e.g., to address technical issues or provide additional information about the item).
6. **End**: The auction ends when the timer expires or the host manually ends it. The highest bidder is declared the winner.
7. **Checkout**: The winning bidder is directed to the checkout flow to complete payment at the final `current_price`.

### Related Components

- **AuctionRenderer**: Displays the auction interface on the Studio stage, including item details, current price, bid history, timer, and bid input.
- **AuctionWinnerCheckout**: Handles the post-auction checkout flow for the winning bidder.

### Common Customer Questions

**Q: What happens if two people bid at the exact same time?**
A: The system processes bids sequentially. The first bid received by the server wins. The second bidder will see the updated price and can choose to bid again.

**Q: Can the host set a reserve price?**
A: The starting price functions as the minimum acceptable bid. If no bids meet or exceed the starting price, the auction ends without a winner.

**Q: What are time extensions and how do they work?**
A: Time extensions prevent last-second bidding ("sniping"). When a bid is placed in the final moments of an auction, the timer automatically extends to give other bidders a fair chance to respond. The number of extensions is tracked in the `time_extensions` field.

**Q: Can a host cancel an auction in progress?**
A: Yes, the host can end an auction at any time by changing the status to `ended`. If no bids have been placed, there is no winner. If bids exist, the host can choose to honor the highest bid or void the auction.

**Q: Why does the auction show "paused"?**
A: The host has temporarily paused the auction. This could be for any number of reasons. The auction will resume when the host is ready. No bids can be placed while paused.

---

## Tipping

### What It Is

The Tipping feature allows attendees to send monetary tips or donations to the host during a live session. This is powered by the **TippingWidget** component.

### How It Works

1. The host enables tipping for their room/session.
2. The **TippingWidget** appears in the attendee interface, typically as a button or icon.
3. Attendees click the tip button, select or enter a tip amount, and complete the transaction through the checkout flow.
4. A **purchaseNotification** is displayed to acknowledge the tip, optionally showing the tipper's name and amount to all attendees.
5. Tips are recorded and visible in the host's commerce dashboard.

### Common Customer Questions

**Q: Is there a minimum or maximum tip amount?**
A: Minimum and maximum amounts may be configured by the host or by platform defaults. If a customer is unable to enter their desired amount, check the room's tipping configuration.

**Q: Are tips refundable?**
A: Tips are generally non-refundable as they are voluntary contributions. If a customer requests a refund for a tip, escalate to the billing team for review on a case-by-case basis.

**Q: Does the tipper's name appear publicly?**
A: By default, tip notifications may display the tipper's name. The specific visibility depends on the host's notification settings.

---

## Merchandise Store

### What It Is

The built-in Merchandise Store enables hosts to sell branded or custom products directly within their Studio session. This eliminates the need for external e-commerce platforms by providing a fully integrated shopping experience.

### Key Components

| Component | Purpose |
|-----------|---------|
| **MerchStoreWidget** | The main merchandise store interface displayed to attendees during a session. Shows available products with images, descriptions, and prices. |
| **FloatingOverlay** | An overlay display mode for the merch store that floats above the main stage content, allowing attendees to browse products without leaving the session view. |
| **ProductEditor** | The host-facing interface for creating, editing, and managing products in the merchandise store. Accessible from the admin/elements panel. |

### Default Products

When a host first sets up their merchandise store, a set of default example products is provided as templates. These can be edited or replaced:

| Product | Price | Stock | Type |
|---------|-------|-------|------|
| **T-shirt** | $29.99 | 50 units | Physical |
| **VIP Pass** | $99.99 | 20 units | Digital |
| **Digital Collectible** | $49.99 | 100 units | Digital |

### Product Types

- **Physical**: Tangible items that require shipping. The checkout flow will collect a shipping address.
- **Digital**: Intangible items delivered electronically (e.g., access codes, downloadable files, digital badges). No shipping address required.

### Managing the Merchandise Store

1. **Adding Products**: Use the **ProductEditor** to create new products. Specify the name, description, price, stock quantity, product type (physical/digital), and upload product images.
2. **Editing Products**: Existing products can be modified at any time through the ProductEditor. Changes take effect immediately.
3. **Stock Management**: Stock quantities decrement automatically with each purchase. When stock reaches zero, the product is marked as sold out.
4. **Display Modes**: The merch store can be displayed as a dedicated panel or as a **FloatingOverlay** that appears over the stage content.

### Common Customer Questions

**Q: How do I add my own products to the store?**
A: Open the room admin panel, navigate to Elements, and find the Merchandise Store element. Use the Product Editor to add new products with a name, description, price, stock count, type (physical or digital), and image.

**Q: The default products are showing in my store. How do I remove them?**
A: The default products (T-shirt, VIP Pass, Digital Collectible) are templates. You can edit or delete them through the Product Editor and replace them with your own products.

**Q: What happens when a product sells out?**
A: When stock reaches zero, the product displays as "Sold Out" and the purchase button is disabled. Hosts can restock by editing the product and increasing the stock quantity.

**Q: Can I sell both physical and digital products?**
A: Yes. Each product has a type setting (physical or digital). Physical products will require a shipping address at checkout, while digital products are delivered electronically.

**Q: How do I fulfill physical product orders?**
A: Physical product orders with shipping addresses are available in the commerce dashboard. The host is responsible for fulfilling and shipping physical orders.

---

## Contracts & E-Signatures

### What It Is

The Contracts feature allows hosts to present documents for electronic signature during a live session. This integrates with industry-standard e-signature platforms to provide a seamless, legally binding signing experience.

### Configuration

| Setting | Description |
|---------|-------------|
| `file_url` | The URL of the contract document to be presented for signing |
| `display_mode` | How the contract is shown to attendees. Default: `modal` (displays as a pop-up overlay) |

### Supported Integrations

| Platform | Features |
|----------|----------|
| **DocuSign** | Full e-signature integration. Must be enabled in room settings. Supports `auto_sync` to automatically push signed documents back to the host's DocuSign account. |
| **GoHighLevel** | CRM and marketing platform integration. Must be enabled in room settings. Supports `auto_sync` to sync contract data with GoHighLevel contacts and workflows. |

### Integration Settings

Both DocuSign and GoHighLevel integrations share these configuration options:

- **enabled**: Boolean toggle to activate or deactivate the integration.
- **auto_sync**: Boolean toggle that, when enabled, automatically synchronizes signed contract data back to the respective platform.

### How It Works

1. The host uploads or links a contract document by providing the `file_url`.
2. The contract element is added to the room's elements configuration.
3. During the session, the host triggers the contract display.
4. The contract opens in the specified `display_mode` (default: `modal`).
5. Attendees review and sign the document electronically.
6. If `auto_sync` is enabled, the signed document is automatically sent to the connected platform (DocuSign or GoHighLevel).

### Common Customer Questions

**Q: Which e-signature platforms are supported?**
A: R-Link currently integrates with DocuSign and GoHighLevel. Both must be enabled in the room settings and can be configured for automatic synchronization.

**Q: How do I connect my DocuSign account?**
A: Navigate to the room settings, find the Contracts/Integrations section, enable the DocuSign integration, and follow the OAuth authorization flow to connect your DocuSign account.

**Q: What is auto_sync?**
A: When auto_sync is enabled, signed contracts are automatically pushed back to your connected platform (DocuSign or GoHighLevel). This eliminates the need to manually download and upload signed documents.

**Q: The contract is not displaying to attendees.**
A: Verify that:
- The `file_url` is valid and accessible.
- The contract element is properly configured in the room.
- The host has triggered the contract display during the session.
- Pop-up blockers are not preventing the modal from appearing.

**Q: Are e-signatures legally binding?**
A: Yes, electronic signatures through DocuSign and GoHighLevel comply with the ESIGN Act and are legally binding. R-Link facilitates the signing process through these established platforms.

---

## Lead Capture

### What It Is

Lead Capture enables hosts to collect attendee information during live sessions. This is essential for sales-oriented sessions, webinars, and any event where the host wants to build a contact list or qualify leads.

### How It Works

1. The host configures a lead capture form with the desired fields (e.g., name, email, phone, company).
2. The lead capture element is added to the room.
3. During the session, the lead capture form is presented to attendees (typically at entry or at a strategic moment chosen by the host).
4. Attendees fill out and submit the form.
5. Captured leads are stored and available in the host's dashboard.
6. If CRM integrations (like GoHighLevel) are enabled with auto_sync, leads can be automatically pushed to the CRM.

### Common Customer Questions

**Q: When does the lead capture form appear?**
A: The timing depends on the host's configuration. It can appear at room entry (before the attendee joins the session), or it can be triggered by the host during the session.

**Q: Is the lead capture form required for attendees?**
A: The host can configure whether the form is required (must be completed to join/continue) or optional (can be dismissed).

**Q: Where do captured leads go?**
A: Leads are stored in the R-Link platform and accessible from the host's dashboard. If GoHighLevel integration is enabled with auto_sync, leads are also pushed to GoHighLevel automatically.

---

## Purchase Notifications

### What It Is

Purchase notifications (powered by `purchaseNotifications`) are real-time alerts that appear in the Studio session when a transaction occurs. These notifications serve as social proof and create excitement during live commerce events.

### Types of Notifications

- **Product Purchase**: Triggered when an attendee buys a showcased product or merchandise item.
- **Auction Win**: Triggered when an auction ends and a winner is declared.
- **Tip Received**: Triggered when an attendee sends a tip to the host.

### Notification Display

- Notifications appear as toast-style alerts overlaying the Studio interface.
- They typically show the buyer's name (or anonymous), the item purchased, and the amount.
- The host sees all notifications. Attendee visibility depends on host settings.

### Common Customer Questions

**Q: Can I disable purchase notifications?**
A: Hosts can configure notification visibility in their room settings. Notifications can be shown to all attendees, only the host, or disabled entirely.

**Q: The purchase notification did not appear but the payment went through.**
A: Notification display is separate from payment processing. If payment was successful (check the commerce dashboard), the notification may have been missed due to timing, browser focus, or display settings. The transaction is still valid.

---

## Common Questions & Troubleshooting

### General Commerce Issues

**Q: I cannot see any commerce features in my Studio.**
A: Commerce features are tied to your subscription plan. Verify that your plan includes commerce capabilities. Also ensure that the relevant elements (products, auctions, merch store, etc.) have been added to the room through the admin panel.

**Q: Are transactions secure?**
A: Yes. All payment processing uses industry-standard encryption and PCI-compliant payment processors. Card details are never stored on R-Link servers.

**Q: What currencies are supported?**
A: The platform primarily operates in USD. Check the billing settings for information on additional currency support.

**Q: Can I issue refunds?**
A: Refund policies vary by transaction type. Hosts can manage refunds through their commerce dashboard. For disputed transactions, escalate to the billing support team.

**Q: How do I view my sales/revenue?**
A: All commerce data including sales, tips, auction results, and merchandise orders is available in the host's commerce dashboard accessible from the main R-Link dashboard.

---

## Technical Reference

### Components Map

| Component | File Location | Purpose |
|-----------|--------------|---------|
| CheckoutModal | `studio/checkout/CheckoutModal` | Payment processing modal |
| CheckoutRenderer | `studio/checkout/CheckoutRenderer` | Checkout display rendering |
| AuctionRenderer | `studio/auction/AuctionRenderer` | Auction stage display |
| AuctionWinnerCheckout | `studio/auction/AuctionWinnerCheckout` | Post-auction winner payment |
| TippingWidget | `studio/tipping/TippingWidget` | Tip/donation interface |
| MerchStoreWidget | `studio/merchandise/MerchStoreWidget` | Merchandise store display |
| FloatingOverlay | `studio/merchandise/FloatingOverlay` | Overlay merch display |
| ProductEditor | `studio/merchandise/ProductEditor` | Product management interface |

### Key Data Entities

| Entity | Key Fields |
|--------|------------|
| AuctionSession | auction_id, element_id, room_id, host_id, status, current_price, total_bids, unique_bidders, time_extensions |
| Product | name, description, price, stock, type (physical/digital), image_url |
| Contract | file_url, display_mode, integration settings |
| PurchaseNotification | buyer, item, amount, type, timestamp |

### State Properties

| Property | Type | Description |
|----------|------|-------------|
| `purchaseNotifications` | Array | Queue of recent purchase notifications to display |
| `auction.status` | Enum | Current auction state: active, scheduled, paused, ended |
| `auction.current_price` | Number | Latest highest bid amount |
| `auction.total_bids` | Integer | Running count of all bids |
| `auction.unique_bidders` | Integer | Count of distinct bidders |
| `auction.time_extensions` | Integer | Count of automatic timer extensions |

---

*Last updated: 2026-01-29 | R-Link Customer Service Knowledge Base*
