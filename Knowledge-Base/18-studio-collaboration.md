# 18 - Studio Collaboration Features

## Overview

R-Link Studio provides a rich set of collaboration features that enable hosts to create interactive, multi-participant experiences. These features include Breakout Rooms for small group work, a shared Whiteboard for visual collaboration, a Green Room for pre-show preparation, Guest Invites for bringing external participants on stage, and Broadcast Messaging for host-to-room communication. Together, these tools transform Studio sessions from one-way broadcasts into dynamic collaborative environments.

---

## Table of Contents

1. [Breakout Rooms](#breakout-rooms)
2. [Whiteboard](#whiteboard)
3. [Green Room & Setup](#green-room--setup)
4. [Guest Invites](#guest-invites)
5. [Broadcast Messaging](#broadcast-messaging)
6. [Plan Limits & Feature Access](#plan-limits--feature-access)
7. [Common Questions & Troubleshooting](#common-questions--troubleshooting)
8. [Technical Reference](#technical-reference)

---

## Breakout Rooms

### What It Is

Breakout Rooms allow the host to split a large session into smaller, separate groups for focused discussion, exercises, or collaboration. Participants are moved into isolated "rooms" where they can interact independently, then brought back to the main session when the breakout ends. This is ideal for workshops, training sessions, team meetings, and educational events.

### Key Components

| Component | Purpose |
|-----------|---------|
| **BreakoutRoomsModal** | The main management interface that the host uses to create, configure, assign participants to, and manage breakout rooms. Opens as a modal dialog. |
| **BreakoutTimer** | Displays a countdown timer for the breakout session, visible to both the host and participants. Shows remaining time before participants are returned to the main room. |
| **BroadcastToast** | A toast notification that appears in breakout rooms when the host sends a broadcast message. Ensures the host can communicate important announcements to all breakout rooms simultaneously. |

### Breakout Room States

The breakout rooms system uses several state properties to track the current status:

| State Property | Type | Description |
|----------------|------|-------------|
| `showBreakoutModal` | Boolean | Controls whether the BreakoutRoomsModal is currently visible to the host |
| `isBreakoutActive` | Boolean | Indicates whether a breakout session is currently in progress (participants have been distributed to rooms) |
| `breakoutState` | Object | Contains the full state of the breakout session including room assignments, timer settings, and configuration |
| `breakoutBroadcasts` | Array | List of broadcast messages sent by the host to all breakout rooms during the current session |
| `hostCurrentRoom` | String | Identifier for which breakout room the host is currently visiting. The host can move between rooms to observe or participate. |
| `helpRequests` | Array | List of help requests from breakout room participants. Participants can signal that they need assistance, and the host sees these requests in the management interface. |

### Breakout Room Workflow

1. **Create Breakout Rooms**: The host opens the **BreakoutRoomsModal** from the Studio toolbar or collaboration menu.
2. **Configure Rooms**: The host sets:
   - Number of breakout rooms to create
   - Duration (timer) for the breakout session
   - Participant assignment method (automatic/random or manual)
3. **Assign Participants**: Participants are assigned to rooms either automatically (evenly distributed) or manually (host drags participants to specific rooms).
4. **Start Breakout**: The host launches the breakout session. `isBreakoutActive` becomes `true`. Participants are moved to their assigned rooms. The **BreakoutTimer** begins counting down.
5. **During Breakout**:
   - Participants interact within their breakout rooms (video, audio, chat, and other collaboration tools are available).
   - The host can visit any breakout room by changing their `hostCurrentRoom`.
   - Participants can submit **help requests** if they need the host's attention.
   - The host can send **broadcast messages** to all rooms simultaneously. These appear as **BroadcastToast** notifications.
6. **End Breakout**: The breakout ends when the timer expires or the host manually ends it. All participants are returned to the main session. `isBreakoutActive` becomes `false`.

### Plan Limits for Breakout Rooms

| Plan | Breakout Room Limit |
|------|---------------------|
| **Basic** | 1 breakout room |
| **Business** | Unlimited breakout rooms |

**Important**: On the Basic plan, hosts can only create a single breakout room. This means the session effectively splits into two groups: the main room and one breakout room. For full multi-room breakout functionality (multiple simultaneous breakout rooms), the Business plan is required.

### Help Requests

Participants in breakout rooms can submit help requests to alert the host that they need assistance. When a help request is submitted:

1. The request appears in the host's **BreakoutRoomsModal** management view in the `helpRequests` array.
2. The host can see which room the request came from and which participant sent it.
3. The host can navigate to that room (updating `hostCurrentRoom`) to provide assistance.
4. Help requests can be acknowledged and cleared by the host.

### Broadcast Messages During Breakout

Using the broadcast functionality, the host can send a message to all breakout rooms simultaneously without visiting each room individually:

1. The host composes a message in the BreakoutRoomsModal interface.
2. The message is distributed to all active breakout rooms.
3. The message appears as a **BroadcastToast** notification in each room.
4. All broadcast messages are tracked in the `breakoutBroadcasts` array.

### Common Customer Questions

**Q: How many breakout rooms can I create?**
A: This depends on your plan. Basic plan allows 1 breakout room. Business plan allows unlimited breakout rooms. Upgrade your plan to access more rooms.

**Q: Can participants choose their own breakout room?**
A: Currently, breakout room assignment is managed by the host through automatic (random) or manual assignment. Participants cannot self-select their room.

**Q: What happens when the breakout timer runs out?**
A: All participants are automatically returned to the main session room. The host can also end the breakout manually before the timer expires.

**Q: Can the host join a breakout room?**
A: Yes. The host can visit any breakout room by selecting it in the management interface. The `hostCurrentRoom` state tracks which room the host is currently in. The host can move freely between rooms.

**Q: A participant says they are stuck in a breakout room.**
A: First, check if the breakout session is still active (`isBreakoutActive`). If the breakout has ended but the participant is still seeing a breakout view, ask them to refresh their browser. If the breakout is still active, the host can end it manually to return all participants.

**Q: How do help requests work?**
A: Participants in a breakout room can click a "Request Help" button. This sends a notification to the host's management panel. The host can then visit that breakout room to provide assistance.

**Q: Can I send a message to all breakout rooms at once?**
A: Yes. Use the broadcast feature in the BreakoutRoomsModal to send a message to all rooms. It appears as a BroadcastToast notification in each room.

---

## Whiteboard

### What It Is

The Whiteboard is a shared, interactive canvas that enables real-time visual collaboration during a Studio session. Participants can draw, write, add shapes, and annotate together on a shared surface. This is ideal for brainstorming, diagramming, teaching, and visual problem-solving.

### Plan Limits for Whiteboard

| Plan | Whiteboard Limit |
|------|-----------------|
| **Basic** | 1 whiteboard per room |
| **Business** | Unlimited whiteboards per room |

### Features

- **Real-time collaboration**: All participants see changes as they happen.
- **Drawing tools**: Freehand drawing, lines, shapes (rectangles, circles, arrows), and text.
- **Color and style options**: Multiple colors, line widths, and fill options.
- **Eraser**: Remove specific elements or clear sections.
- **Undo/Redo**: Step back or forward through changes.
- **Zoom and pan**: Navigate large whiteboards.
- **Export**: Save the whiteboard as an image for later reference.

### How It Works

1. The host adds a Whiteboard element to the room (or it may be available by default depending on the plan).
2. During the session, the host opens the whiteboard and optionally allows participant editing.
3. The whiteboard appears on the stage or as a panel.
4. Participants with editing permission can draw and annotate in real time.
5. The host can lock editing at any time to take sole control.

### Common Customer Questions

**Q: Can all participants draw on the whiteboard?**
A: The host controls editing permissions. The host can allow all participants to edit, restrict editing to specific roles, or keep the whiteboard in view-only mode for attendees.

**Q: How many whiteboards can I have?**
A: Basic plan: 1 whiteboard. Business plan: Unlimited whiteboards. Each whiteboard is an independent canvas.

**Q: Can I save the whiteboard content?**
A: Yes. The whiteboard can be exported as an image. The host can save and download the whiteboard content at any time during or after the session.

**Q: The whiteboard is lagging or not updating.**
A: Whiteboard performance depends on the participant's internet connection and device. Recommend:
- Using a wired internet connection if possible.
- Closing unnecessary browser tabs and applications.
- Using Chrome or Edge for best performance.
- If using a mobile device, switching to a desktop/laptop.

---

## Green Room & Setup

### What It Is

The Green Room is a private preparation area where the host and invited guests can gather before a session goes live. It allows the host to test audio/video, coordinate with co-hosts or guests, and prepare the session environment without attendees seeing the preparation.

### How It Works

1. When the host enters the Studio before the session starts, they are in the Green Room by default.
2. The Green Room provides:
   - Audio/video device testing and selection
   - Camera and microphone preview
   - Screen layout and element arrangement
   - Private chat between host and guests
   - Final checklist before going live
3. Guests who have been invited (see [Guest Invites](#guest-invites)) can join the Green Room to prepare alongside the host.
4. When ready, the host "goes live" to open the session to attendees.

### Common Customer Questions

**Q: Can attendees see the Green Room?**
A: No. The Green Room is private and only accessible to the host and invited guests. Attendees do not see anything until the host goes live.

**Q: How long can I stay in the Green Room?**
A: There is no time limit for the Green Room. You can take as long as needed to prepare before going live.

**Q: Can I return to the Green Room during a live session?**
A: The Green Room is a pre-session space. Once the session is live, the host manages the session from the live Studio interface. To make adjustments without attendees seeing, the host can use other tools like muting, camera off, or screen layout changes.

**Q: My audio/video is not working in the Green Room.**
A: Troubleshooting steps:
- Check that the correct microphone and camera are selected in the device settings.
- Ensure the browser has permission to access the camera and microphone.
- Try a different browser or device.
- Check for hardware issues by testing the camera/microphone in another application.

---

## Guest Invites

### What It Is

Guest Invites allow the host to bring external participants onto the Studio stage during a live session. Unlike regular attendees who are viewers, invited guests have on-stage presence with video, audio, and interaction privileges similar to the host. This is essential for interviews, panel discussions, co-hosted events, and expert sessions.

### How It Works

1. The host generates a guest invite link from the Studio interface.
2. The invite link is shared with the guest (via email, chat, or any messaging platform).
3. The guest clicks the link and enters the Green Room or joins the live session directly (depending on timing and host settings).
4. Once the guest joins, they appear on stage with video and audio capabilities.
5. The host can manage guest permissions, mute/unmute guests, and remove guests from the stage.

### Guest Capabilities

- **Video and audio**: Guests have their own video and audio feed on stage.
- **Screen sharing**: Guests can share their screen if permitted by the host.
- **Chat**: Guests can participate in the session chat.
- **Collaboration**: Guests have access to collaboration tools (whiteboard, etc.) based on host settings.

### Common Customer Questions

**Q: How many guests can I invite?**
A: The number of simultaneous on-stage guests depends on your plan and the room configuration. Check your plan details for specific limits.

**Q: Does the guest need an R-Link account?**
A: Guest invite links typically allow the guest to join without needing a full R-Link account. The guest may be prompted to enter a display name.

**Q: The guest's invite link is not working.**
A: Troubleshoot:
- Verify the link has not expired. Generate a new invite link if needed.
- Ensure the guest is using a supported browser (Chrome recommended).
- Check that the session is active and the host is present.
- The guest should clear their browser cache and try again.

**Q: Can I remove a guest from the stage during a live session?**
A: Yes. The host can remove any guest from the stage at any time through the participant management controls.

**Q: Can guests join the Green Room before the session starts?**
A: Yes. Invited guests can join the Green Room to prepare with the host before the session goes live.

---

## Broadcast Messaging

### What It Is

Broadcast Messaging is a host communication tool that allows the host to send messages to all participants across the entire session, including those in breakout rooms. This is powered by the **broadcastUtils** utility module. Broadcast messaging ensures that important announcements reach every participant regardless of their current location in the session.

### Key Utility: broadcastUtils

The `broadcastUtils` module provides the underlying functionality for broadcast messaging. It handles:

- **Message composition**: Creating and formatting broadcast messages.
- **Distribution**: Sending the message to all connected participants across all rooms (main room and breakout rooms).
- **Delivery confirmation**: Tracking that messages were delivered to active participants.
- **Message history**: Maintaining a record of broadcast messages sent during the session.

### How It Works

1. The host accesses the broadcast messaging interface from the Studio toolbar or the BreakoutRoomsModal.
2. The host composes a message.
3. The message is sent via `broadcastUtils` to all participants.
4. In breakout rooms, the message appears as a **BroadcastToast** notification.
5. In the main room, the message appears as a prominent notification or chat message.

### Use Cases

- **Time warnings**: "Breakout session ends in 5 minutes."
- **Instructions**: "Please share your findings when we return to the main room."
- **Announcements**: "We have a special guest joining us in 10 minutes."
- **Technical notices**: "If you are experiencing audio issues, please refresh your browser."

### Common Customer Questions

**Q: Who can send broadcast messages?**
A: Only the host (and co-hosts if applicable) can send broadcast messages. Regular attendees cannot broadcast to all rooms.

**Q: Do broadcast messages appear in the chat history?**
A: Broadcast messages appear as notifications (BroadcastToast) in breakout rooms. In the main room, they appear as highlighted messages. They may also be logged in the session's broadcast history.

**Q: Can I send a broadcast to a specific breakout room only?**
A: Broadcast messaging sends to all rooms. To communicate with a specific room, the host should visit that breakout room directly by changing their `hostCurrentRoom`.

---

## Plan Limits & Feature Access

### Summary of Plan-Based Limits

| Feature | Basic Plan | Business Plan |
|---------|-----------|---------------|
| **Breakout Rooms** | 1 room | Unlimited rooms |
| **Whiteboard** | 1 whiteboard | Unlimited whiteboards |
| **Green Room** | Available | Available |
| **Guest Invites** | Available | Available |
| **Broadcast Messaging** | Available | Available |

### Upgrade Guidance

When a customer encounters a feature limitation:

1. Identify which feature they are trying to use and what limit they are hitting.
2. Confirm their current plan level.
3. Explain the limit for their plan and what the Business plan offers.
4. Direct them to the upgrade page in their account settings or provide the link to the pricing page.

### Common Customer Questions

**Q: I can only create one breakout room. How do I get more?**
A: The Basic plan allows 1 breakout room. Upgrade to the Business plan for unlimited breakout rooms. You can upgrade from your account settings.

**Q: Why can I only have one whiteboard?**
A: The Basic plan includes 1 whiteboard per room. The Business plan offers unlimited whiteboards. Consider upgrading if your use case requires multiple whiteboards.

**Q: All collaboration features seem limited. What plan do I need?**
A: The Business plan provides the most comprehensive collaboration experience with unlimited breakout rooms, unlimited whiteboards, and all other collaboration features. Review the pricing page for full details.

---

## Common Questions & Troubleshooting

### General Collaboration Issues

**Q: Participants cannot see the collaboration tools (whiteboard, breakout rooms, etc.).**
A: Collaboration tools are typically controlled by the host. The host must:
- Enable the relevant features in the room settings.
- Add the appropriate elements to the room.
- Actively trigger the feature (e.g., start breakout rooms, open whiteboard).

**Q: Audio or video quality is poor during collaboration.**
A: Quality issues can be caused by:
- Poor internet connection. Recommend a wired connection or moving closer to the Wi-Fi router.
- Too many participants with video on. Consider reducing video participants or lowering video quality settings.
- Browser performance. Close unnecessary tabs and applications.
- Outdated browser. Ensure the latest version of Chrome, Edge, or Firefox is being used.

**Q: Can collaboration features be used on mobile devices?**
A: Most collaboration features work on mobile browsers, but the experience is optimized for desktop/laptop. Some features (like detailed whiteboard drawing) may be limited on mobile due to screen size and input method. Recommend using a desktop device for the best experience.

**Q: Is there a participant limit for collaboration features?**
A: Participant limits depend on the room configuration and plan. Breakout rooms distribute participants across multiple rooms, so the per-room participant count is lower. Check your plan details for specific participant limits.

---

## Technical Reference

### Components Map

| Component | Location | Purpose |
|-----------|----------|---------|
| BreakoutRoomsModal | `studio/breakout/BreakoutRoomsModal` | Breakout room management interface |
| BreakoutTimer | `studio/breakout/BreakoutTimer` | Countdown timer for breakout sessions |
| BroadcastToast | `studio/breakout/BroadcastToast` | Broadcast message notification display |

### Key State Properties

| Property | Type | Description |
|----------|------|-------------|
| `showBreakoutModal` | Boolean | Whether the breakout management modal is visible |
| `isBreakoutActive` | Boolean | Whether a breakout session is currently active |
| `breakoutState` | Object | Full breakout session state (rooms, assignments, config) |
| `breakoutBroadcasts` | Array | List of broadcast messages sent during the session |
| `hostCurrentRoom` | String | Which breakout room the host is currently in |
| `helpRequests` | Array | Help requests from breakout room participants |

### Utilities

| Utility | Purpose |
|---------|---------|
| `broadcastUtils` | Handles broadcast message composition, distribution, delivery, and history |

### Plan Configuration

```
Plans:
  Basic:
    breakout_rooms: 1
    whiteboards: 1
  Business:
    breakout_rooms: unlimited
    whiteboards: unlimited
```

---

*Last updated: 2026-01-29 | R-Link Customer Service Knowledge Base*
