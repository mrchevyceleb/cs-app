# Studio Polls and Q&A System

## Overview

The R-Link Studio Polls and Q&A system provides interactive audience engagement tools that allow hosts to collect feedback, gauge opinions, and manage audience questions during live sessions. The Polls system uses `PollModal` for creation and configuration, `PollStageRenderer` for displaying polls on the live stage, and supports a `showQuickPoll` state for rapid poll creation. The Q&A system provides a dedicated panel (`showQAPanel`) where attendees submit questions, hosts review and select them, and the `QADisplayOverlay` renders selected questions on the live stage via the `displayedQuestion` state. Both systems are available across Meeting, Webinar, and Live Stream session types and integrate with the broader overlay and streaming systems.

## Polls System

### Components

| Component | Purpose |
|-----------|---------|
| `PollModal` | Create and configure polls with questions and answer options |
| `PollStageRenderer` | Render the active poll on the live stage with real-time results |
| `showQuickPoll` state | Toggle for the quick poll creation interface |

### Creating a Poll

#### Standard Poll Creation
1. Open the **Polls** section in the Studio sidebar or toolbar
2. Click **"Create Poll"** to open the `PollModal`
3. Configure the poll:
   - **Question:** Enter the poll question text
   - **Answer options:** Add two or more answer choices
   - **Poll type:** Select the type (multiple choice, single choice, rating, etc.)
   - **Display settings:** Configure how results are shown (bar chart, percentages, etc.)
   - **Duration:** Optionally set a time limit for the poll
4. Click **"Save"** to create the poll (it is not yet active on stage)
5. The poll appears in your polls library, ready to be activated

#### Quick Poll Creation
1. The `showQuickPoll` state controls the visibility of a streamlined poll creation interface
2. Toggle `showQuickPoll` to `true` to open the quick poll panel
3. The quick poll interface provides a simplified form:
   - Enter a question
   - Add 2-4 quick answer options
   - No advanced configuration required
4. Submit to immediately create and activate the poll on stage
5. Quick polls are designed for spontaneous audience engagement without pre-planning

### Activating a Poll
1. Navigate to your polls library in the Studio
2. Select the poll you want to display
3. Click **"Activate"** or **"Launch Poll"**
4. The poll is added to the active elements: `activeElements['poll'] = pollElement`
5. The `PollStageRenderer` begins rendering the poll on the live stage
6. Attendees see the poll on their screens and can submit their responses
7. The poll is also visible on any active streams via the stream overlay

### Poll Stage Rendering
The `PollStageRenderer` component handles the on-stage display of active polls:
- Displays the poll question prominently
- Shows answer options with response buttons for attendees
- Updates results in real-time as votes come in
- Can display results as bar charts, pie charts, or percentage values
- Styling matches the session's visual theme

### Viewing Poll Results
1. While a poll is active, real-time results are visible to the host in the Studio
2. Results update live as attendees submit their responses
3. Hosts can choose whether to show or hide results from attendees:
   - **Show results:** Attendees see the vote distribution in real-time
   - **Hide results:** Attendees only see their own vote; results are revealed later
4. After closing the poll, final results are displayed on stage and saved

### Closing and Deactivating a Poll
1. Click **"Close Poll"** to stop accepting new responses
2. Final results are displayed on stage
3. Click **"Deactivate"** or **"Remove from Stage"** to clear the poll from the live stage
4. The poll element is removed from `activeElements['poll']`
5. The `PollStageRenderer` is unmounted
6. Poll results remain saved for post-session review

### Poll Lifecycle
```
Create Poll (PollModal) --> Save to Library --> Activate on Stage --> Attendees Vote -->
    Real-time Results --> Close Poll --> Display Final Results --> Deactivate from Stage
```

### Quick Poll Lifecycle
```
Toggle showQuickPoll --> Enter Question + Options --> Submit --> Immediately Active on Stage -->
    Attendees Vote --> Close --> Deactivate
```

## Q&A System

### Components

| Component | Purpose |
|-----------|---------|
| `showQAPanel` state | Toggle for the Q&A panel visibility in the Studio |
| `displayedQuestion` state | The currently selected question displayed on stage |
| `QADisplayOverlay` | Render the displayed question on the live stage |

### Enabling the Q&A Panel
1. In the Studio sidebar, look for the **Q&A** section or toggle
2. Set `showQAPanel` to `true` to open the Q&A panel
3. The Q&A panel appears in the Studio interface, showing submitted questions
4. Attendees see a Q&A submission interface where they can type and submit questions

### Submitting Questions (Attendee Perspective)
1. Open the Q&A section in the session viewer
2. Type a question in the input field
3. Submit the question
4. The question appears in the host's Q&A panel for review
5. Optionally, attendees can upvote other attendees' questions to signal popularity

### Managing Questions (Host Perspective)
1. Open the Q&A panel (`showQAPanel: true`) in the Studio
2. Browse incoming questions from attendees
3. Questions may be sorted by:
   - **Time submitted:** Newest or oldest first
   - **Popularity:** Most upvoted questions first
   - **Status:** Unanswered, answered, dismissed
4. For each question, hosts can:
   - **Display on stage:** Select the question to show on the live stage via `QADisplayOverlay`
   - **Answer privately:** Send a text response visible only to the question asker
   - **Answer live:** Verbally address the question during the session
   - **Dismiss:** Remove the question from the active queue
   - **Mark as answered:** Flag the question as addressed

### Displaying a Question on Stage
1. In the Q&A panel, find the question you want to highlight
2. Click **"Display on Stage"** (or the stage icon)
3. The `displayedQuestion` state is set to the selected question object
4. The `QADisplayOverlay` component renders the question on the live stage:
   - Shows the question text
   - Displays the asker's name (or "Anonymous" if anonymous submission is enabled)
   - Styled as a prominent overlay visible to all participants and stream viewers
5. The displayed question remains on stage until manually removed or replaced

### Removing a Question from Stage
1. In the Q&A panel, click **"Hide from Stage"** on the currently displayed question
2. Or, display a different question (which replaces the current one)
3. The `displayedQuestion` state is set to `null` (or the new question object)
4. The `QADisplayOverlay` is cleared or updated

### Q&A on Stream
- When a question is displayed via `QADisplayOverlay`, it appears as part of the stream output
- External viewers on YouTube, Facebook, Twitch, etc., see the question as a visual overlay burned into the video
- The overlay is also captured in recordings

### Q&A Workflow
```
Attendee Submits Question --> Question Appears in Host Q&A Panel --> Host Reviews -->
    Display on Stage (QADisplayOverlay) --> Answer Live --> Mark as Answered -->
    Remove from Stage
```

## Polls and Q&A Together

### Complementary Usage
Polls and Q&A are complementary engagement tools often used together:
- Use **polls** for structured, quantitative feedback (yes/no, multiple choice, ratings)
- Use **Q&A** for open-ended, qualitative interaction (questions, discussion topics)
- Both can be active simultaneously -- a poll can be running on stage while the Q&A panel collects questions

### Combined Workflow Example
1. Start a session with a welcome poll ("What topic interests you most?")
2. Open the Q&A panel to collect questions throughout the session
3. Use quick polls for impromptu audience checks during the presentation
4. Display popular Q&A questions on stage during the Q&A segment
5. Close with a feedback poll ("How would you rate this session?")

## Settings and Options

| Setting | Description | Default |
|---------|-------------|---------|
| `showQuickPoll` | Toggle quick poll creation interface | `false` |
| `showQAPanel` | Toggle Q&A panel visibility | `false` |
| `displayedQuestion` | Currently displayed Q&A question on stage | `null` |
| Poll type | Kind of poll (single choice, multiple choice, etc.) | Single choice |
| Poll duration | Time limit for responses | No limit |
| Results visibility | Whether attendees see real-time results | Host-controlled |
| Anonymous Q&A | Allow anonymous question submissions | Disabled |
| Q&A moderation | Host must approve questions before display | Enabled |
| Question upvoting | Allow attendees to upvote questions | Enabled |

## Troubleshooting

### Poll not appearing on stage
1. Verify the poll has been **activated**, not just created -- created polls sit in the library until activated
2. Check that no other poll is already active (`activeElements['poll']` can only hold one poll at a time)
3. Ensure the `PollStageRenderer` is not blocked by another overlay
4. Refresh the Studio page and try activating again
5. Confirm the poll has at least a question and two answer options

### Attendees cannot see the poll
1. Verify the poll is activated on stage (check the host's active elements panel)
2. Check that the session is in progress and attendees are connected
3. If streaming, verify the poll overlay is being rendered on the stream output
4. Ask an attendee to refresh their viewer page

### Quick poll not opening
1. Check that `showQuickPoll` is toggled to `true`
2. Verify no other modal or panel is blocking the quick poll interface
3. Try toggling `showQuickPoll` off and on again
4. Refresh the Studio page

### Poll results not updating
1. Verify attendees are actually submitting votes (check vote count)
2. Check the network connection -- real-time updates require an active connection
3. The `PollStageRenderer` should update automatically; try refreshing if it appears stuck
4. If results visibility is set to "hidden," the host still sees results but attendees do not

### Q&A panel not showing questions
1. Confirm `showQAPanel` is `true`
2. Verify attendees have actually submitted questions
3. Check if Q&A moderation is enabled -- questions may be pending approval
4. Ensure the Q&A panel is not filtered to only show "answered" questions (showing no unanswered ones)
5. Refresh the Q&A panel

### Question not displaying on stage (QADisplayOverlay)
1. Check that `displayedQuestion` is set (not `null`)
2. Verify the question was selected via the "Display on Stage" action
3. Ensure no other overlay is covering the `QADisplayOverlay` area
4. If streaming, verify the overlay appears in the stream output
5. Try selecting a different question to see if the overlay activates

### Attendees cannot submit questions
1. Verify the Q&A feature is enabled for the session
2. Check that the attendee's connection is active
3. If anonymous submission is disabled, attendees may need to be signed in
4. Verify the session is still active (Q&A may close when the session ends)

## FAQ

**Q: Can I run a poll and display a Q&A question at the same time?**
A: Yes. Polls and Q&A overlays are independent and can both be active simultaneously. The `PollStageRenderer` and `QADisplayOverlay` render in different areas of the stage. However, be mindful that too many overlays can clutter the stage.

**Q: How many polls can I create per session?**
A: There is no limit on the number of polls you can create and save to your library. However, only one poll can be active on stage at a time. Activate polls sequentially as needed.

**Q: Can attendees see each other's questions in Q&A?**
A: This depends on the Q&A configuration. In some modes, all submitted questions are visible to all attendees; in others, only the host sees the questions. The `QADisplayOverlay` makes a selected question visible to everyone when it is displayed on stage.

**Q: What is the difference between a standard poll and a quick poll?**
A: A standard poll is created through the `PollModal` with full configuration options (multiple types, duration, display settings) and saved to a library for later activation. A quick poll uses the `showQuickPoll` interface for rapid creation with minimal options and is immediately activated on stage -- ideal for spontaneous audience engagement.

**Q: Can I export poll results?**
A: Poll results are saved within the session data. Export capabilities depend on your plan tier. Business plans typically include the ability to download poll results as part of post-session analytics.

**Q: Are Q&A questions saved after the session?**
A: Yes, Q&A questions and their statuses (answered, dismissed) are saved with the session data. Post-session access depends on your plan tier.

**Q: Can I pre-create polls before a session starts?**
A: Yes. Polls can be created in advance through the `PollModal` and saved to the polls library. During the session, you simply activate the pre-created poll without needing to configure it live.

**Q: How does question upvoting work?**
A: When enabled, attendees can click an upvote button on other attendees' questions. Questions with more upvotes rise in the host's Q&A panel, helping hosts identify the most popular questions. Only one upvote per attendee per question is allowed.

**Q: Can anonymous questions be submitted?**
A: When anonymous Q&A is enabled in settings, attendees can submit questions without their name attached. The host sees the question as "Anonymous." This can encourage more candid questions from the audience.

**Q: Do polls and Q&A appear on external streams?**
A: Yes. Both the `PollStageRenderer` and `QADisplayOverlay` are rendered as part of the stream output. Viewers on YouTube, Facebook, Twitch, and other platforms see the poll or question as a visual overlay burned into the video feed.

## Known Limitations

- Only one poll can be active on stage at a time (`activeElements['poll']` holds a single poll)
- Only one Q&A question can be displayed on stage at a time (`displayedQuestion` holds a single question)
- Quick polls have limited configuration compared to standard polls (no duration, limited types)
- Poll results are shown in the `PollStageRenderer` format; custom result visualizations are not supported
- Q&A does not support threaded replies or follow-up questions to displayed questions
- Upvoting is binary (upvote/no upvote); there is no downvote option
- The `QADisplayOverlay` has a fixed display style; custom styling for displayed questions is limited
- Polls cannot be edited once activated on stage; they must be deactivated, edited in the library, and reactivated
- Q&A panel sorting options are limited to time, popularity, and status; custom sorting is not available
- There is no automatic poll rotation (displaying one poll after another on a timer); each poll must be manually activated
- Q&A questions cannot be merged or grouped, even if they ask similar things

## Plan Requirements

| Feature | Basic Plan | Business Plan |
|---------|-----------|---------------|
| Create polls (PollModal) | Yes | Yes |
| Quick polls (showQuickPoll) | Yes | Yes |
| PollStageRenderer (on-stage display) | Yes | Yes |
| Poll results (real-time) | Yes | Yes |
| Poll export/download | No | Yes |
| Q&A panel (showQAPanel) | Yes | Yes |
| QADisplayOverlay (on-stage display) | Yes | Yes |
| Anonymous Q&A | No | Yes |
| Question upvoting | Yes | Yes |
| Q&A moderation tools | Basic | Advanced |
| Post-session poll/Q&A data access | Limited | Full |
| Poll types (single choice, multiple, rating) | Single choice only | All types |
| Poll duration/timer | No | Yes |
| Number of polls per session | Limited | Unlimited |

## Related Documents

- [00-index.md](00-index.md) -- Knowledge base index
- [10-studio-elements.md](10-studio-elements.md) -- Studio elements system (poll element details)
- [13-studio-chat.md](13-studio-chat.md) -- Chat system (complementary engagement tool)
- [14-studio-overlays-scenes.md](14-studio-overlays-scenes.md) -- Overlays and scenes (QADisplayOverlay details)
- [15-studio-streaming.md](15-studio-streaming.md) -- Streaming (polls/Q&A on stream)
- [16-studio-recording.md](16-studio-recording.md) -- Recording (polls/Q&A captured in recordings)
