# Studio Reactions and Engagement

## Overview

R-Link's Studio includes a full engagement system designed to keep participants active, recognized, and motivated during live sessions. The engagement suite encompasses real-time emoji reactions (including boosted reactions), a hand-raise queue, "Be Right Back" (BRB) status indicators, comprehensive engagement tracking via the `useEngagement` hook, leaderboards for gamification, and a rewards system with real-time polling and notifications. These features work across Meeting, Webinar, and Live Stream modes to create dynamic, interactive experiences.

---

## Reactions System

### How Reactions Work

The reactions system allows participants to send real-time emoji reactions that appear as visual effects overlaid on the Studio stage. Reactions provide immediate, lightweight feedback without interrupting the session flow.

**Core Components:**
- **EffectsOverlay** -- The visual layer that renders reaction animations over the Studio stage.
- `activeEffect` -- State tracking the currently displayed reaction effect.
- `reactionsEnabled` -- Boolean toggle that controls whether reactions are available to participants.
- `boostedReactionsEnabled` -- Boolean toggle that controls whether boosted (premium/amplified) reactions are available.

### Standard Reactions

When `reactionsEnabled` is `true`, participants can send emoji reactions that briefly animate on the **EffectsOverlay**. Each reaction triggers an update to the `activeEffect` state and is tracked by the engagement system.

### Boosted Reactions

Boosted reactions are amplified versions of standard reactions that have greater visual impact on the stage. When `boostedReactionsEnabled` is `true`, participants have access to boosted reactions in addition to standard ones. Boosted reactions are tracked separately in the engagement system (see `getTotalBoostedReactions` below).

### Step-by-Step: Sending a Reaction

1. The host ensures `reactionsEnabled` is `true` for the session (and optionally `boostedReactionsEnabled`).
2. A participant clicks a reaction emoji from the reactions panel.
3. The `activeEffect` state is updated with the selected reaction.
4. The **EffectsOverlay** renders the reaction animation on the stage, visible to all participants.
5. The engagement system records the reaction via the `addReaction` method.

### Enabling/Disabling Reactions

The host controls reactions through two independent toggles:
- **reactionsEnabled** -- Master toggle for all reactions. When `false`, no reactions can be sent.
- **boostedReactionsEnabled** -- Secondary toggle for boosted reactions. Only effective when `reactionsEnabled` is also `true`.

---

## Hand Raise

### How Hand Raise Works

The hand raise feature provides an orderly way for participants to signal that they want to speak or ask a question. Raised hands are managed in a queue that the host can review and act upon.

**Core Components:**
- **RaisedHandsQueue** -- The queue management component showing all participants with raised hands in order.
- `isHandRaised` -- Boolean state indicating whether the current user has their hand raised.
- `raisedHands` -- Array state containing all currently raised hands, in the order they were raised.

### Step-by-Step: Raising and Managing Hands

1. A participant clicks the "Raise Hand" button, setting their `isHandRaised` state to `true`.
2. The participant's hand raise is added to the `raisedHands` array.
3. The host sees the **RaisedHandsQueue** component, displaying all raised hands in chronological order.
4. The host can acknowledge a participant by selecting them from the queue (e.g., unmuting them or giving them the floor).
5. Once acknowledged, the participant's hand is lowered (removed from `raisedHands` and `isHandRaised` set to `false`).
6. Participants can also manually lower their own hand at any time.

---

## BRB (Be Right Back) Status

### How BRB Works

The BRB feature allows participants to indicate they are temporarily away from the session without leaving it. This provides a clear visual signal to the host and other participants.

**State:**
- `isBRB` -- Boolean state indicating whether the current user is in BRB mode.

### Step-by-Step: Using BRB

1. A participant toggles BRB on, setting `isBRB` to `true`.
2. Other participants and the host see a visual indicator that the participant is temporarily away.
3. When the participant returns, they toggle BRB off, setting `isBRB` to `false`.

---

## Engagement Tracking

### The useEngagement Hook

The `useEngagement` hook is the central system for tracking and querying participant engagement data in real time. It provides both aggregate statistics and per-participant engagement details.

**Hook Return Values:**

| Property/Method | Type | Description |
|----------------|------|-------------|
| `engagement` | object | The full engagement state object containing all tracked data |
| `activeReactions` | array | List of currently active (visible) reactions on the stage |
| `addReaction` | function | Adds a new reaction to the engagement tracking system |
| `getActiveReactionForUser` | function | Returns the currently active reaction for a specific user (if any) |
| `getTopParticipants` | function | Returns a ranked list of the most engaged participants |
| `getTotalReactions` | function | Returns the total count of all reactions sent during the session |
| `getTotalBoostedReactions` | function | Returns the total count of boosted reactions sent during the session |

### Engagement Data Flow

1. Participants send reactions, raise hands, and interact with session features.
2. Each action is recorded by the `addReaction` method (for reactions) or tracked by the engagement state.
3. The `engagement` object is updated in real time.
4. The host (or engagement-driven features like Leaderboard) can query the data using the provided methods.
5. `getTopParticipants` ranks participants by their total engagement score, factoring in reactions, boosted reactions, and other interactions.

### Using Engagement Data

- **For leaderboards:** Call `getTopParticipants()` to get a ranked list for display.
- **For reaction counts:** Call `getTotalReactions()` for standard reactions and `getTotalBoostedReactions()` for boosted reactions.
- **For per-user data:** Call `getActiveReactionForUser(userId)` to check what reaction a specific participant last sent.
- **For live display:** Read `activeReactions` to get reactions currently animating on stage.

---

## Leaderboard

### How the Leaderboard Works

The leaderboard gamifies session engagement by ranking participants based on their interaction levels. It uses data from the `useEngagement` hook to calculate and display rankings.

**Core Components:**
- **LeaderboardElementModal** -- The host-facing modal for configuring and launching the leaderboard.
- **LeaderboardStageRenderer** -- The stage renderer displaying the leaderboard to all participants.

### Step-by-Step: Using the Leaderboard

1. The host opens the Leaderboard tool from the Studio toolbar.
2. The **LeaderboardElementModal** appears for configuring leaderboard settings (e.g., which engagement metrics to include, display options).
3. The host activates the leaderboard, which renders on the stage via **LeaderboardStageRenderer**.
4. The leaderboard displays participant rankings based on `getTopParticipants()` data.
5. Rankings update in real time as participants continue to engage.
6. The host can hide or remove the leaderboard at any time.

---

## Rewards

### How Rewards Work

The rewards system allows hosts to recognize and reward participants during live sessions. Rewards are polled in real time and can be displayed publicly to all participants.

**Core Components:**
- **RewardsPanel** -- The host-facing panel for managing and issuing rewards.
- `showRewardsPanel` -- State toggle controlling visibility of the rewards panel.
- **RewardNotification** -- The notification component displayed when a reward is issued.

### Reward Entity

Each reward is represented by an entity with the following fields:

| Field | Type | Description |
|-------|------|-------------|
| `room_id` | string | The room/session ID where the reward was issued |
| `display_publicly` | boolean | Whether the reward is visible to all participants or only the recipient |
| `created_date` | datetime | Timestamp of when the reward was created |

### Real-Time Polling

The rewards system uses a polling mechanism that checks for new rewards **every 3 seconds**. This ensures that reward notifications appear promptly after they are issued, without requiring a manual refresh.

### Step-by-Step: Issuing a Reward

1. The host opens the **RewardsPanel** by setting `showRewardsPanel` to `true`.
2. The host selects a participant to reward and configures the reward details.
3. The host sets `display_publicly` to `true` or `false` depending on whether the reward should be visible to everyone.
4. The host issues the reward, creating a new Reward entity.
5. Within 3 seconds (the polling interval), the **RewardNotification** component fires and displays the reward.
6. If `display_publicly` is `true`, all participants see the reward notification. If `false`, only the recipient sees it.

### Public vs. Private Rewards

- **Public rewards** (`display_publicly: true`) -- Visible to all session participants. Great for recognizing top contributors and encouraging engagement.
- **Private rewards** (`display_publicly: false`) -- Visible only to the recipient. Useful for personal recognition without public attention.

---

## Settings and Options

| Setting | Scope | Description |
|---------|-------|-------------|
| `reactionsEnabled` | Per-session | Master toggle for participant reactions |
| `boostedReactionsEnabled` | Per-session | Toggle for boosted/amplified reactions |
| `showRewardsPanel` | Per-session | Toggle for the rewards management panel |
| `display_publicly` (Rewards) | Per-reward | Whether a specific reward is shown to all participants |
| Leaderboard metrics | Per-session | Which engagement metrics are included in the leaderboard ranking |

---

## Troubleshooting

### Reactions not appearing on stage
- Verify `reactionsEnabled` is set to `true`.
- Check that the **EffectsOverlay** is rendering (it should be a top-level layer in the Studio).
- Ensure the participant's connection is stable.

### Boosted reactions not available
- Verify `boostedReactionsEnabled` is set to `true`.
- Ensure `reactionsEnabled` is also `true` (boosted reactions require the master toggle to be on).

### Raised hand not showing in queue
- Verify `isHandRaised` is set to `true` for the participant.
- Check that the `raisedHands` array is updating.
- Ensure the host's **RaisedHandsQueue** component is visible.

### BRB status not showing
- Confirm `isBRB` is set to `true` for the participant.
- Check that the participant's tile/avatar is visible to the host.

### Leaderboard not updating
- Verify the `useEngagement` hook is returning data (check `engagement` object).
- Ensure `getTopParticipants()` is returning a non-empty array.
- Check that participants have actually sent reactions or engaged with tracked features.

### Reward notifications not appearing
- Confirm the Reward entity was created successfully.
- Check the polling mechanism (rewards are polled every 3 seconds, so there may be a brief delay).
- Verify `display_publicly` is set correctly for the intended audience.
- Ensure the **RewardNotification** component is mounted in the UI.

### Engagement data seems incomplete
- The `useEngagement` hook tracks data from the moment it is initialized. Engagement from before the hook was active may not be captured.
- Ensure all participants are connected and their reactions are being transmitted.

---

## FAQ

**Q: What is the difference between standard and boosted reactions?**
A: Standard reactions are regular emoji animations. Boosted reactions are amplified versions with greater visual impact on the stage. They are tracked separately, with `getTotalBoostedReactions()` providing a distinct count.

**Q: Can participants see the leaderboard?**
A: Yes, when the host activates the leaderboard, the **LeaderboardStageRenderer** displays it on the stage for all participants to see.

**Q: How quickly do rewards appear after being issued?**
A: Rewards are polled every 3 seconds, so there may be up to a 3-second delay between issuing a reward and it appearing as a notification.

**Q: Can a participant lower their own raised hand?**
A: Yes, participants can toggle their hand raise off at any time, which removes them from the `raisedHands` queue.

**Q: Does BRB mode mute my audio/video?**
A: BRB mode sets a visual indicator for other participants. Audio/video behavior during BRB depends on the session configuration and may or may not automatically mute.

**Q: How are "top participants" calculated?**
A: The `getTopParticipants()` method from the `useEngagement` hook calculates rankings based on total engagement activity, including reactions, boosted reactions, and other tracked interactions.

**Q: Can I issue multiple rewards to the same participant?**
A: Yes, there is no limit on the number of rewards a single participant can receive during a session.

---

## Known Limitations

- Reaction animations are ephemeral and not persisted after the session ends.
- The hand raise queue is first-come, first-served; there is no priority or categorization system.
- BRB status is a simple toggle with no automatic timeout -- participants must manually turn it off.
- Engagement data is session-scoped and resets for each new session.
- Reward polling at 3-second intervals means there can be a slight delay in notification delivery.
- The leaderboard ranking algorithm is based on available engagement metrics and may not capture all forms of participation (e.g., chat activity may or may not be included).

---

## Plan Requirements

| Feature | Basic Plan | Business Plan |
|---------|-----------|---------------|
| Reactions | Available | Available |
| Boosted Reactions | Available | Available |
| Hand Raise | Available | Available |
| BRB Status | Available | Available |
| Engagement Tracking | Available | Available |
| Leaderboard | Available | Available |
| Rewards | Available | Available |

Reactions and engagement features are available across both plans.

---

## Related Documents

- [01 - Platform Overview](01-platform-overview.md) -- General platform capabilities.
- [17 - Studio Commerce](17-studio-commerce.md) -- Commerce features that benefit from high engagement.
- [18 - Studio Collaboration](18-studio-collaboration.md) -- Collaboration tools used alongside engagement features.
- [20 - Studio Translation & Captions](20-studio-translation-captions.md) -- Accessibility features for inclusive engagement.
