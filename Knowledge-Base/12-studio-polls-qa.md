# 12 - Studio Polls and Q&A

## Overview

The R-Link Studio Polls and Q&A system provides interactive audience engagement tools during live sessions. Polls allow hosts to collect real-time audience feedback through multiple-choice, yes/no, or multi-answer questions. Q&A enables structured audience questions with upvoting, moderation, display on stage, answer tracking, and private follow-up messaging. Both systems integrate with the stage overlay system, the element activation model, and chat commands.

---

## Accessing Polls and Q&A

1. Enter any R-Link Studio session.
2. **Polls:**
   - Create poll elements via the **Elements Tab** (left sidebar) -- "Add Element" > "Poll".
   - Use the **Quick Poll** feature from the bottom controls (`showQuickPoll` toggle).
   - Activate polls via the `PollModal` component for configuration or direct activation.
3. **Q&A:**
   - Toggle the Q&A panel via the `showQAPanel` state.
   - Access from the **Right Sidebar** or dedicated Q&A button.
   - Display questions on stage via the `QADisplayOverlay` component.

---

## Polls

### Poll Element Creation

Polls are a standard element type (`type: 'poll'`) managed through the Elements system.

#### Creating a Poll Element

1. Open the **Elements Tab** in the left sidebar.
2. Click **Add Element**.
3. Select **Poll** from the dropdown.
4. The poll is created with default values in the first available folder:
   - `type: 'poll'`
   - `name: 'New Poll'`
   - `data: {}` (empty -- must be configured before activation)
5. Click the three-dot menu and select **Edit** to configure the poll via `PollModal`.

#### PollModal Configuration

The `PollModal` provides the poll creation and editing interface with these fields:

##### Question Settings

| Field | Type | Description |
|-------|------|-------------|
| `question` | string | The poll question text |
| `poll_type` | string | `'multiple_choice'`, `'yes_no'`, or `'multiple_answer'` |
| `options` | array | List of answer options (for multiple choice and multiple answer) |

##### Options Array

Each option in the `options` array contains:

| Field | Type | Description |
|-------|------|-------------|
| `text` | string | Display text for the option |
| `color` | string | Hex color for the option indicator dot |
| `votes` | number | Current vote count (starts at 0) |

##### Appearance Settings

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `position` | string | `'bottom_center'` | Where the poll appears on stage |
| `size` | string | `'medium'` | Poll widget size |
| `background_color` | string | `'#001233ee'` | Poll background color with alpha |
| `accent_color` | string | `'#6a1fbf'` | Selection highlight color |
| `border_enabled` | boolean | true | Show/hide border around the poll |

##### Position Options

| Position | CSS Classes | Description |
|----------|------------|-------------|
| `bottom_center` | `bottom-20 left-1/2 -translate-x-1/2` | Centered at the bottom of the stage |
| `bottom_left` | `bottom-20 left-4` | Bottom-left corner |
| `bottom_right` | `bottom-20 right-4` | Bottom-right corner |
| `side_panel` | `top-20 right-4` | Right side panel position |
| `fullscreen` | `inset-4 flex items-center justify-center` | Centered overlay covering most of the stage |

##### Size Options

| Size | CSS Width | Description |
|------|-----------|-------------|
| `small` | `w-72` (288px) | Compact poll widget |
| `medium` | `w-96` (384px) | Standard poll widget |
| `large` | `w-[500px]` | Large poll widget for detailed options |

##### Results Settings

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `show_immediately` | boolean | true | Show results right after voting. If false, results are hidden until the host reveals them. |

---

### Poll Types

#### Multiple Choice (`multiple_choice`)

- Viewers select **one option** from the list.
- Displays radio-button-style options.
- After voting, the selected option is highlighted with a checkmark.
- If `results_settings.show_immediately` is true, progress bars with percentages appear.

#### Yes/No (`yes_no`)

- Binary choice poll with two predefined options.
- **Yes** -- Green color (`#00c853`).
- **No** -- Red color (`#ff6b6b`).
- Options are always "Yes" and "No" regardless of what `options` array contains.
- Simpler layout for quick audience sentiment checks.

#### Multiple Answer (`multiple_answer`)

- Viewers can select **multiple options** ("Select all that apply").
- Same visual layout as multiple choice but allows multi-selection.
- Instruction text reads "Select all that apply" instead of "Select one option."

---

### PollStageRenderer

The `PollStageRenderer` component renders an active poll overlay on the live stage.

#### Component Props

| Prop | Type | Description |
|------|------|-------------|
| `poll` | object | Poll data (from element or quick poll) |
| `onPollEnd` | function | Callback when the host closes the poll |
| `isHost` | boolean | Whether the current user is the host (controls close button visibility) |

#### Rendering Structure

1. **Container:** Animated div with position and size based on appearance settings.
2. **Header:** Poll question in bold white text + close button (host-only).
3. **Options list:** Scrollable list (max height 400px) of clickable option buttons.
4. **Footer:** "Thank you for voting!" (after voting) or total vote count (before voting).

#### Voting Behavior

1. Viewer clicks an option button.
2. `selectedOption` is set to the clicked option index.
3. `hasVoted` is set to true.
4. The option highlights with a purple border and checkmark icon.
5. All options become disabled (cursor changes to default).
6. If `show_immediately` is true:
   - A gradient progress bar fills to the percentage width behind each option.
   - Vote count and percentage display on the right side of each option.
7. The footer changes from the vote count to "Thank you for voting!"

#### Host Controls

- Only the host sees the close button (X icon) in the poll header.
- Clicking close calls `onPollEnd()` with a stopPropagation to prevent accidental clicks.
- The poll overlay animates out when removed.

---

### Quick Poll (`showQuickPoll`)

The Quick Poll feature provides a streamlined way to create and launch polls without going through the full element system.

#### Flow

1. Toggle `showQuickPoll` from the bottom controls.
2. A simplified poll creation interface appears.
3. Enter a question and options.
4. Click "Launch" to immediately display the poll on stage.
5. The poll uses the `PollStageRenderer` for display.
6. Quick polls are temporary and are not saved as persistent elements.

#### Differences from Standard Polls

| Feature | Standard Poll (Element) | Quick Poll |
|---------|------------------------|------------|
| Persistence | Saved as element, reusable | Temporary, single use |
| Configuration | Full PollModal with all settings | Simplified quick form |
| Folder storage | Stored in element folder | Not stored |
| Activation | Via element card click | Via quick poll toggle |
| Customization | Full appearance settings | Default appearance |

---

### Poll Results

#### Real-Time Results (show_immediately)

When `results_settings.show_immediately` is true:

- After a viewer votes, all options show:
  - Colored gradient progress bar (proportional to vote percentage).
  - Text showing "[N] votes" on the right.
  - Bold percentage text (e.g., "67%") on the far right.
- Total votes are calculated as the sum of all `option.votes` values.
- Percentage is calculated as: `Math.round((option.votes / totalVotes) * 100)`.

#### Delayed Results

When `results_settings.show_immediately` is false:

- After voting, the viewer sees their selected option highlighted.
- No progress bars or percentages are shown.
- The host can reveal results at a later point by toggling the results visibility.

---

## Q&A System

### Q&A Panel

The `QAPanel` component provides the host's Q&A management interface.

#### Component Props

| Prop | Type | Description |
|------|------|-------------|
| `folderId` | string | Folder ID for filtering questions |
| `onDisplayQuestion` | function | Callback to display a question on the stage overlay |

#### WebinarQuestion Entity

Questions are stored as `WebinarQuestion` entities:

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique question identifier |
| `folder_id` | string | Folder/session this question belongs to |
| `question` | string | The question text |
| `asker_name` | string | Display name of the person who asked |
| `asker_email` | string | Email address (optional, used for private messaging) |
| `status` | string | `'pending'`, `'displayed'`, `'answered'` |
| `votes` | number | Upvote count from audience |
| `answer_text` | string | Host's answer (text summary) |
| `answered_at` | datetime | Timestamp when marked as answered |

#### Data Fetching

- Questions are fetched via `base44.entities.WebinarQuestion.filter({ folder_id }, '-votes')`.
- Sorted by votes descending (highest-voted questions appear first).
- **Auto-refresh:** Questions refresh every **5 seconds** (5000ms `refetchInterval`).

---

### Question Filtering

The Q&A Panel provides 3 filter tabs:

| Filter | Criteria | Button Color |
|--------|----------|-------------|
| **Pending** | `status === 'pending'` or `status === 'displayed'` | Purple |
| **Answered** | `status === 'answered'` | Green |
| **All** | No filter (all questions) | Blue |

Each tab displays the count of matching questions in parentheses.

Within each filter, questions are sorted by `votes` descending (most upvoted first).

---

### Question Statistics

The panel header shows aggregate stats:

```
stats = {
  pending: count of (pending + displayed),
  answered: count of answered,
  total: count of all questions
}
```

---

### Question Actions

#### Display on Stage

1. Click the **Display** button (purple, eye icon) on a pending question.
2. The `onDisplayQuestion(question)` callback fires.
3. The question's status is updated to `'displayed'`.
4. The `QADisplayOverlay` renders the question prominently on the stage.

#### Mark as Answered

1. Click the **Mark Answered** button (outline, checkmark icon) on a pending question.
2. The `AnswerModal` opens:
   - Shows the original question and asker name.
   - Provides a text area for the host to type an answer summary (optional).
   - Note: "This will be included in follow-up emails."
3. Click **Mark Answered** to save:
   - `status` updates to `'answered'`.
   - `answered_at` is set to the current timestamp.
   - `answer_text` is set to the provided text (or "Answered during webinar" if left empty).
   - Success toast: "Marked as answered."

#### Private Message

1. Click the **Message** button (outline, mail icon) on any question with an `asker_email`.
2. The `MessageModal` opens:
   - Shows the original question and asker name.
   - Provides a text area for a private response.
3. Click **Send Email**:
   - An email is sent via `base44.integrations.Core.SendEmail`:
     - **To:** `question.asker_email`
     - **Subject:** `Response to your question: [first 50 chars]...`
     - **Body:** Greeting with asker name, original question, host's response, sign-off.
   - Success toast: "Message sent to [asker name]."
   - Failure toast: "Failed to send message."

#### Delete Question

1. Click the **trash icon** button on any question.
2. The question is permanently deleted via `WebinarQuestion.delete(id)`.
3. Success toast: "Question deleted."

---

### Question Upvoting

Audience members can upvote questions to signal interest:

- Each question displays an **upvote button** (arrow-up icon) with the current vote count.
- Vote count appears in bold white text next to the arrow.
- Questions with more votes appear higher in the list (sorted by `-votes`).
- The upvote system helps hosts prioritize which questions to address.

---

### Question Status Lifecycle

Questions progress through these statuses:

```
pending --> displayed --> answered
pending --> answered (skipping display)
```

1. **Pending:** Initial state when a question is submitted by a viewer. Appears in the "Pending" filter tab. Shows Display and Mark Answered buttons.
2. **Displayed:** The question has been shown on the stage overlay via the Display button. Still appears in the "Pending" filter tab. Shows a purple "Displayed" badge with an eye icon.
3. **Answered:** The question has been addressed by the host. Moves to the "Answered" filter tab. Shows a green background tint and green "Answered" badge with the answer date. Displays the answer text in a dark box below the question.

---

### Q&A Display Overlay

The `QADisplayOverlay` component renders selected questions on the live stage.

#### Visual Design

- **Container:** Purple-to-indigo gradient card with purple border accent and backdrop blur.
- **Position:** Fixed at the bottom-center of the viewport, max width 672px.
- **Z-index:** 30 (below other overlays like polls at z-50).

#### Content Layout

| Section | Content |
|---------|---------|
| **Header icon** | Purple circle with MessageSquare icon |
| **Title** | "Question from Audience" in bold white |
| **Asker name** | Light purple text showing the asker's name |
| **Question box** | Dark background box with purple border containing the question text in large white text |
| **Upvotes** | Shows upvote count if > 0 (e.g., "5 upvotes") |
| **Close button** | X button (top-right) for the host to dismiss |

#### Animation

- Slides up from below the viewport (`y: 50` to `y: 0`) with opacity fade.
- Exits by sliding back down.

#### State Management

The Q&A display is controlled by:
- `showQAPanel` -- toggles the management panel visibility.
- `displayedQuestion` -- the currently displayed question on stage (null when no question is shown).
- Setting `displayedQuestion` to a question object renders the `QADisplayOverlay`.
- Setting it to `null` hides the overlay.

---

### Q&A Widget

The `QAWidget` component provides a viewer-facing interface for submitting and upvoting questions:

- Input field for typing new questions.
- List of existing questions with upvote buttons.
- Questions sorted by votes (most popular at top).
- Accessible from the viewer's session interface.

---

## Integration Between Polls and Q&A

### Element System Integration

Both polls and Q&A are accessible through the R-Link Elements system:

| Feature | Element Type | Activation |
|---------|-------------|------------|
| Poll | `poll` | Click element card or activate via `activeElements.poll` |
| Q&A | N/A (panel-based) | Toggle `showQAPanel` or use chat commands |

### Chat Command Integration

Both features can be triggered via chat commands:

| Command | Action |
|---------|--------|
| `!poll` | Display the active poll overlay on stage |
| `!qa` or `!question` | Open the Q&A session panel |

### AI Chat Insights Integration

The AI Chat Insights system monitors chat for Q&A-related keywords and can suggest:
- Launching a poll when pricing questions are frequent.
- Opening Q&A when multiple questions appear.
- Activating relevant elements based on conversation trends.

### Overlay Integration

Both polls and Q&A render as stage overlays:
- **Polls:** `PollStageRenderer` at z-index 50.
- **Q&A:** `QADisplayOverlay` at z-index 30.
- Both are visible in streams and recordings.
- Both support animation (entrance and exit transitions).

---

## Common Troubleshooting

### Q: My poll is not showing on the stage.
**A:** Ensure the poll element is activated (click the poll card in the Elements panel -- it should turn purple). The poll must have a configured `question` and at least 2 options. An unconfigured poll (empty `data`) will not render meaningfully. Edit the poll first via the three-dot menu.

### Q: Viewers cannot see the poll results.
**A:** Check `results_settings.show_immediately` in the poll configuration. If set to false, results are hidden until the host reveals them. Set it to true if you want viewers to see live results after voting.

### Q: The Q&A panel is empty but I know questions were submitted.
**A:** Check the filter tab. You may be viewing "Answered" while pending questions exist in the "Pending" tab. Switch to "All" to see all questions. Also verify the `folderId` matches the session -- questions are filtered by folder.

### Q: Questions are not auto-refreshing.
**A:** The Q&A panel fetches new questions every 5 seconds. If questions are not appearing, verify your network connection and that the `WebinarQuestion` entity queries are completing successfully. Check the browser console for API errors.

### Q: I want to display a question on stage but the Display button is not available.
**A:** The Display button only appears for questions with `status: 'pending'` or `status: 'displayed'`. Questions already marked as "answered" do not show the Display button. If you need to re-display an answered question, you would need to reset its status to pending first.

### Q: The private message feature is not sending emails.
**A:** Private messaging requires the question to have an `asker_email` field. If the asker did not provide an email, the Message button may not appear or will show an error: "No email address for this attendee." Ensure your session registration collects email addresses.

### Q: How do I run sequential polls?
**A:** Create multiple poll elements in your Elements panel, each with different questions and options. Activate the first poll by clicking its card. When finished, click it again to deactivate, then click the next poll element to activate it. Only one poll can be active at a time.

### Q: Can viewers submit questions anonymously?
**A:** Questions include the `asker_name` field from the viewer's profile. Anonymous submission depends on whether the session allows anonymous participation. If the viewer has a display name set, it will appear. The host always sees the asker information in the Q&A panel.

### Q: How do I change the poll position on the stage?
**A:** Edit the poll element (three-dot menu > Edit) and change the `position` setting under Appearance. Options are: bottom center, bottom left, bottom right, side panel, or fullscreen. The change takes effect the next time the poll is activated.

### Q: What is the difference between Quick Poll and a standard poll element?
**A:** Quick Polls are temporary, one-time-use polls launched directly from the bottom controls without being saved as elements. Standard poll elements are persistent, stored in folders, reusable, and fully configurable with appearance and result settings. Use Quick Poll for spontaneous audience checks; use standard polls for planned, branded engagement.

---

## API Reference

### Poll Data Structure

```
{
  question: string,
  poll_type: 'multiple_choice' | 'yes_no' | 'multiple_answer',
  options: [
    { text: string, color: string, votes: number }
  ],
  appearance: {
    position: 'bottom_center' | 'bottom_left' | 'bottom_right' | 'side_panel' | 'fullscreen',
    size: 'small' | 'medium' | 'large',
    background_color: string,
    accent_color: string,
    border_enabled: boolean
  },
  results_settings: {
    show_immediately: boolean
  }
}
```

### WebinarQuestion Entity

```
// Create question (viewer-side)
WebinarQuestion.create({
  folder_id: 'folder_123',
  question: 'What pricing plans are available?',
  asker_name: 'Jane Doe',
  asker_email: 'jane@example.com',
  status: 'pending',
  votes: 0
})

// Update question (host-side)
WebinarQuestion.update(id, {
  status: 'answered',
  answered_at: '2025-03-15T14:30:00Z',
  answer_text: 'We offer three tiers...'
})

// Fetch questions (sorted by votes)
WebinarQuestion.filter({ folder_id: 'folder_123' }, '-votes')

// Delete question
WebinarQuestion.delete(id)
```

### Send Private Message

```
base44.integrations.Core.SendEmail({
  to: 'viewer@example.com',
  subject: 'Response to your question: What pricing plans...',
  body: 'Hi Jane,\n\nThank you for your question: "What pricing plans are available?"\n\n[Host response]\n\nBest regards,\nWebinar Host'
})
```

### Poll Activation

```
// Activate poll (via element system)
activeElements.poll = {
  id: 'elem_456',
  type: 'poll',
  name: 'Audience Survey',
  data: { question: '...', options: [...], ... }
}

// Deactivate poll
delete activeElements.poll
// or: activeElements.poll = null
```

### Q&A Display Control

```
// Show question on stage
displayedQuestion = {
  id: 'q_789',
  question: 'What pricing plans are available?',
  asker_name: 'Jane Doe',
  votes: 5
}

// Hide question from stage
displayedQuestion = null
```

---

## Related Features

- **Elements:** Polls are an element type managed through the element system. See `10-studio-elements.md`.
- **Chat:** Chat commands can trigger poll and Q&A displays. See `13-studio-chat.md`.
- **Overlays and Scenes:** Poll and Q&A overlays render on the stage. See `14-studio-overlays-scenes.md`.
- **Streaming:** Poll and Q&A overlays are visible to stream viewers. See `15-studio-streaming.md`.
- **Recording:** Active polls and Q&A displays are captured in recordings. See `16-studio-recording.md`.
- **Scheduling:** Webinar settings include `allow_q_and_a` and `allow_polls` toggles. See `22-scheduling.md`.
