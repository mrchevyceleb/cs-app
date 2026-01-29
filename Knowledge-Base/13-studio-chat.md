# Studio Chat System

## Overview

The R-Link Studio Chat system enables real-time text communication between hosts and attendees during live sessions. Built around the `ChatMessage` entity, the chat system supports standard messaging, command processing via `ChatCommandsProcessor`, AI-powered analysis through `AIChatInsights`, and the ability to feature comments on the live stream via `FeaturedCommentOverlay`. Chat messages are scoped to individual sessions using a `webinar_id` (equivalent to `room_id`), ensuring each session maintains its own isolated chat history. The chat system is available across all R-Link session types -- Meeting, Webinar, and Live Stream.

## Chat Message Entity

### Data Structure
Each chat message is represented by a `ChatMessage` entity with the following key properties:

| Property | Description |
|----------|-------------|
| `id` | Unique identifier for the message |
| `webinar_id` | The session/room ID this message belongs to (also referenced as `room_id`) |
| `user_id` | The ID of the user who sent the message |
| `content` | The text content of the message |
| `timestamp` | When the message was sent |
| `user_name` | Display name of the sender |
| `user_role` | Role of the sender (host, co-host, attendee, etc.) |

### Message Fetching and Filtering
- Chat messages are fetched filtered by `webinar_id` / `room_id` to ensure only messages from the current session are displayed
- Messages load in real-time via WebSocket or polling, depending on the connection
- Historical messages may be loaded when a participant joins mid-session
- Messages from blocked or muted users are filtered out on the client side

## Sending and Receiving Messages

### Sending a Message
1. Open the **Chat** panel in the Studio sidebar
2. Type a message in the chat input field at the bottom of the panel
3. Press **Enter** or click the send button
4. The message is transmitted to all participants in the current session
5. The message appears in the chat feed with your name, role indicator, and timestamp

### Receiving Messages
- Incoming messages appear in real-time in the chat panel
- Messages are displayed chronologically (newest at the bottom)
- Host/co-host messages may be visually distinguished (e.g., highlighted or badged)
- New message notifications appear if the chat panel is collapsed or scrolled up

## Chat Commands

### ChatCommandsProcessor
The `ChatCommandsProcessor` component handles special commands typed into the chat input. Commands are prefixed with a designated character (typically `/`) and trigger specific actions rather than sending a visible chat message.

### Using Chat Commands
1. In the chat input field, type a command starting with the command prefix
2. Press **Enter** to execute the command
3. The command is processed by `ChatCommandsProcessor`
4. The result or action is executed (e.g., muting a user, starting a poll, clearing chat)
5. Commands are generally not visible to regular attendees; only the resulting action is seen

### Common Command Capabilities
- **Moderation commands:** Mute, ban, or remove participants
- **Display commands:** Trigger overlays, activate elements, or change settings
- **Utility commands:** Clear chat, pin a message, announce to all participants

## AI Chat Insights

### AIChatInsights Component
The `AIChatInsights` component provides AI-powered analysis of the chat conversation, offering hosts real-time intelligence about audience engagement and sentiment.

### Features
- **Sentiment analysis:** Monitors the overall mood of the chat (positive, negative, neutral)
- **Topic detection:** Identifies trending topics or frequently mentioned subjects in the conversation
- **Engagement metrics:** Tracks chat activity levels, message frequency, and participation rates
- **Key highlights:** Surfaces important messages or questions that may need host attention
- **Summary generation:** Provides condensed summaries of long chat threads

### Using AI Chat Insights
1. Open the chat panel in the Studio
2. Look for the **AI Insights** section or toggle (typically above the chat feed or in a sub-tab)
3. View real-time analysis of the ongoing conversation
4. Use insights to guide your presentation -- address trending topics, respond to sentiment shifts, or acknowledge key questions

## Featured Comments

### FeaturedCommentOverlay
The `FeaturedCommentOverlay` component allows hosts to highlight specific chat messages on the live stream/stage, making them visible to all viewers including those watching on external streaming platforms.

### Featuring a Comment
1. Browse the chat feed during a session
2. Identify a message you want to highlight
3. Click the "Feature" action on the message (star icon, pin icon, or context menu option)
4. The message is set as the `featuredComment` in the application state
5. The `FeaturedCommentOverlay` renders the featured message on the live stage
6. The featured comment is visible to all viewers, including those on external streams

### Managing Featured Comments
- **`featuredComment` state:** Holds the currently featured chat message object
- **Display:** The overlay renders the commenter's name and message content in a styled banner on the stage
- **Removing:** Click "Unfeature" or feature a different comment to replace the current one
- **Clearing:** Set `featuredComment` to `null` to remove the overlay entirely

### Best Practices for Featured Comments
- Feature questions that are relevant to the current topic
- Highlight positive testimonials or reactions during product showcases
- Use featured comments to acknowledge audience participation
- Avoid featuring comments with sensitive or inappropriate content

## Chat Moderation

### Moderation Tools
Hosts and co-hosts have access to moderation tools to maintain a productive chat environment:

| Action | Description |
|--------|-------------|
| **Mute user** | Temporarily prevent a user from sending messages |
| **Ban user** | Permanently remove a user from the session and block future messages |
| **Delete message** | Remove a specific message from the chat feed for all participants |
| **Slow mode** | Limit how frequently users can send messages (rate limiting) |
| **Clear chat** | Remove all messages from the chat feed |
| **Pin message** | Pin an important message to the top of the chat panel |

### Moderation Workflow
1. Identify a problematic message or user in the chat feed
2. Click on the user's name or the message's context menu
3. Select the appropriate moderation action
4. The action takes effect immediately:
   - Muted users see a notification that they are muted
   - Banned users are removed from the session
   - Deleted messages disappear for all participants
5. Moderation actions are logged for the host's reference

### Automated Moderation
- The system may include automated filters for profanity, spam, or links
- AI-powered moderation can flag potentially problematic messages for host review
- Hosts can configure moderation sensitivity in session settings

## Settings and Options

| Setting | Description | Default |
|---------|-------------|---------|
| Chat enabled | Whether the chat panel is available in the session | Enabled |
| Chat visibility | Who can see chat messages | All participants |
| Send permissions | Who can send messages | All participants |
| Slow mode interval | Minimum seconds between messages per user | Disabled |
| Link sharing | Whether URLs in chat are clickable | Enabled |
| AI Insights | Enable AI-powered chat analysis | Varies by plan |
| Featured comment style | Visual style of the featured comment overlay | Default theme |
| Profanity filter | Automatic filtering of inappropriate language | Enabled |
| Chat history | Whether chat history is available after session ends | Varies by plan |

## Troubleshooting

### Chat messages not appearing
1. Verify the chat panel is open and not collapsed
2. Check your internet connection -- chat requires an active WebSocket or polling connection
3. Ensure you are in the correct session (messages are filtered by `webinar_id`/`room_id`)
4. Try refreshing the Studio page
5. Check if you have been muted by a host

### Cannot send messages
1. Verify you are not muted or banned
2. Check if slow mode is active and you are sending too frequently
3. Ensure the chat input field is focused and not disabled
4. Verify your user role has send permissions for the current session configuration

### Featured comment not displaying on stream
1. Confirm a comment has been featured (check `featuredComment` state)
2. Ensure the `FeaturedCommentOverlay` component is active in the stream layout
3. Verify the stream is running -- featured comments display on the live output
4. Check if another overlay is covering the featured comment area

### AI Insights not available
1. Verify your plan includes AI Chat Insights
2. Ensure sufficient chat messages have been sent for analysis (minimum threshold required)
3. Check if AI Insights is toggled on in the chat panel settings
4. The feature may take a few moments to generate initial analysis after a session starts

### Chat history missing after session
1. Chat history retention depends on your plan tier
2. Check the session's recording or archive for chat logs
3. Chat history is associated with the `webinar_id` -- ensure you are looking at the correct session

## FAQ

**Q: Are chat messages saved after a session ends?**
A: Chat message retention depends on your plan. Business plans typically include post-session chat history access. Messages are stored with their `webinar_id` for retrieval.

**Q: Can attendees see chat commands?**
A: No. Commands processed by `ChatCommandsProcessor` are intercepted before being sent as visible messages. Only the resulting actions are visible to attendees.

**Q: How does the featured comment overlay work on external streams?**
A: The `FeaturedCommentOverlay` is rendered as part of the stream output. When streaming to platforms like YouTube or Facebook, the featured comment appears as a visual overlay burned into the video feed, so external viewers see it as part of the video.

**Q: Can I feature multiple comments at once?**
A: No. The `featuredComment` state holds a single message at a time. Featuring a new comment replaces the previous one. To remove the featured comment without replacing it, clear the state.

**Q: Is the AI Chat Insights analysis shared with attendees?**
A: No. AI Chat Insights are visible only to hosts and co-hosts. Attendees do not see sentiment analysis, topic detection, or any AI-generated summaries.

**Q: Can I export chat messages?**
A: Chat export capabilities depend on your plan and session type. Business plans generally support exporting chat logs for post-session review and analysis.

**Q: Does the chat work across all session types?**
A: Yes. Chat is available in Meeting, Webinar, and Live Stream session types, though the moderation tools and featured comment overlay are most relevant in Webinar and Live Stream modes where there is a larger audience.

## Known Limitations

- Only one comment can be featured at a time; there is no queue or rotation system for featured comments
- Chat commands are processed client-side by `ChatCommandsProcessor`; there is no server-side command registry
- AI Chat Insights requires a minimum volume of messages before generating useful analysis
- Chat messages are filtered by `webinar_id`, so cross-session chat is not possible
- The featured comment overlay position and style customization options are limited
- Chat history availability after a session depends on plan tier; Basic plans may not retain full history
- Slow mode applies uniformly to all non-host participants; per-user rate limits are not configurable
- Chat does not support rich media embedding (images, GIFs) in standard messages -- only text is supported
- Moderation actions (mute, ban) are session-scoped; they do not carry over to other sessions unless account-level bans are configured

## Plan Requirements

| Feature | Basic Plan | Business Plan |
|---------|-----------|---------------|
| Real-time chat | Yes | Yes |
| Send and receive messages | Yes | Yes |
| Chat moderation tools | Basic (mute, delete) | Full (mute, ban, slow mode, clear, pin) |
| Chat commands | Yes | Yes |
| AI Chat Insights | No | Yes |
| Featured comment overlay | Yes | Yes |
| Post-session chat history | Limited | Full |
| Chat export | No | Yes |
| Automated moderation filters | Basic | Advanced |
| Profanity filter | Yes | Yes |

## Related Documents

- [00-index.md](00-index.md) -- Knowledge base index
- [10-studio-elements.md](10-studio-elements.md) -- Studio elements (poll element for audience interaction)
- [12-studio-polls-qa.md](12-studio-polls-qa.md) -- Polls and Q&A (complementary audience engagement)
- [14-studio-overlays-scenes.md](14-studio-overlays-scenes.md) -- Overlays system (FeaturedCommentOverlay details)
- [15-studio-streaming.md](15-studio-streaming.md) -- Streaming (how chat overlays appear on streams)
