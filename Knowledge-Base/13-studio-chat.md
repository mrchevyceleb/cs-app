# 13 - Studio Chat

## Overview

The R-Link Studio Chat system provides real-time messaging between the host, co-hosts, and viewers during live sessions. The chat is powered by the `ChatPanel` component and includes public and private channels, emoji reactions, image sharing, message threading with replies, sentiment analysis, AI-powered chat insights, featured comment overlays, moderation controls, chat commands, notification settings, and urgency detection. The chat panel is accessible from the **Right Sidebar** in the studio interface.

---

## Accessing the Chat Panel

1. Enter any R-Link Studio session.
2. Open the **Right Sidebar**.
3. Click the **Chat** tab.
4. The panel loads with:
   - **AI Features bar** -- AI Assistant, Summary, and Notification Settings buttons.
   - **Channel navigation** -- "Everyone" public channel, "New chat" button, and private conversation tabs.
   - **Messages area** -- Scrollable message list with auto-scroll behavior.
   - **Input area** -- Message composer with emoji, attachment, image, and send controls.

---

## ChatMessage Entity

Chat messages are stored as `ChatMessage` entities linked to a webinar/session.

### Entity Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string/number | Unique message identifier |
| `webinar_id` | string | ID of the session this message belongs to |
| `user_id` | string | ID of the message author |
| `user_name` | string | Display name of the author |
| `user_avatar` | string | URL to the author's avatar image |
| `message` | string | Text content of the message |
| `sent_at` | datetime | Timestamp when the message was sent |
| `status` | string | `'active'`, `'flagged'`, `'removed'` |
| `flags` | array | Moderation flags (e.g., `['profanity', 'spam']`) |
| `channel` | string | `'Everyone'` for public or recipient name for private |
| `image` | string | URL of attached image (uploaded via `Core.UploadFile`) |
| `reactions` | array | `[{ emoji: '...', count: N }]` |
| `isPinned` | boolean | Whether the message is pinned |
| `replyTo` | object | Reference to parent message for threaded replies |
| `sentiment` | string | AI-detected sentiment: `'positive'`, `'negative'`, `'neutral'`, `'question'` |
| `edited` | boolean | Whether the message was edited after sending |

---

## Channels

### Public Channel ("Everyone")

- Default channel visible to all session participants.
- All public messages appear here.
- Shown as the first tab in the channel navigation bar.
- Displays unread count badge when new messages arrive while scrolled up.

### Private Conversations

- Click the **New chat** (+) button to start a private conversation.
- A search popover appears listing all participants (filtered by the search input).
- Select a participant to open a direct message channel.
- Private channels appear as individual tabs in the channel navigation bar.
- Each private tab shows the participant's avatar initial, first name, and unread count badge.
- Messages sent in a private channel are only visible to the two participants.

### Unread Count Tracking

- The system tracks `lastReadPerChannel` -- the last message ID read in each channel.
- Unread counts are calculated per channel: messages with IDs greater than `lastReadPerChannel[channel]` from other users.
- Red badges appear on channel tabs with unread messages.
- The parent component is notified of unread count changes via the `onUnreadCountChange` callback.

---

## Sending Messages

### Text Messages

1. Type your message in the input field at the bottom of the chat panel.
2. Press **Enter** to send (single line) or **Shift+Enter** for a new line.
3. The message is added to the active channel with the current timestamp.

### Image Attachments

1. Click the **Paperclip** or **Image** icon in the input area.
2. Select an image file from your device.
3. A preview thumbnail appears above the input field.
4. Click the **X** on the preview to remove it before sending.
5. Images are uploaded via `base44.integrations.Core.UploadFile` and the returned `file_url` is stored in the message.
6. If upload fails, an error toast notification appears.

### Replying to Messages

1. Hover over any message to reveal action buttons.
2. Click the **Reply** button (arrow icon).
3. A reply context bar appears above the input showing "Replying to [username]" and the original message preview.
4. Type your reply and press Enter.
5. The reply displays with a nested context block showing the original message and author.
6. Click the **X** on the reply bar to cancel.

---

## Message Actions

### For Your Own Messages

| Action | Description |
|--------|-------------|
| **Reply** | Start a threaded reply to this message |
| **Edit** | Enter inline edit mode; type changes and press Enter to save or Escape to cancel |
| **Delete** | Remove the message after confirmation prompt |

### For Host/Admin (All Messages)

| Action | Description |
|--------|-------------|
| **Reply** | Start a threaded reply |
| **Feature on Screen** | Display the message as a featured comment overlay on the live stage |
| **Pin** | Pin the message to the top of the chat (purple pin indicator) |
| **Remove** | Delete any user's message (moderation action) |

### Reactions

1. Hover over a message to reveal the **smiley face** button.
2. Click it to open the reaction picker popover.
3. Select from 10 available emojis: thumbs-up, heart, laughing, surprised, sad, praying, clapping, fire, celebration, checkmark.
4. The reaction appears as a badge below the message with a count.
5. Clicking an existing reaction badge increments its count.
6. Multiple different reactions can exist on a single message.

---

## Sentiment Analysis

Every chat message is automatically tagged with a sentiment indicator displayed as a small badge on the user's avatar.

### Sentiment Types

| Sentiment | Icon | Color | Badge Color | Description |
|-----------|------|-------|-------------|-------------|
| `positive` | ThumbsUp | Green | `bg-green-500` | Positive or appreciative messages |
| `negative` | ThumbsDown | Red | `bg-red-500` | Negative or critical messages |
| `neutral` | Meh | Gray | `bg-gray-500` | Neutral or informational messages |
| `question` | HelpCircle | Yellow | `bg-yellow-500` | Questions or requests for information |

Sentiment is determined by the `ChatPanel` component when messages are created. The avatar badge is a small circle (3.5px) positioned at the bottom-right corner of the user avatar with a tooltip showing the sentiment label.

---

## AI Chat Insights

The `AIChatInsights` component provides real-time AI-powered analysis of the chat conversation.

### Accessing AI Insights

- Click the **AI Assistant** button in the chat header to open the `AIChatAssistant` panel.
- Click the **Summary** button to toggle the `ChatSummaryPanel`.

### Insight Features

#### Action Suggestions

The system monitors chat for trending topics and generates actionable suggestions:

| Topic Detected | Suggestion | Recommended Action |
|----------------|------------|-------------------|
| Pricing (3+ mentions) | "N people asking about pricing" | Activate checkout element |
| Features (3+ mentions) | "N questions about features" | Activate product showcase |
| Demo requests (3+ mentions) | "N requests for demo" | Start screen share or presentation |
| Comparison (3+ mentions) | "N comparison questions" | Activate talking point element |
| Integration (3+ mentions) | "N integration questions" | Activate web overlay element |
| Support (3+ mentions) | "N support requests" | Trigger lead capture |

Suggestions are prioritized by mention count: **High** (10+), **Medium** (5+), **Low** (3+). Each suggestion has an **action button** that the host can click to immediately take the recommended action (e.g., activate an element type).

#### Keyword Detection

The system monitors for these keyword categories:

| Category | Keywords Detected |
|----------|-------------------|
| `pricing` | price, cost, how much, pricing, expensive, cheap, affordable, buy, purchase |
| `features` | feature, capability, can it, does it, support, include, functionality |
| `demo` | demo, show, example, tutorial, how to, guide |
| `comparison` | vs, versus, compare, comparison, difference, better than, alternative |
| `integration` | integrate, integration, connect, api, webhook, plugin |
| `support` | help, support, contact, issue, problem, bug, error |

#### Sentiment Overview

Displays a visual breakdown of chat sentiment across all messages:
- Positive, Neutral, Negative, Excited, Confused categories with emoji badges and counts.

#### Trending Topics

Shows the top 5 trending topics as horizontal bar charts with mention counts, analyzed from the last 50 messages.

#### Most Engaged Users

Ranks the top 3 most engaged participants by engagement score:
- **Score formula:** `(messageCount * 2) + reactionCount + (questionCount * 3)`
- Displayed with gold (#1), silver (#2), and bronze (#3) ranking badges.

### Urgent Query Detection

The `UrgentQueryAlert` component displays a banner alert when the AI detects urgent or time-sensitive questions from viewers. The host can click to respond directly or dismiss the alert.

---

## Featured Comment Overlay

Hosts can feature any chat message as an on-screen overlay visible to all viewers.

### How to Feature a Comment

1. Hover over any message in the chat.
2. Click the **Star** icon (host-only action).
3. The `FeaturedCommentOverlay` component renders the message on the live stage.
4. The overlay appears at the bottom-left of the stage with:
   - User avatar (or initial badge with user's color).
   - User name in bold.
   - Message text (max 2 lines, truncated with `line-clamp-2`).
   - Gradient background using session branding colors (`primaryColor` to `accentColor`).
5. Click the overlay to unfeature it, or click the star icon again in the chat.

### Overlay Styling

- **Font:** Inherits from session branding (`font` setting, default: Inter).
- **Colors:** Gradient from `primaryColor` (default: `#6a1fbf`) to `accentColor` (default: `#00c853`).
- **Animation:** Slides in from the left (`x: -40` to `x: 0`) with 300ms ease-out transition.
- **Avatar size:** 48x48px rounded circle.
- **Max width:** `max-w-md` for the text content area.

---

## Chat Commands

Viewers and hosts can type special commands in chat to trigger effects and overlays. Commands are processed by the `ChatCommandsProcessor` component.

### Available Commands

| Command | Type | Action |
|---------|------|--------|
| `!confetti` or `!celebrate` | Effect | Trigger confetti celebration animation |
| `!fireworks` | Effect | Launch fireworks animation |
| `!hearts` | Effect | Show floating hearts animation |
| `!poll` | Show | Display the active poll overlay |
| `!qa` or `!question` | Show | Open the Q&A session panel |
| `!price` or `!rly` | Overlay | Show the RLY price tracker overlay |
| `!nft` | Overlay | Display the NFT showcase overlay |
| `!leaderboard` | Overlay | Show the token leaderboard overlay |

### Command Processing

- Commands must start with `!` followed by the command keyword.
- Commands are case-insensitive (converted to lowercase before matching).
- Only the first word after `!` is parsed as the command.
- The `onCommand` callback receives an object: `{ type: 'effect'|'show'|'overlay', value: '...' }`.
- Commands can be enabled/disabled via the `enabled` prop on the `ChatCommandsProcessor`.

### Chat Commands Helper

The `ChatCommandsHelper` component provides an in-panel reference guide:
- Click the **help icon** (question mark) in the chat panel header.
- A floating panel lists all available commands with descriptions.
- Includes a "Pro Tip" section encouraging viewers to use commands during live streams.

---

## Moderation

### ModerationSettings Entity

Moderation settings are stored per webinar via the `ModerationSettings` entity:

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `webinar_id` | string | -- | Session this config applies to |
| `ai_moderation_enabled` | boolean | false | Enable AI-powered content filtering |
| `slow_mode_enabled` | boolean | false | Rate-limit messages per user |
| `slow_mode_seconds` | number | 5 | Seconds between allowed messages in slow mode |
| `profanity_filter_level` | string | `'medium'` | Filter strength: `'low'`, `'medium'`, `'high'` |
| `link_filtering` | string | `'approve'` | Link handling: `'allow'`, `'approve'` (require approval), `'block'` |

### Moderation Features

- **AI Moderation:** When enabled, incoming messages are analyzed for inappropriate content. Flagged messages receive a `status: 'flagged'` and display a yellow "Flagged" badge visible only to the host.
- **Slow Mode:** When enabled, users can only send one message every N seconds (configurable). Prevents spam flooding during high-traffic sessions.
- **Profanity Filter:** Automatically detects and filters profane content at the configured sensitivity level.
- **Link Filtering:** Controls how URLs in messages are handled:
  - `'allow'` -- All links pass through.
  - `'approve'` -- Links are held for host approval before appearing in chat.
  - `'block'` -- All links are automatically removed.
- **Moderation Flags:** Flagged messages display colored badges in the chat visible only to the host (e.g., "profanity", "spam"). The host can review and choose to keep or remove the message.
- **Message Removal:** Hosts can remove any message via the hover action menu.

### Accessing Moderation Settings

1. The `ModerationSettingsPanel` is opened from the chat panel settings.
2. It fetches the current `ModerationSettings` for the `webinarId`.
3. Toggle settings on/off, adjust values, and click **Save** to persist changes.

---

## Notification Settings

The `NotificationSettingsModal` allows users to configure their chat notification preferences:

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `newMessages` | boolean | true | Notify on all new messages |
| `privateOnly` | boolean | false | Only notify for private/DM messages |
| `mentions` | boolean | true | Notify when mentioned by name |
| `urgentQueries` | boolean | true | Notify for AI-detected urgent questions |
| `sound` | boolean | true | Play notification sounds |
| `desktop` | boolean | true | Show desktop/browser notifications |

Access notification settings by clicking the **bell icon** in the chat panel header.

---

## Auto-Scroll Behavior

- The chat panel auto-scrolls to the bottom as new messages arrive.
- Scrolling up pauses auto-scroll. A banner appears: "Auto-scroll paused" with the unread count.
- Clicking the banner re-enables auto-scroll and jumps to the latest message.
- When auto-scroll resumes, all visible messages are marked as read.
- Auto-scroll detection threshold: within 10px of the bottom.

---

## Typing Indicators

- When a user types, a typing event is dispatched (via WebSocket in production).
- The chat panel displays animated bouncing dots with "[User(s)] is/are typing..." text.
- Typing indicators auto-clear after 3 seconds of inactivity.
- Multiple simultaneous typists are displayed together.

---

## Pinned Messages

- Hosts can pin any message by clicking the **Pin** icon in the hover actions.
- Pinned messages display with:
  - A purple background tint (`bg-[#6a1fbf]/10`).
  - A purple pin badge in the top-right corner of the message bubble.
  - A "Pinned" badge next to the username in the `ChatMessage` component.
- Clicking the pin icon again unpins the message.
- Pinned messages remain in their chronological position (they are not moved to the top in the main chat view, but are visually highlighted).

---

## Message Editing

1. Hover over your own message.
2. Click the **Edit** (pencil) icon.
3. The message bubble transforms into an inline input field with the current text.
4. Edit the text and press **Enter** to save, or **Escape** to cancel.
5. Saved edits add an "(edited)" label next to the message text.
6. Only the message author can edit their own messages.

---

## Common Troubleshooting

### Q: I cannot see private messages from a specific participant.
**A:** Click the participant's tab in the channel navigation. If no tab exists, click the "New chat" (+) button and search for the participant. Private conversations only appear as tabs after the first message is exchanged.

### Q: Chat messages are not auto-scrolling to the bottom.
**A:** You have likely scrolled up in the chat, which pauses auto-scroll. Click the "Auto-scroll paused" banner to re-enable it, or scroll to the very bottom of the chat manually.

### Q: I featured a comment but it is not showing on the stage.
**A:** Ensure the session is in live mode. The `FeaturedCommentOverlay` renders on the stage canvas. If you are in editor/preview mode, overlays may not be visible. Also confirm the `onFeatureComment` callback is properly wired in the studio layout.

### Q: Chat commands are not working.
**A:** Chat commands require the `ChatCommandsProcessor` to be enabled (`enabled` prop set to `true`). Verify the host has not disabled commands for this session. Commands must start with `!` and be typed as the first word in the message.

### Q: How do I enable slow mode?
**A:** Open the Moderation Settings panel (accessible from the chat settings), toggle "Slow Mode" on, and set the desired interval in seconds. This limits how frequently each user can send messages.

### Q: Can viewers see flagged messages?
**A:** No. Flagged messages with moderation badges are only visible to the host. Other viewers see the message normally unless the host removes it.

### Q: How does the AI generate suggestions?
**A:** The AI Chat Insights system analyzes the last 50 chat messages for keyword patterns in 6 categories (pricing, features, demo, comparison, integration, support). When 3 or more messages match a category, a suggestion card appears with a recommended action. Suggestions are prioritized by frequency.

---

## Related Features

- **Elements:** AI suggestions can recommend activating specific element types. See `10-studio-elements.md`.
- **Overlays and Scenes:** Featured comments render as stage overlays. See `14-studio-overlays-scenes.md`.
- **Polls and Q&A:** Chat commands can trigger poll and Q&A displays. See `12-studio-polls-qa.md`.
- **Streaming:** Chat is visible to viewers on all streaming platforms. See `15-studio-streaming.md`.
