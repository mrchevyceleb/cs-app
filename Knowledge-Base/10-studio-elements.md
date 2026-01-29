# Studio Elements System

## Overview

The R-Link Studio Elements system provides a comprehensive library of interactive content types that hosts can activate during live sessions. With 16+ element types ranging from video and audio playback to auctions, contracts, and crypto tickers, elements form the core building blocks of any R-Link session. Elements are organized into folders, support activation/deactivation on the live stage, and can be managed through a full CRUD interface. The Elements system is available across all session types (Meeting, Webinar, Live Stream) though certain element types may be more relevant to specific session modes.

## Element Types Reference

### Media Elements

#### Video Element
- **Components:** `VideoElementModal` (configuration), `VideoPreviewModal` (preview before activation), `VideoStageRenderer` (on-stage display)
- **Purpose:** Play video files directly on the stage during a session
- **Configuration:** Upload or link a video file, set playback options
- **Stage behavior:** Renders the video within the stage layout; hosts control play/pause/seek

#### Audio Element
- **Components:** `AudioElementModal` (configuration), `AudioStageRenderer` (on-stage playback), `AudioPreviewModal` (preview)
- **Purpose:** Play audio files during a session (background music, sound effects, audio content)
- **Key feature -- Audio Ducking:** The audio element supports an `isDucking` state, which automatically lowers the audio volume when a speaker is talking and raises it back when they stop. This prevents background audio from competing with voices.
- **Configuration:** Upload or link an audio file, set volume levels, enable/disable ducking

#### Presentation Element
- **Components:** `PresentationElementModal` (configuration), `PresentationStageRenderer` (on-stage display), `PresentationPreviewModal` (preview), `PresentationShareModal` (sharing)
- **Purpose:** Display slide presentations on the stage with full navigation controls
- **Key properties:**
  - `file_url` / `fileUrl`: The URL of the uploaded presentation file
  - `fileType`: The format of the presentation (PDF, images, etc.)
  - **Transitions:** Supports fade transitions between slides
- **Navigation:** Hosts can advance forward/backward through slides; slide number is visible to hosts

### Interactive Commerce Elements

#### Product Showcase Element
- **Components:** `ProductShowcaseModal` (configuration), `ProductShowcaseRenderer` (on-stage display)
- **Purpose:** Display products with details, images, and pricing during a session
- **Use case:** E-commerce presentations, product launches, shopping events

#### Checkout Element
- **Components:** `CheckoutModal` (configuration), `CheckoutRenderer` (on-stage display)
- **Purpose:** Enable in-session purchases with a checkout flow displayed on stage
- **Key feature:** Triggers `purchaseNotifications` when a viewer completes a purchase, which can display on-screen alerts
- **Use case:** Live shopping events, flash sales during webinars

#### Auction Element
- **Components:** `AuctionModal` (configuration), `AuctionRenderer` (on-stage display)
- **Purpose:** Run live auctions during sessions with real-time bidding
- **Key entity -- AuctionSession:** Tracks the full auction state:
  - `status`: `active` | `scheduled` | `paused` | `ended`
  - `current_price`: The current highest bid amount
  - `total_bids`: Number of bids placed
  - `unique_bidders`: Count of distinct bidders
  - `time_extensions`: Number of time extensions applied (e.g., extending when a last-second bid arrives)
- **Use case:** Charity auctions, product auctions, fundraising events

#### Lead Capture Element
- **Components:** `LeadCaptureModal` (configuration), `LeadCaptureRenderer` (on-stage display)
- **Purpose:** Collect viewer information (name, email, phone, etc.) through an on-stage form
- **Use case:** Webinar lead generation, event registrations, newsletter signups

### Engagement Elements

#### Timer Element
- **Components:** `TimerElementModal` (configuration), `TimerStageRenderer` (on-stage display)
- **Purpose:** Display countdown or count-up timers on stage
- **Timer status states:**
  - `idle`: Timer has not started
  - `running`: Timer is actively counting
  - `paused`: Timer is paused and can be resumed
- **Use case:** Session countdowns, break timers, timed activities, offer deadlines

#### Prompter Element
- **Components:** `PrompterElementModal` (configuration), `PrompterViewer` (display)
- **Purpose:** Provide a teleprompter for hosts to read scripted content while presenting
- **Window modes:**
  - `docked`: Prompter appears within the Studio interface
  - `detached`: Prompter opens in a separate browser window (useful for dual-monitor setups)
- **Use case:** Scripted presentations, news-style broadcasts, prepared remarks

#### Poll Element
- **Components:** `PollModal` (configuration), `PollStageRenderer` (on-stage display)
- **Purpose:** Create and display polls for audience participation
- **Related state:** `showQuickPoll` for rapid poll creation
- **Use case:** Audience engagement, feedback collection, decision-making

#### Leaderboard Element
- **Components:** `LeaderboardElementModal` (configuration), `LeaderboardStageRenderer` (on-stage display)
- **Purpose:** Display ranked leaderboards on stage
- **Use case:** Gamified events, competitions, top-contributor recognition

### Display and Data Elements

#### Crypto Ticker Element
- **Components:** `CryptoTickerElementModal` (configuration), `CryptoTickerStageRenderer` (on-stage display)
- **Purpose:** Display real-time cryptocurrency price tickers on stage
- **Use case:** Crypto-focused broadcasts, financial content, trading sessions

#### Contract Element
- **Components:** `ContractModal` (configuration), `ContractRenderer` (on-stage display), `ContractStageRenderer` (stage rendering)
- **Purpose:** Present and execute contracts/agreements during a session
- **Key properties:**
  - `file_url`: URL to the contract document
  - `display_mode`: `modal` -- displays the contract in a modal overlay
  - **Integrations:** DocuSign and GoHighLevel for e-signature workflows
- **Use case:** Sales closings, agreement signings, onboarding documents

#### Web Overlay Element
- **Components:** `WebOverlayModal` (configuration)
- **Purpose:** Embed external web content as an overlay on the stage
- **Use case:** Displaying external dashboards, websites, or web applications during a session

### Rally Overlay Elements (Crypto/Web3)

Rally overlay elements are specialized for blockchain and Web3 communities:

| Type | Purpose |
|------|---------|
| `rally_badge` | Display community badges or achievements |
| `nft_showcase` | Showcase NFT collections or individual NFTs |
| `token_drop` | Run token distribution events |
| `price_tracker` | Track and display token prices in real time |
| `token_balance` | Show token balance information |
| `wallet_status` | Display wallet connection status |
| `mint_counter` | Track NFT minting progress |
| `gas_tracker` | Display current gas prices |
| `volume_display` | Show trading volume metrics |
| `community_stats` | Display community engagement statistics |
| `staking_rewards` | Show staking reward information |

## Element Folder System

### Folder Structure
Elements are organized into folders for easy management. Each folder has the following properties:
- **`room_id`**: Associates the folder with a specific session/room
- **`is_global`**: When set to `true`, the folder and its elements are shared across all sessions for that account

### Folder Operations

#### Creating a Folder
1. Navigate to the **Elements** tab in the Studio
2. Click the "Create Folder" option
3. Enter a folder name
4. Optionally mark it as a **global folder** to share across sessions
5. The folder is created and ready to receive elements

#### Editing a Folder
1. Right-click or open the folder menu
2. Select "Edit Folder"
3. Modify the folder name or global status
4. Save changes

#### Deleting a Folder
1. Right-click or open the folder menu
2. Select "Delete Folder"
3. Confirm the deletion (elements within may be moved or deleted depending on configuration)

### Global Folders
- Folders with `is_global: true` are shared across all sessions
- Useful for storing reusable elements like brand assets, standard presentations, or frequently used timers
- Changes to elements in global folders affect all sessions that reference them

## Element CRUD Operations

### Creating an Element
1. Open the **Elements** tab in Studio
2. Click "Add Element" or select a specific element type
3. If no folder is selected, the `FolderSelectModal` appears prompting you to choose or create a folder
4. Fill in the element configuration modal:
   - **`room_id`**: Automatically set to the current session
   - **`folder_id`**: The target folder
   - **`type`**: The element type (video, audio, timer, etc.)
   - **`name`**: A display name for the element
   - **`data`**: Type-specific configuration (JSON object)
5. Save the element

### Updating an Element
1. Locate the element in its folder within the Elements tab
2. Click on the element or select "Edit" from its context menu
3. The appropriate modal opens (e.g., `VideoElementModal` for video elements)
4. Modify the configuration
5. Save changes

### Deleting an Element
1. Locate the element in its folder
2. Select "Delete" from the context menu
3. Confirm the deletion
4. The element is removed from the folder and deactivated if currently active

### Duplicating an Element
1. Select "Duplicate" from the element's context menu
2. A copy of the element is created in the same folder
3. The duplicated element is named with a `"(Copy)"` suffix appended to the original name
4. The copy can be independently edited and configured

### Moving Elements Between Folders
1. Select "Move" from the element's context menu (or drag-and-drop if supported)
2. Choose the target folder from the folder list
3. The element is relocated to the new folder
4. If moved to a global folder, the element becomes available across all sessions

## Element Activation and Deactivation

### Activating an Element
- Trigger: Host clicks "Activate" or uses the `handleActivateElement` function
- Behavior: The system sets `activeElements[element.type] = element`
- Only **one element per type** can be active at a time (activating a new video element deactivates the previous video element)
- The element's stage renderer component (e.g., `VideoStageRenderer`, `TimerStageRenderer`) begins rendering on the live stage

### Deactivating an Element
- Trigger: Host clicks "Deactivate" or uses the `handleDeactivateElement` function
- Behavior: The element is removed from the `activeElements` object for its type
- The stage renderer is unmounted and the element disappears from the live stage

### Active Elements State
- The `activeElements` state is a dictionary keyed by element type
- Example: `{ video: {id: 1, ...}, timer: {id: 5, ...}, poll: {id: 3, ...} }`
- Multiple element types can be active simultaneously (e.g., a video and a timer at the same time)
- Activating a different element of the same type replaces the currently active one

## Element Management Features

### Favorites
- Each element has an `is_favorite` boolean property
- Toggle the favorite status by clicking the favorite/star icon on an element
- Favorited elements can be filtered to the top for quick access

### Reordering
- Elements within a folder have an `order` field that determines display order
- Drag elements to reorder them within a folder
- The `order` field is updated to reflect the new position

### ElementsTab Admin Interface
- The **ElementsTab** is the primary administrative interface for managing the elements library
- Displays all folders and their elements in a browsable tree/list
- Provides controls for:
  - Creating, editing, and deleting folders
  - Creating, editing, deleting, duplicating, and moving elements
  - Toggling favorites
  - Reordering elements via drag-and-drop
  - Activating and deactivating elements
  - Filtering and searching elements

## Settings and Options

| Setting | Description | Values |
|---------|-------------|--------|
| Element type | The kind of element to create | `video`, `audio`, `timer`, `presentation`, `prompter`, `product_showcase`, `checkout`, `lead_capture`, `auction`, `contract`, `leaderboard`, `crypto_ticker`, `poll`, `web_overlay`, Rally types |
| Folder assignment | Which folder the element belongs to | Any existing folder or create new |
| Global folder | Whether the folder is shared across sessions | `true` / `false` |
| Favorite | Quick-access marking | `true` / `false` |
| Order | Display position within folder | Numeric value |
| Audio ducking | Auto-lower audio when speaker talks | `isDucking` state toggle |
| Timer status | Current timer state | `idle` / `running` / `paused` |
| Prompter window mode | How the teleprompter displays | `docked` / `detached` |
| Presentation transition | Slide change animation | `fade` |
| Contract display mode | How the contract is shown | `modal` |

## Troubleshooting

### Element not appearing on stage after activation
1. Verify the element is listed in the active elements by checking the Elements tab -- the element should show an "active" indicator
2. Confirm the element type does not conflict with another active element of the same type (only one per type)
3. Check that the element data is valid (e.g., a video element has a valid video URL)
4. Refresh the Studio page and try activating again

### Folder not visible
1. Ensure the folder belongs to the current session's `room_id` or is marked as `is_global`
2. Check if folder filters are hiding the folder
3. Try refreshing the Elements tab

### Duplicate element missing
1. The duplicated element should appear in the same folder as the original
2. Look for an element with the same name plus `"(Copy)"` suffix
3. Scroll down in the folder as it may appear at the end of the list

### Audio ducking not working
1. Verify the audio element has `isDucking` enabled in its configuration
2. Ensure a microphone is active so the system can detect when someone is speaking
3. Check that the audio element is currently activated on stage

### Presentation slides not advancing
1. Ensure the presentation file uploaded successfully (`file_url` / `fileUrl` is valid)
2. Check the `fileType` is a supported format
3. Try re-uploading the presentation file
4. Verify you have host permissions to control navigation

### Contract integration not working (DocuSign/GoHighLevel)
1. Verify the integration is properly configured in account settings
2. Ensure the `file_url` points to a valid document
3. Check that the `display_mode` is set correctly
4. Confirm the third-party service (DocuSign or GoHighLevel) account is connected and active

## FAQ

**Q: How many elements can I have active at the same time?**
A: You can have one active element per element type simultaneously. For example, you can have a video, a timer, and a poll all active at the same time, but you cannot have two videos active simultaneously. Activating a second element of the same type will replace the first.

**Q: What is the difference between room-level and global folders?**
A: Room-level folders (`room_id` set, `is_global: false`) are specific to a single session. Global folders (`is_global: true`) are shared across all sessions in your account, making them ideal for reusable content like brand presentations or standard timers.

**Q: Can I use elements in all session types?**
A: Yes, elements are available across Meeting, Webinar, and Live Stream session types. However, some elements like product showcase and checkout are more commonly used in Webinar and Live Stream modes for audience-facing commerce.

**Q: What happens to active elements if I navigate away from the Studio?**
A: Active elements remain active on the stage for viewers. Returning to the Studio will show the current active element state. Only explicit deactivation removes them.

**Q: Can I reuse elements across different sessions?**
A: Yes, by placing elements in global folders. Elements in global folders are accessible from any session. You can also duplicate elements and move them between folders.

**Q: What is audio ducking?**
A: Audio ducking automatically reduces the volume of a playing audio element when a speaker's microphone is active, and restores the volume when they stop speaking. This ensures background music or audio does not compete with the speaker's voice.

**Q: How do auction time extensions work?**
A: When an auction is running and a bid is placed near the end of the countdown, the system can automatically add extra time (a time extension) to prevent sniping. The `time_extensions` count tracks how many extensions have been applied.

## Known Limitations

- Only one element of each type can be active on stage at a time
- Rally overlay elements require Web3/blockchain integration to be configured
- The `FolderSelectModal` appears every time an element is created without a pre-selected folder, which may add an extra step to the workflow
- Presentation transitions are currently limited to `fade`; additional transition types are not yet available
- Contract element integrations (DocuSign, GoHighLevel) require separate third-party account setup
- The prompter in `detached` mode opens a new browser window, which may be blocked by popup blockers
- Element reordering is folder-scoped; elements cannot be ordered across different folders
- Audio ducking sensitivity is not user-configurable; it uses a system-determined threshold

## Plan Requirements

| Feature | Basic Plan | Business Plan |
|---------|-----------|---------------|
| Core elements (video, audio, timer, presentation) | Yes | Yes |
| Prompter element | Yes | Yes |
| Poll element | Yes | Yes |
| Product showcase, checkout | Limited | Yes |
| Auction element | No | Yes |
| Lead capture element | Limited | Yes |
| Contract element (with integrations) | No | Yes |
| Leaderboard element | Yes | Yes |
| Crypto ticker and Rally overlays | No | Yes |
| Web overlay element | Yes | Yes |
| Global folders | Yes | Yes |
| Element favorites and reordering | Yes | Yes |

## Related Documents

- [00-index.md](00-index.md) -- Knowledge base index
- [14-studio-overlays-scenes.md](14-studio-overlays-scenes.md) -- Overlays and scenes system
- [12-studio-polls-qa.md](12-studio-polls-qa.md) -- Polls and Q&A details
- [15-studio-streaming.md](15-studio-streaming.md) -- Streaming configuration
- [16-studio-recording.md](16-studio-recording.md) -- Recording features
- [13-studio-chat.md](13-studio-chat.md) -- Chat system
