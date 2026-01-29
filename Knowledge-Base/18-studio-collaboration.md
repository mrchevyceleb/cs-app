# Studio Collaboration Features

## Overview

R-Link's Studio provides a rich set of collaboration tools designed for interactive group work during live sessions. These features enable hosts to divide participants into smaller groups, collaborate visually on whiteboards, prepare in a green room before going live, invite guests into sessions, and broadcast targeted messages. Collaboration features are available across Meeting, Webinar, and Live Stream modes, with certain capacity limits determined by the user's plan (Basic or Business).

---

## Breakout Rooms

### How Breakout Rooms Work

Breakout rooms allow a host to split participants into smaller sub-groups for focused discussion, activities, or workshops. Each breakout room operates as an independent video/audio space within the same session. The host can manage rooms, set timers, broadcast messages to all rooms, and respond to help requests from participants.

**Core Components:**
- **BreakoutRoomsModal** -- The host-facing modal for creating, configuring, and managing breakout rooms.
- **BreakoutTimer** -- A visible countdown timer shown to participants in breakout rooms, indicating how much time remains.
- **BreakoutBroadcastToast** -- A toast notification that appears when the host broadcasts a message to breakout rooms.

**State Management:**
- `showBreakoutModal` -- Controls visibility of the breakout rooms configuration modal.
- `isBreakoutActive` -- Boolean indicating whether breakout rooms are currently in session.
- `breakoutState` -- The full state object containing room assignments, configuration, and status.
- `breakoutBroadcasts` -- Array of broadcast messages sent to breakout rooms.
- `hostCurrentRoom` -- Tracks which breakout room the host is currently visiting.
- `helpRequests` -- Queue of help requests from participants in breakout rooms.

### Step-by-Step: Creating and Managing Breakout Rooms

1. **Open the Breakout Rooms modal:** The host clicks the Breakout Rooms tool in the Studio toolbar, which sets `showBreakoutModal` to `true` and opens the **BreakoutRoomsModal**.
2. **Configure rooms:** The host sets the number of breakout rooms (subject to plan limits), assigns participants manually or uses automatic assignment, and optionally sets a timer duration.
3. **Start breakout sessions:** The host launches the breakout rooms, setting `isBreakoutActive` to `true`. All participants are moved to their assigned rooms.
4. **Monitor rooms:** The host can see the status of all rooms, including participant counts and any active help requests in the `helpRequests` queue.
5. **Visit rooms:** The host can switch between breakout rooms by selecting a room, which updates `hostCurrentRoom`. This allows the host to drop in on any group.
6. **Broadcast to rooms:** The host can send a message to all breakout rooms simultaneously. The message appears as a **BreakoutBroadcastToast** in each room and is recorded in the `breakoutBroadcasts` array.
7. **Handle help requests:** Participants in breakout rooms can request help, which adds an entry to the `helpRequests` queue. The host sees these requests and can visit the requesting room.
8. **End breakout sessions:** When the timer expires or the host manually ends breakout rooms, all participants are returned to the main session and `isBreakoutActive` is set to `false`.

### Breakout Timer

The **BreakoutTimer** displays a countdown visible to all participants in breakout rooms. When the timer reaches zero, participants are automatically returned to the main session. The host can extend or shorten the timer while breakout rooms are active.

### Broadcasting to Breakout Rooms

The host can send messages to all breakout rooms at once:
1. Open the broadcast option within the breakout rooms management panel.
2. Type the message.
3. Send the broadcast, which sets `isSendingBroadcast` to `true` during transmission.
4. All participants in all breakout rooms see the **BreakoutBroadcastToast** with the message.

### Help Requests

Participants in breakout rooms can raise a help request when they need host assistance:
1. The participant clicks the help/request assistance button in their breakout room.
2. A new entry is added to the `helpRequests` queue.
3. The host sees the help request notification in their breakout management panel.
4. The host can navigate to the requesting room by updating `hostCurrentRoom`.

---

## Whiteboard

### How Whiteboard Works

The whiteboard feature provides a shared collaborative canvas that the host can display on the Studio stage. Participants can view the whiteboard in real time, and depending on permissions, may also be able to draw or annotate.

**Core Components:**
- **WhiteboardStageRenderer** -- Renders the whiteboard on the Studio stage for all participants to see.
- `showWhiteboard` -- State toggle controlling whether the whiteboard is visible on the stage.

### Step-by-Step: Using the Whiteboard

1. The host opens the Whiteboard tool from the Studio toolbar.
2. The whiteboard appears on the Studio stage via the **WhiteboardStageRenderer**, with `showWhiteboard` set to `true`.
3. The host (and permitted participants) can draw, write, and annotate on the canvas.
4. All participants see the whiteboard content in real time.
5. The host can hide the whiteboard by toggling `showWhiteboard` to `false`.

---

## Green Room / Setup

### How the Green Room Works

The Green Room (also referred to as the Setup page) provides a pre-session preparation area where the host can configure their audio, video, and session settings before going live. This is the staging area that appears before entering the main Studio session.

### What Hosts Can Do in the Green Room

- Test and configure camera and microphone settings.
- Preview their video feed.
- Review session settings and configuration.
- Prepare materials before starting or joining the live session.
- Ensure everything is working correctly before participants see them.

### Step-by-Step: Using the Green Room

1. When a host navigates to a session, they land on the Green Room/Setup page first.
2. The host reviews and adjusts audio/video settings.
3. The host previews their appearance and tests their devices.
4. When ready, the host clicks to enter the main Studio session.

---

## Guest Invites

### How Guest Invites Work

The Guest Invite feature allows hosts to invite external guests into an active session. This is useful for bringing in speakers, panelists, or collaborators who were not originally part of the session.

**Core Components:**
- **GuestInviteModal** -- The modal for generating and sending guest invite links.
- `showGuestInviteModal` -- State toggle controlling visibility of the guest invite modal.

### Step-by-Step: Inviting a Guest

1. The host clicks the Guest Invite option in the Studio toolbar, setting `showGuestInviteModal` to `true`.
2. The **GuestInviteModal** opens, displaying options for generating an invite link.
3. The host generates an invite link and shares it with the guest (via email, messaging, etc.).
4. The guest clicks the link and is brought into the session.
5. The host can close the modal by setting `showGuestInviteModal` to `false`.

---

## Broadcast Messaging

### How Broadcast Messaging Works

The broadcast messaging system allows hosts to send targeted messages to participants during a session. This is a general-purpose broadcast tool separate from the breakout room broadcasting feature, enabling communication with specific groups or all participants.

**Core Components:**
- **BroadcastModal** -- The host-facing modal for composing and configuring broadcast messages.
- **BroadcastContainer** -- The container component managing active broadcasts.
- `activeBroadcasts` -- State array tracking all currently active broadcast messages.
- `isSendingBroadcast` -- Boolean state indicating a broadcast is in the process of being sent.

**Utility Functions (broadcastUtils):**
- `createBroadcastEvent` -- Creates a new broadcast event with message content and targeting parameters.
- `sendBroadcastMessage` -- Sends the broadcast message to targeted recipients.
- `userIsInBroadcastTarget` -- Checks whether a specific user is in the target audience for a broadcast.

### Step-by-Step: Sending a Broadcast Message

1. The host opens the Broadcast tool from the Studio toolbar.
2. The **BroadcastModal** appears for composing the message.
3. The host writes the message and selects the target audience (all participants, specific groups, or individuals).
4. The host sends the broadcast using `sendBroadcastMessage`, which sets `isSendingBroadcast` to `true` during transmission.
5. A broadcast event is created via `createBroadcastEvent` and added to the `activeBroadcasts` array.
6. Targeted recipients (determined by `userIsInBroadcastTarget`) receive the message.
7. Once sent, `isSendingBroadcast` returns to `false`.

---

## Settings and Options

| Setting | Scope | Description |
|---------|-------|-------------|
| Number of breakout rooms | Per-session | Configured when creating breakout rooms (subject to plan limits) |
| Breakout timer duration | Per-session | Optional countdown timer for breakout room sessions |
| Participant assignment | Per-session | Manual or automatic assignment of participants to breakout rooms |
| Whiteboard visibility | Per-session | Toggle whiteboard on/off via `showWhiteboard` |
| Guest invite links | Per-session | Generated invite URLs for external guests |
| Broadcast targeting | Per-message | All participants, specific groups, or individual users |

---

## Troubleshooting

### Breakout rooms not starting
- Verify the host has not exceeded the plan limit for breakout rooms (Basic: 1 room, Business: unlimited).
- Ensure there are enough participants to populate the configured rooms.
- Check that `isBreakoutActive` is not already `true` (breakout rooms may already be running).

### Participants not moving to breakout rooms
- Confirm the participant has a stable connection to the session.
- Check that the participant was assigned to a room in the `breakoutState` configuration.
- If using automatic assignment, verify the assignment algorithm distributed participants correctly.

### Breakout timer not appearing
- Ensure a timer duration was set during breakout room configuration.
- The **BreakoutTimer** component may not render if the timer duration is zero or unset.

### Whiteboard not displaying
- Verify `showWhiteboard` is set to `true`.
- Check that the **WhiteboardStageRenderer** is not being blocked by another stage element.
- Ensure the whiteboard has not exceeded the plan limit (Basic: 1, Business: unlimited).

### Guest invite link not working
- Verify the link has not expired.
- Ensure the session is still active when the guest attempts to join.
- Check that the guest is using a supported browser.

### Broadcast messages not reaching recipients
- Verify `isSendingBroadcast` transitions back to `false` (indicating successful transmission).
- Check the target audience configuration using `userIsInBroadcastTarget`.
- Ensure participants have an active connection to the session.

### Help requests not appearing
- Confirm `helpRequests` state is being updated when participants submit requests.
- Check that the host's breakout management panel is open and refreshing.

---

## FAQ

**Q: Can I create breakout rooms during a live session?**
A: Yes, breakout rooms can be created and launched at any point during an active session.

**Q: Can participants choose their own breakout room?**
A: This depends on the host's configuration. The host can assign participants manually, use automatic assignment, or potentially allow self-selection depending on the session setup.

**Q: Can I visit multiple breakout rooms without ending the session?**
A: Yes, the host can freely move between breakout rooms by changing the `hostCurrentRoom` value. This does not affect the breakout session or other participants.

**Q: What happens when the breakout timer expires?**
A: All participants are automatically returned to the main session. The `isBreakoutActive` state is set to `false`.

**Q: Can I use the whiteboard and breakout rooms at the same time?**
A: Yes, the whiteboard can be active on the main stage while breakout rooms are in session. However, the whiteboard is displayed on the main stage and may not be visible to participants currently in breakout rooms.

**Q: How many guests can I invite to a session?**
A: The number of guests is subject to the session's overall participant capacity, which depends on the session mode (Meeting, Webinar, or Live Stream) and plan.

**Q: Can I send different broadcast messages to different breakout rooms?**
A: The breakout broadcast feature sends the same message to all breakout rooms. For targeted messaging to specific groups, use the general Broadcast Messaging feature with its targeting capabilities.

---

## Known Limitations

- Basic plan is limited to **1 breakout room** per session.
- Basic plan is limited to **1 whiteboard** per session.
- The green room is for pre-session preparation only; it is not accessible once the host has entered the main session.
- Guest invite links are session-specific and cannot be reused across different sessions.
- Broadcast messages are one-way from the host to participants; participants cannot reply to broadcasts.
- Help requests from breakout rooms are queued and displayed in order; there is no priority system.

---

## Plan Requirements

| Feature | Basic Plan | Business Plan |
|---------|-----------|---------------|
| Breakout Rooms | 1 room | Unlimited rooms |
| Whiteboard | 1 whiteboard | Unlimited whiteboards |
| Green Room / Setup | Available | Available |
| Guest Invites | Available | Available |
| Broadcast Messaging | Available | Available |

---

## Related Documents

- [01 - Platform Overview](01-platform-overview.md) -- General platform capabilities and plan details.
- [17 - Studio Commerce](17-studio-commerce.md) -- Commerce features used during collaborative sessions.
- [19 - Studio Reactions & Engagement](19-studio-reactions-engagement.md) -- Engagement features that complement collaboration.
- [20 - Studio Translation & Captions](20-studio-translation-captions.md) -- Translation tools for multilingual collaboration.
