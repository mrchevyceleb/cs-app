# 19 - Studio Reactions & Engagement

## Overview

R-Link Studio includes a comprehensive engagement system that enables real-time participant interaction through reactions, hand raising, BRB (Be Right Back) status, rewards, and a leaderboard. These features are designed to keep participants actively engaged during live sessions and provide hosts with visibility into audience sentiment and participation levels. The engagement system is powered by the `useEngagement` hook and rendered through the `EffectsOverlay` component.

---

## Table of Contents

1. [Reactions System](#reactions-system)
2. [Effects Overlay](#effects-overlay)
3. [Raised Hands Queue](#raised-hands-queue)
4. [BRB (Be Right Back)](#brb-be-right-back)
5. [useEngagement Hook](#useengagement-hook)
6. [Rewards](#rewards)
7. [Leaderboard](#leaderboard)
8. [Engagement Configuration](#engagement-configuration)
9. [Common Questions & Troubleshooting](#common-questions--troubleshooting)
10. [Technical Reference](#technical-reference)

---

## Reactions System

### What It Is

The Reactions system allows participants to express themselves during a live session by sending visual reactions (emoji-style animations) that appear on the Studio stage. Reactions are lightweight, non-disruptive, and provide immediate feedback to the host and other participants. They serve as a real-time pulse of audience engagement and sentiment.

### Types of Reactions

There are two categories of reactions:

| Category | Description | Controlled By |
|----------|-------------|---------------|
| **Standard Reactions** | Regular emoji reactions available to all participants when reactions are enabled. These are the default reaction set. | `reactionsEnabled` state property |
| **Boosted Reactions** | Enhanced or premium reactions that have a more prominent visual effect. These are visually larger, animated differently, or include special effects. | `boostedReactionsEnabled` state property |

### How Reactions Work

1. The host enables reactions for the session by setting `reactionsEnabled` to `true`.
2. Participants see a reaction bar or button in their interface.
3. Participants click/tap a reaction to send it.
4. The reaction is broadcast to all participants and displayed on the **EffectsOverlay**.
5. Reactions appear as animated visuals that float or burst across the stage area.
6. The `useEngagement` hook tracks all reactions for analytics and engagement scoring.

### Boosted Reactions

Boosted reactions are a premium tier of reactions that stand out more than standard reactions:

- They are enabled separately via the `boostedReactionsEnabled` property.
- They may require specific conditions (e.g., a certain engagement level, a host trigger, or a paid feature).
- The `useEngagement` hook provides `getTotalBoostedReactions()` to track boosted reaction totals separately.
- Boosted reactions contribute more weight to engagement scoring and leaderboard standings.

### Common Customer Questions

**Q: How do I enable reactions for my session?**
A: Reactions are controlled by the `reactionsEnabled` setting. This can be toggled from the Studio session controls or room settings. When enabled, participants will see reaction options in their interface.

**Q: What is the difference between regular and boosted reactions?**
A: Regular reactions are standard emoji-style reactions available to all participants. Boosted reactions are enhanced reactions with more prominent visual effects. Boosted reactions are controlled by a separate `boostedReactionsEnabled` setting and may have additional requirements.

**Q: Participants say they cannot see the reaction buttons.**
A: Check that `reactionsEnabled` is set to `true` for the session. If participants are on a mobile device or have a very small screen, the reaction controls may be in a collapsed menu. Ask them to look for an engagement or emoji icon in their toolbar.

**Q: Reactions are not appearing on screen.**
A: Troubleshoot:
- Verify that `reactionsEnabled` is true.
- Check the participant's internet connection (reactions require real-time communication).
- Ask the participant to refresh their browser.
- Ensure the **EffectsOverlay** component is not hidden or blocked by another element.

---

## Effects Overlay

### What It Is

The **EffectsOverlay** is the visual rendering layer for all engagement effects in the Studio. It is responsible for displaying reaction animations, visual effects, and any other overlay-based engagement content on the stage area.

### How It Works

- The EffectsOverlay sits as a transparent layer on top of the Studio stage.
- When a reaction or effect is triggered, the overlay renders the corresponding animation.
- Multiple reactions can appear simultaneously from different participants.
- Animations have a lifecycle (appear, animate, fade out) and do not persist on screen.
- The overlay does not interfere with other stage content (video, presentations, etc.).

### Common Customer Questions

**Q: Reaction animations are not showing up even though participants are sending them.**
A: The EffectsOverlay may have rendering issues. Try:
- Refreshing the browser.
- Checking that hardware acceleration is enabled in the browser.
- Trying a different browser (Chrome recommended).
- Clearing the browser cache.

**Q: The reaction animations are causing lag or performance issues.**
A: A high volume of simultaneous reactions can impact performance on lower-end devices. Suggest:
- Closing unnecessary browser tabs.
- Using a device with better graphics capabilities.
- The host can temporarily disable reactions during performance-sensitive portions of the session.

---

## Raised Hands Queue

### What It Is

The **RaisedHandsQueue** is an ordered queue system that allows participants to "raise their hand" to get the host's attention. This is the digital equivalent of raising your hand in a classroom or meeting to indicate you want to speak or ask a question.

### How It Works

1. A participant clicks the "Raise Hand" button in their interface.
2. Their hand raise is added to the **RaisedHandsQueue** in chronological order.
3. The host sees the queue in their participant management panel, showing participants in the order they raised their hands.
4. The host can:
   - **Acknowledge** a hand raise (call on the participant to speak).
   - **Lower** a participant's hand (dismiss the hand raise).
   - **Clear the queue** (lower all hands).
5. When a participant is acknowledged, they can unmute and speak.
6. Participants can also lower their own hand if they no longer need to speak.

### Queue Management

- **First In, First Out**: The queue respects the order in which hands were raised.
- **Visual indicators**: Raised hands appear as icons or badges next to participant names.
- **Count display**: The host can see the total number of raised hands at a glance.
- **Priority**: The host can choose to acknowledge hands out of order if needed (e.g., for follow-up questions or priority speakers).

### Common Customer Questions

**Q: How do I raise my hand?**
A: Look for the "Raise Hand" button in the participant toolbar at the bottom of the Studio interface. Click it once to raise your hand. Click again to lower it.

**Q: I raised my hand but the host has not called on me.**
A: The host sees all raised hands in a queue and works through them in order. Please be patient. If your hand has been raised for a long time, it may also help to mention your question in the chat.

**Q: How does the host see raised hands?**
A: The host has a participant management panel that shows a **RaisedHandsQueue** with all participants who have raised their hands, ordered by time. The host can click on a participant to acknowledge or dismiss their hand raise.

**Q: Can the host disable hand raising?**
A: Hand raising availability is part of the session engagement settings. The host can enable or disable this feature as needed.

---

## BRB (Be Right Back)

### What It Is

The **BRB (Be Right Back)** status is a participant state that indicates the participant is temporarily away from their device or not actively attending the session. This is managed through the `isBRB` property.

### How It Works

1. A participant activates BRB status through their interface controls.
2. The `isBRB` property for that participant is set to `true`.
3. Other participants and the host see a BRB indicator on that participant's video tile or name badge.
4. The participant's video may be replaced with a BRB graphic or dimmed.
5. When the participant returns, they deactivate BRB status, and `isBRB` returns to `false`.

### BRB Behavior

- **Audio**: The participant is automatically muted while BRB is active.
- **Video**: The participant's video feed is replaced with a BRB placeholder or dimmed.
- **Engagement**: BRB participants are excluded from active engagement calculations (they are not counted as disengaged; they are simply marked as away).
- **Reactions**: BRB participants typically cannot send reactions while their status is active.
- **Notifications**: BRB participants may receive a summary of what they missed when they return (depending on session settings).

### Common Customer Questions

**Q: How do I set my status to BRB?**
A: Look for a BRB button or a status menu in the participant toolbar. Click BRB to indicate you are temporarily away. Click it again when you return.

**Q: Other participants can see I am BRB?**
A: Yes. When BRB is active, other participants and the host see a BRB indicator on your video tile. This lets everyone know you are temporarily unavailable.

**Q: I am BRB but I can still hear the session.**
A: BRB mutes your microphone but does not necessarily mute the session audio on your end. You may still hear the session depending on your device and browser settings. If you want to fully step away, you can mute your device or close your laptop.

---

## useEngagement Hook

### What It Is

The `useEngagement` hook is the core data layer for the entire engagement system. It provides methods and data for tracking, querying, and managing participant engagement across the session. It is used internally by Studio components to power reactions, leaderboards, rewards, and engagement analytics.

### Hook Interface

The `useEngagement` hook returns an object with the following properties and methods:

| Property/Method | Type | Description |
|-----------------|------|-------------|
| `engagement` | Object | The current engagement state object containing all tracked engagement data for the session |
| `activeReactions` | Array | List of currently active (visible) reactions that are being displayed on the EffectsOverlay |
| `addReaction(reaction)` | Function | Sends a new reaction. Takes a reaction object and broadcasts it to all participants. |
| `getActiveReactionForUser(userId)` | Function | Returns the currently active reaction for a specific user. Returns null if the user has no active reaction. |
| `getTopParticipants(count)` | Function | Returns an ordered list of the top `count` participants ranked by engagement score. Used by the leaderboard. |
| `getTotalReactions()` | Function | Returns the total number of standard reactions sent during the session. |
| `getTotalBoostedReactions()` | Function | Returns the total number of boosted reactions sent during the session. Tracked separately from standard reactions. |

### Engagement Scoring

The engagement system calculates a score for each participant based on their activity:

- **Reactions sent**: Each reaction adds to the participant's engagement score.
- **Boosted reactions**: Boosted reactions contribute a higher weight to the engagement score.
- **Hand raises**: Raising a hand and being acknowledged adds to engagement.
- **Chat messages**: Active chat participation contributes to engagement.
- **Time present**: Duration of active participation (excluding BRB time) is factored in.

### How Components Use the Hook

- **EffectsOverlay**: Uses `activeReactions` to render current reaction animations.
- **Leaderboard**: Uses `getTopParticipants()` to display the ranking.
- **RewardsPanel**: Uses engagement data to determine reward eligibility.
- **Analytics**: Uses `getTotalReactions()` and `getTotalBoostedReactions()` for session summaries.
- **Individual tracking**: Uses `getActiveReactionForUser()` to show reaction badges next to participant names.

### Common Customer Questions

**Q: How is the engagement score calculated?**
A: Engagement is calculated based on a combination of reactions sent, chat messages, hand raises, and active participation time. Boosted reactions contribute more than standard reactions.

**Q: Where can I see engagement data for my session?**
A: Hosts can view engagement data in real time during the session (via the leaderboard and engagement panels) and in post-session analytics.

**Q: Is engagement data saved after the session ends?**
A: Yes. Engagement data is persisted and available in post-session analytics and reports.

---

## Rewards

### What It Is

The Rewards system allows hosts to recognize and reward participant engagement during a live session. Rewards are managed through the **RewardsPanel** and are backed by the **Reward entity**.

### Reward Entity

The Reward entity is the core data structure for rewards. It is polled every **3 seconds** to ensure real-time updates:

| Property | Description |
|----------|-------------|
| `id` | Unique identifier for the reward |
| `name` | Display name of the reward |
| `description` | Description of what the reward represents |
| `recipient` | The participant who received the reward |
| `display_publicly` | Boolean. When true, the reward is announced to all session participants. When false, only the recipient and host see it. |
| `created_at` | Timestamp when the reward was given |

### Polling Behavior

- The Reward entity is **polled every 3 seconds** to check for new rewards.
- This ensures that rewards appear promptly for all participants without requiring a page refresh.
- The polling mechanism is lightweight and does not significantly impact performance.

### RewardsPanel

The **RewardsPanel** is the host-facing interface for managing rewards:

- **View rewards**: See all rewards given during the session.
- **Give rewards**: Select a participant and give them a reward.
- **Configure visibility**: Set `display_publicly` to control whether the reward is announced to everyone.
- **Reward history**: View the complete list of rewards given during the session.

### Public vs. Private Rewards

| Setting | Behavior |
|---------|----------|
| `display_publicly: true` | The reward is announced to all participants via a notification or announcement. This creates a moment of public recognition. |
| `display_publicly: false` | The reward is visible only to the recipient and the host. This is useful for private acknowledgment or sensitive recognition. |

### Common Customer Questions

**Q: How do I give a reward to a participant?**
A: Open the RewardsPanel from the Studio engagement tools. Select the participant you want to reward, choose or customize the reward, and send it. You can choose whether to make it public or private.

**Q: How quickly do rewards appear?**
A: Rewards are polled every 3 seconds, so they should appear within a few seconds of being given.

**Q: Can participants see all rewards or only their own?**
A: It depends on the `display_publicly` setting. Public rewards are visible to all participants. Private rewards are visible only to the recipient and the host.

**Q: Can I give multiple rewards to the same participant?**
A: Yes. There is no limit on how many rewards a single participant can receive during a session.

**Q: Do rewards affect the leaderboard?**
A: Rewards may contribute to engagement scoring and leaderboard positioning, depending on the session configuration.

---

## Leaderboard

### What It Is

The Leaderboard displays a ranked list of the most engaged participants during the session. It is powered by the `getTopParticipants()` method from the `useEngagement` hook and provides a gamified element to encourage active participation.

### How It Works

1. The engagement system continuously tracks participant activity (reactions, chat, hand raises, time present).
2. Each participant's engagement is scored based on their cumulative activity.
3. The leaderboard displays participants ranked from highest to lowest engagement score.
4. The leaderboard updates in real time as participants interact.
5. The host can display the leaderboard to all participants or keep it visible only to themselves.

### Leaderboard Data

The leaderboard uses `getTopParticipants(count)` which returns:

- **Participant name**: Display name of the participant.
- **Engagement score**: Numeric score reflecting their total engagement.
- **Rank**: Their position on the leaderboard.
- **Activity breakdown**: May include counts of reactions, messages, and other activity types.

### Common Customer Questions

**Q: How is the leaderboard ranking determined?**
A: Rankings are based on engagement scores calculated from reactions sent (standard and boosted), chat messages, hand raises, and active participation time. Higher activity means a higher score and rank.

**Q: Can I show the leaderboard to all participants?**
A: Yes. The host can choose to display the leaderboard to all participants or keep it as a host-only view.

**Q: A participant is gaming the leaderboard by spamming reactions.**
A: The engagement system may include rate limiting for reactions. If a participant is excessively spamming, the host can address it through moderation tools. The engagement algorithm may also cap the contribution of rapid-fire reactions.

**Q: Does the leaderboard persist after the session?**
A: Leaderboard data is included in post-session analytics. The real-time leaderboard is available during the session.

---

## Engagement Configuration

### State Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `reactionsEnabled` | Boolean | Varies | Whether standard reactions are available to participants |
| `boostedReactionsEnabled` | Boolean | Varies | Whether boosted (premium) reactions are available |
| `isBRB` | Boolean | false | Per-participant BRB status (per user, not global) |

### Enabling/Disabling Features

The host can toggle engagement features from the Studio session controls:

- **Reactions**: Toggle `reactionsEnabled` to allow or prevent participants from sending reactions.
- **Boosted Reactions**: Toggle `boostedReactionsEnabled` independently from standard reactions.
- **Hand Raising**: Can be enabled or disabled from the session engagement settings.
- **Leaderboard Visibility**: Can be shown to all or host-only.
- **Rewards**: Available through the RewardsPanel when engagement features are active.

### Best Practices for Hosts

- **Enable reactions** for casual, high-energy sessions (webinars, product launches, entertainment).
- **Disable reactions** for formal sessions where reactions might be distracting (board meetings, compliance training).
- **Use the leaderboard** to gamify participation in workshops and training sessions.
- **Give public rewards** to recognize standout participants and encourage others.
- **Monitor the hand raise queue** regularly to ensure participants feel heard.

---

## Common Questions & Troubleshooting

### General Engagement Issues

**Q: None of the engagement features are showing for participants.**
A: Verify that engagement features are enabled in the session/room settings. The host must ensure that `reactionsEnabled` and other engagement toggles are active. Also check that the participant is not in BRB mode.

**Q: The engagement features are causing the session to lag.**
A: A very high volume of reactions or engagement activity can impact performance. Steps to mitigate:
- The host can temporarily disable reactions during performance-sensitive segments.
- Participants should close unnecessary browser tabs and applications.
- Use Chrome or Edge for best performance.
- Ensure a stable internet connection.

**Q: Engagement data seems incorrect or not updating.**
A: The engagement system relies on real-time communication. If data is not updating:
- Check the participant's internet connection.
- Refresh the browser.
- The Reward entity polls every 3 seconds; allow a few seconds for updates.
- If the issue persists, collect details and escalate to the engineering team.

**Q: Can I export engagement data?**
A: Engagement data is available in post-session analytics. Check the session reports section of the host dashboard for export options.

---

## Technical Reference

### Components Map

| Component | Location | Purpose |
|-----------|----------|---------|
| EffectsOverlay | `studio/effects/EffectsOverlay` | Renders reaction animations and visual effects |
| RaisedHandsQueue | `studio/engagement/RaisedHandsQueue` | Manages and displays the hand raise queue |
| RewardsPanel | `studio/engagement/RewardsPanel` | Host interface for managing rewards |

### Hook Reference

| Hook | Returns | Purpose |
|------|---------|---------|
| `useEngagement` | `{ engagement, activeReactions, addReaction, getActiveReactionForUser, getTopParticipants, getTotalReactions, getTotalBoostedReactions }` | Core engagement data and methods |

### Key State Properties

| Property | Type | Scope | Description |
|----------|------|-------|-------------|
| `reactionsEnabled` | Boolean | Session | Enables/disables standard reactions |
| `boostedReactionsEnabled` | Boolean | Session | Enables/disables boosted reactions |
| `isBRB` | Boolean | Per-user | Participant's BRB status |
| `engagement` | Object | Session | Full engagement state |
| `activeReactions` | Array | Session | Currently animating reactions |

### Entity Reference

| Entity | Polling Interval | Key Fields |
|--------|-----------------|------------|
| Reward | 3 seconds | id, name, description, recipient, display_publicly, created_at |

### Methods Reference

| Method | Input | Output | Description |
|--------|-------|--------|-------------|
| `addReaction(reaction)` | Reaction object | void | Broadcasts a reaction to all participants |
| `getActiveReactionForUser(userId)` | User ID string | Reaction or null | Gets the current active reaction for a user |
| `getTopParticipants(count)` | Number | Array of participants | Returns top N participants by engagement score |
| `getTotalReactions()` | None | Number | Total standard reactions in session |
| `getTotalBoostedReactions()` | None | Number | Total boosted reactions in session |

---

*Last updated: 2026-01-29 | R-Link Customer Service Knowledge Base*
