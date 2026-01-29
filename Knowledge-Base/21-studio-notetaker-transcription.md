# 21 - Studio Notetaker & Transcription

## Overview

R-Link Studio includes an AI-powered Notetaker and Transcription system that automatically captures, transcribes, and analyzes meeting content. The Notetaker provides real-time transcription via the LiveTranscript component, intelligent meeting type detection, and comprehensive post-meeting notes through the MeetingNotes page. It supports seven distinct meeting types, each with tailored AI insights, and offers powerful search, filtering, statistics, and export capabilities. The entire system is designed to eliminate the need for manual note-taking and ensure that every meeting produces actionable, organized documentation.

---

## Table of Contents

1. [AI Notetaker](#ai-notetaker)
2. [Meeting Type Detection](#meeting-type-detection)
3. [Live Transcript](#live-transcript)
4. [Meeting Notes Page](#meeting-notes-page)
5. [Meeting Types Reference](#meeting-types-reference)
6. [Stats Cards](#stats-cards)
7. [AI Insights by Meeting Type](#ai-insights-by-meeting-type)
8. [Export Formats](#export-formats)
9. [Entities & Data Models](#entities--data-models)
10. [Common Questions & Troubleshooting](#common-questions--troubleshooting)
11. [Technical Reference](#technical-reference)

---

## AI Notetaker

### What It Is

The AI Notetaker is an automated system that listens to Studio sessions, transcribes the conversation, identifies key points, generates summaries, and produces structured meeting notes. It operates in the background during sessions and produces comprehensive documentation that can be reviewed, searched, and exported after the meeting.

### Configuration Properties

| Property | Type | Description |
|----------|------|-------------|
| `notetakerEnabled` | Boolean | Master toggle for the notetaker feature. When `true`, the notetaker is active and processing audio. |
| `notetakerRecording` | Boolean | Indicates whether the notetaker is currently recording audio/transcript data. Can be `true` even while the notetaker is enabled (it starts recording when the session begins). |
| `showNotetakerInList` | Boolean | Controls whether the notetaker bot appears as a visible participant in the attendee list. When `true`, participants see an "AI Notetaker" entry in the participant list. When `false`, the notetaker operates invisibly. |

### Notetaker Modes

| Property | Values | Description |
|----------|--------|-------------|
| `meetingType` | `auto` or `manual` | Determines how the meeting type is set. In `auto` mode, the system analyzes the conversation and automatically detects the meeting type. In `manual` mode, the host selects the meeting type before or during the session. |

### How the Notetaker Works

1. **Activation**: The host enables the notetaker (`notetakerEnabled: true`) before or at the start of a session.
2. **Recording**: Once the session is active, `notetakerRecording` becomes `true` and the system begins capturing audio.
3. **Transcription**: Audio is processed in real time, producing a text transcript via the **LiveTranscript** component.
4. **Detection**: If `meetingType` is set to `auto`, the system analyzes the conversation content and sets `detectedMeetingType` with a confidence score (`detectedConfidence`).
5. **Processing**: Throughout and after the session, the AI processes the transcript to generate:
   - Summary of key points
   - Action items with priority and assignee
   - Decisions made
   - Insights specific to the detected meeting type
6. **Output**: The processed notes are available on the **MeetingNotes** page.

### Common Customer Questions

**Q: How do I enable the AI Notetaker?**
A: Toggle `notetakerEnabled` to true in your session settings or Studio controls before starting the session. The notetaker will begin recording when the session starts.

**Q: Can participants see the Notetaker in the attendee list?**
A: This is controlled by `showNotetakerInList`. When enabled, an "AI Notetaker" participant appears in the list. When disabled, the notetaker works invisibly in the background.

**Q: Does the Notetaker record the entire session?**
A: Yes, when enabled, the notetaker records from when the session starts until it ends. The `notetakerRecording` property reflects whether recording is currently active.

**Q: Can I start the Notetaker mid-session?**
A: Yes. You can enable the notetaker at any point during the session. However, it will only capture content from the point it was enabled forward. Earlier conversation will not be included.

---

## Meeting Type Detection

### What It Is

Meeting Type Detection is the AI system that analyzes conversation content to automatically classify the meeting into one of seven predefined types. Each meeting type triggers different AI analysis and insight generation.

### Detection Properties

| Property | Type | Description |
|----------|------|-------------|
| `detectedMeetingType` | String (enum) | The meeting type identified by the AI. One of: `sales`, `coaching`, `internal`, `webinar`, `client_strategy`, `podcast`, `other`. |
| `detectedConfidence` | Number (0-1) | The AI's confidence level in its detection. A value of 1.0 means very high confidence. Lower values indicate the meeting may not clearly fit one type. |

### Auto vs. Manual Mode

| Mode | Behavior |
|------|----------|
| **Auto** (`meetingType: "auto"`) | The AI analyzes the conversation in real time and automatically sets `detectedMeetingType`. The confidence score indicates reliability. The host can override the detection if it is incorrect. |
| **Manual** (`meetingType: "manual"`) | The host selects the meeting type before or during the session. No automatic detection occurs. The system uses the host-selected type for AI insights generation. |

### How Detection Works

1. The notetaker processes the transcript in real time.
2. The AI analyzes conversation patterns, keywords, participant roles, and content topics.
3. The system classifies the meeting and sets `detectedMeetingType`.
4. A `detectedConfidence` score is calculated.
5. If confidence is high (e.g., above 0.8), the detection is considered reliable.
6. If confidence is lower, the system may prompt the host to confirm or correct the meeting type.

### Common Customer Questions

**Q: The meeting type was detected incorrectly. Can I change it?**
A: Yes. The host can override the detected meeting type at any time. Navigate to the meeting settings or the MeetingNotes page and manually select the correct type.

**Q: What does the confidence score mean?**
A: The confidence score (0 to 1) indicates how certain the AI is about its meeting type classification. A score above 0.8 is highly confident. A score below 0.5 suggests the meeting content does not clearly match any single type. Low confidence meetings may be classified as `other`.

**Q: Should I use auto or manual detection?**
A: Auto mode is convenient for most sessions and works well when the meeting clearly fits one of the seven types. Use manual mode if you know the meeting type in advance, if your meetings are unusual, or if the auto-detection has been inaccurate in the past.

---

## Live Transcript

### What It Is

The **LiveTranscript** component displays the real-time transcript of the meeting as it happens. It shows who is speaking and what they are saying, updated continuously throughout the session.

### Features

- **Real-time display**: Text appears as speakers talk, with a minimal delay.
- **Speaker identification**: Each transcript segment is labeled with the speaker's name.
- **Timestamps**: Transcript entries include timestamps for reference.
- **Scrolling view**: The transcript auto-scrolls to show the most recent content, with the ability to scroll back.
- **Search**: Participants can search within the live transcript during the session.

### How It Works

1. The notetaker captures audio from the session.
2. Speech-to-text processing converts audio to text in real time.
3. Speaker diarization identifies who is speaking.
4. The **LiveTranscript** component renders the transcript with speaker labels and timestamps.
5. The transcript is stored in the **MeetingTranscript** entity for post-session access.

### Common Customer Questions

**Q: Can all participants see the live transcript?**
A: Visibility depends on the session settings. The host can configure whether the live transcript is visible to all participants or only to the host.

**Q: The transcript is not showing any text.**
A: Verify:
- The notetaker is enabled (`notetakerEnabled: true`).
- The notetaker is recording (`notetakerRecording: true`).
- The speaker's microphone is working.
- The browser has audio permissions.

**Q: Speaker names are incorrect in the transcript.**
A: Speaker identification relies on audio analysis. If names are incorrect:
- Ensure participants have set their display names.
- In some cases, the system may need to be "trained" on each speaker's voice at the beginning of the session.
- The host can manually correct speaker names in the post-session MeetingNotes.

---

## Meeting Notes Page

### What It Is

The **MeetingNotes** page is the comprehensive post-session interface for reviewing, searching, analyzing, and exporting meeting documentation generated by the AI Notetaker. It provides a centralized view of all meetings with powerful filtering, statistics, and detailed per-meeting views.

### Page Features

#### Search and Filtering

- **Search**: Full-text search across all meeting notes, transcripts, action items, and summaries. Type a keyword or phrase to find relevant meetings.
- **Filter by Meeting Type**: Filter the meeting list to show only meetings of a specific type (sales, coaching, internal, webinar, client_strategy, podcast, other).
- **Date Range**: Filter meetings by date range to find sessions from a specific period.
- **Sort Options**: Sort meetings by date, duration, number of action items, or other criteria.

#### Stats Cards

The MeetingNotes page displays four summary statistics cards at the top of the interface:

| Stat Card | Description |
|-----------|-------------|
| **Total Meetings** | The total number of meetings recorded by the notetaker. Provides a count of all sessions with notetaker data. |
| **Action Items** | The total number of action items identified across all meetings. Shows the cumulative count of tasks, follow-ups, and to-dos extracted from meeting conversations. |
| **Hours Recorded** | The total number of hours of meeting time captured by the notetaker. Represents the cumulative duration of all recorded sessions. |
| **Decisions** | The total number of decisions identified across all meetings. Shows key decisions that were made during recorded sessions. |

#### Detail Tabs

When viewing an individual meeting, four tabs provide different views of the meeting content:

| Tab | Content |
|-----|---------|
| **Summary** | AI-generated summary of the meeting's key points, topics discussed, and overall narrative. Provides a quick overview without reading the full transcript. |
| **Actions** | List of action items extracted from the meeting. Each action item includes: priority level (high/medium/low), assigned person (assignee), description of the task, and status (open/completed). |
| **Insights** | AI-generated insights specific to the detected meeting type. Different meeting types produce different types of insights (see [AI Insights by Meeting Type](#ai-insights-by-meeting-type)). |
| **Transcript** | The full text transcript of the meeting with speaker labels and timestamps. Searchable and scrollable. Powered by the **MeetingTranscript** entity. |

#### Action Items Detail

Each action item extracted by the AI includes:

| Field | Description |
|-------|-------------|
| **Description** | What needs to be done |
| **Priority** | High, Medium, or Low urgency |
| **Assignee** | The person responsible for completing the action (identified from the conversation) |
| **Status** | Whether the action item is open or completed |
| **Source** | The portion of the transcript where the action item was identified |

### Common Customer Questions

**Q: Where do I find my meeting notes?**
A: Navigate to the MeetingNotes page from the main R-Link navigation menu. All your recorded meetings with AI-generated notes are listed there.

**Q: How do I search for a specific meeting?**
A: Use the search bar at the top of the MeetingNotes page. You can search by keywords, participant names, topics, or any text that appeared in the meeting.

**Q: Can I edit the AI-generated notes?**
A: The summary, action items, and insights are AI-generated. Depending on the implementation, you may be able to edit action items (e.g., changing priority or assignee) and add manual notes. The transcript itself is a faithful record of what was said.

**Q: How accurate are the action items?**
A: The AI identifies action items based on conversational patterns like "I will do X," "Can you handle Y," and "We need to Z by Friday." Accuracy is generally high but depends on how clearly action items are stated during the meeting. Always review action items for completeness.

---

## Meeting Types Reference

The system recognizes seven distinct meeting types, each with a unique visual identifier and tailored AI analysis:

### 1. Sales Meeting

| Property | Value |
|----------|-------|
| **Type Key** | `sales` |
| **Icon** | Money bag |
| **Color** | Green |
| **Description** | Sales calls, demos, and revenue-related meetings. The AI focuses on identifying deal progression, objections, pricing discussions, next steps, and closing signals. |

### 2. Coaching Session

| Property | Value |
|----------|-------|
| **Type Key** | `coaching` |
| **Icon** | Target/Bullseye |
| **Color** | Purple |
| **Description** | Training, mentoring, and performance coaching sessions. The AI identifies skill development areas, feedback given, goals set, and improvement recommendations. |

### 3. Internal Meeting

| Property | Value |
|----------|-------|
| **Type Key** | `internal` |
| **Icon** | People/Group |
| **Color** | Blue |
| **Description** | Internal team meetings, standups, planning sessions, and organizational discussions. The AI focuses on decisions made, tasks assigned, blockers identified, and team updates. |

### 4. Webinar

| Property | Value |
|----------|-------|
| **Type Key** | `webinar` |
| **Icon** | Monitor/Screen |
| **Color** | Orange |
| **Description** | Webinars, presentations, and one-to-many educational broadcasts. The AI identifies key topics presented, audience engagement patterns, Q&A highlights, and content takeaways. |

### 5. Client Strategy Session

| Property | Value |
|----------|-------|
| **Type Key** | `client_strategy` |
| **Icon** | Chart/Graph |
| **Color** | Cyan |
| **Description** | Client-facing strategy discussions, account reviews, and planning sessions. The AI focuses on client goals, strategic recommendations, agreed deliverables, timelines, and relationship health indicators. |

### 6. Podcast

| Property | Value |
|----------|-------|
| **Type Key** | `podcast` |
| **Icon** | Microphone |
| **Color** | Pink |
| **Description** | Podcast recordings and interview-style sessions. The AI identifies discussion topics, key quotes, guest insights, and content highlights suitable for show notes. |

### 7. Other

| Property | Value |
|----------|-------|
| **Type Key** | `other` |
| **Icon** | Notepad |
| **Color** | Gray |
| **Description** | Meetings that do not clearly fit into the other six categories. The AI provides a general-purpose analysis with standard summary, action items, and key points. |

### Meeting Type Visual Indicators

Each meeting type in the MeetingNotes page is visually distinguished by:

- **Color-coded badge**: The meeting type appears as a colored label/badge on the meeting card.
- **Icon**: A recognizable icon appears next to the meeting type name.
- **Consistent color scheme**: The type's color is used throughout the detail view for headers, accents, and highlights.

### Common Customer Questions

**Q: What meeting types are available?**
A: Seven types: Sales (green), Coaching (purple), Internal (blue), Webinar (orange), Client Strategy (cyan), Podcast (pink), and Other (gray).

**Q: Can I create custom meeting types?**
A: The system currently supports the seven predefined meeting types. Custom types are not available at this time. If your meeting does not fit a specific category, the "Other" type provides general-purpose analysis.

**Q: How do I know which type was detected?**
A: The detected meeting type appears as a color-coded badge on the meeting card in the MeetingNotes page. If you are using auto-detection, you can also see the `detectedMeetingType` and `detectedConfidence` in the meeting details.

---

## Stats Cards

### Overview

The four stats cards at the top of the MeetingNotes page provide a dashboard-level overview of all recorded meeting activity:

### Total Meetings

- **What it shows**: The count of all meetings that have been recorded by the notetaker.
- **How it is calculated**: Every session where `notetakerEnabled` was true and recording occurred counts as one meeting.
- **Use case**: Track meeting volume over time.

### Action Items

- **What it shows**: The cumulative number of action items identified by the AI across all meetings.
- **How it is calculated**: Sum of all action items extracted from every recorded meeting.
- **Use case**: Understand the volume of follow-up work generated by meetings. A high number may indicate productive meetings or too many meetings generating tasks.

### Hours Recorded

- **What it shows**: The total duration (in hours) of all recorded meeting time.
- **How it is calculated**: Sum of the duration of every recorded session.
- **Use case**: Track time spent in recorded meetings. Useful for understanding meeting load and time management.

### Decisions

- **What it shows**: The total number of decisions identified by the AI across all meetings.
- **How it is calculated**: Sum of all decisions extracted from every recorded meeting.
- **Use case**: Track decision-making activity. Important for governance, accountability, and ensuring decisions are documented.

### Common Customer Questions

**Q: The stats seem incorrect or are not updating.**
A: Stats are calculated based on processed meetings. If a meeting was recently completed, there may be a brief delay while the AI processes the notes. Refresh the MeetingNotes page after a few minutes. If the issue persists, check that the notetaker was properly enabled during the session.

**Q: Do the stats include all meetings or just recent ones?**
A: The stats cards reflect all meetings in the system, not just recent ones. Use the date range filter to see stats for a specific period.

---

## AI Insights by Meeting Type

### What It Is

AI Insights are meeting-type-specific analyses generated by the AI after processing the meeting transcript. Each meeting type produces different types of insights tailored to the purpose and nature of that meeting.

### Insights by Type

#### Sales Meeting Insights

| Insight Category | Description |
|-----------------|-------------|
| Deal Progression | Assessment of where the deal stands and whether it progressed during the meeting |
| Objections Raised | Customer objections or concerns mentioned during the conversation |
| Pricing Discussion | Summary of pricing topics, quotes given, and discount requests |
| Competitive Mentions | References to competing products or services |
| Next Steps | Specific follow-up actions for the sales process |
| Closing Signals | Indicators that the customer is ready (or not ready) to close |
| Sentiment Analysis | Overall tone and sentiment of the customer during the meeting |

#### Coaching Session Insights

| Insight Category | Description |
|-----------------|-------------|
| Skill Gaps Identified | Areas where the coachee needs improvement |
| Feedback Delivered | Specific feedback provided during the session |
| Goals Set | New goals or objectives established |
| Progress Assessment | Evaluation of progress on previously set goals |
| Recommendations | Suggestions for improvement and development |
| Coaching Techniques | Methods and approaches used during the session |

#### Internal Meeting Insights

| Insight Category | Description |
|-----------------|-------------|
| Decisions Made | Key decisions reached during the meeting |
| Blockers Identified | Issues, obstacles, or blockers raised by team members |
| Task Assignments | Who was assigned what tasks and by when |
| Team Updates | Status updates shared by team members |
| Risk Flags | Potential risks or concerns identified |
| Process Improvements | Suggestions for improving workflows or processes |

#### Webinar Insights

| Insight Category | Description |
|-----------------|-------------|
| Key Topics Covered | Main subjects presented during the webinar |
| Audience Engagement | Metrics and patterns of audience interaction |
| Q&A Highlights | Notable questions asked and answers provided |
| Content Takeaways | Key learning points for attendees |
| Presenter Effectiveness | Analysis of presentation clarity and engagement |
| Follow-up Recommendations | Suggested post-webinar actions |

#### Client Strategy Insights

| Insight Category | Description |
|-----------------|-------------|
| Client Goals | Goals and objectives expressed by the client |
| Strategic Recommendations | Strategies proposed during the meeting |
| Agreed Deliverables | Specific deliverables and commitments made |
| Timeline Analysis | Deadlines and milestones discussed |
| Relationship Health | Assessment of the client relationship based on conversation tone |
| Risk Assessment | Potential risks to the client relationship or project |

#### Podcast Insights

| Insight Category | Description |
|-----------------|-------------|
| Discussion Topics | Main topics covered during the episode |
| Key Quotes | Notable or quotable statements made by speakers |
| Guest Highlights | Key points made by guest speakers |
| Content Segments | Breakdown of the episode into logical segments |
| Show Notes Draft | AI-generated show notes suitable for publication |
| Audience Takeaways | Key messages for the audience |

#### Other Meeting Insights

| Insight Category | Description |
|-----------------|-------------|
| Key Points | Main discussion points from the meeting |
| Action Items | Tasks and follow-ups identified |
| Decisions | Any decisions that were made |
| General Summary | Overall narrative of the meeting |
| Participant Contributions | Summary of each participant's main contributions |

### Common Customer Questions

**Q: Why are the insights different for each meeting?**
A: Insights are tailored to the meeting type. A sales meeting produces deal-focused insights, while a coaching session produces development-focused insights. The AI customizes its analysis based on the meeting type to provide the most relevant information.

**Q: The insights do not seem relevant to my meeting.**
A: Check the detected meeting type. If the meeting was classified as the wrong type, the insights will be tailored to the wrong context. Change the meeting type to the correct one and the insights should regenerate with more relevant analysis.

**Q: Can I request additional insights?**
A: The insight categories are predefined for each meeting type. If you need additional analysis, you can use the transcript to manually extract information, or provide feedback to the product team for feature requests.

---

## Export Formats

### What It Is

The MeetingNotes page supports exporting meeting documentation in multiple formats, allowing users to share, archive, and integrate meeting notes with other tools and workflows.

### Supported Formats

| Format | Description | Best For |
|--------|-------------|----------|
| **PDF** | Portable Document Format. Generates a professionally formatted, printable document with the meeting summary, action items, insights, and optionally the full transcript. | Archival, formal sharing, printing, client deliverables |
| **Markdown** | Plain text with Markdown formatting. Includes all meeting sections in a Markdown-compatible format that can be pasted into documentation tools, wikis, or note-taking applications. | Developer tools, wikis (Notion, Confluence), GitHub, version control |
| **Email** | Sends the meeting notes as a formatted email to specified recipients. Includes summary, action items, and key insights in email-friendly formatting. | Quick sharing with team members, stakeholders, or clients who were not in the meeting |
| **Tasks** | Exports action items as tasks to an integrated task management system. Each action item is created as a separate task with priority and assignee information preserved. | Project management tools, task tracking, workflow automation |

### How to Export

1. Navigate to the MeetingNotes page.
2. Open the specific meeting you want to export.
3. Click the Export button (usually in the top-right of the meeting detail view).
4. Select the desired export format.
5. Configure export options (e.g., include/exclude transcript, select email recipients).
6. Confirm and the export is generated.

### Common Customer Questions

**Q: How do I export my meeting notes?**
A: Open the meeting on the MeetingNotes page, click the Export button, and choose your preferred format: PDF, Markdown, Email, or Tasks.

**Q: Can I export the full transcript?**
A: Yes. When exporting to PDF or Markdown, you can choose to include the full transcript in the export. The Email format includes a summary by default but may allow transcript inclusion. Tasks export only includes action items.

**Q: I exported to Email but the recipients did not receive it.**
A: Check that:
- The email addresses are correct.
- The email is not in the recipients' spam/junk folder.
- Your email integration is properly configured.
- The export completed without errors.

**Q: Can I export action items to my project management tool?**
A: Yes. The Tasks export format is designed for this purpose. It creates individual tasks with priority, assignee, and description. The specific project management tool integration depends on your configured integrations.

**Q: Is there a way to export all meetings at once?**
A: Export is typically per-meeting. To export multiple meetings, export each one individually. If bulk export is needed, check for any available API or batch export options, or contact support.

---

## Entities & Data Models

### NotetakerSettings Entity

The **NotetakerSettings** entity stores the configuration for the notetaker feature:

| Field | Type | Description |
|-------|------|-------------|
| `notetakerEnabled` | Boolean | Whether the notetaker feature is active |
| `notetakerRecording` | Boolean | Whether recording is currently in progress |
| `showNotetakerInList` | Boolean | Whether the notetaker appears in the participant list |
| `meetingType` | String | `auto` or `manual` detection mode |
| `detectedMeetingType` | String | AI-detected meeting type |
| `detectedConfidence` | Number | Confidence score for the detection (0-1) |

### MeetingTranscript Entity

The **MeetingTranscript** entity stores the full transcript data for a meeting:

| Field | Type | Description |
|-------|------|-------------|
| `meeting_id` | String (UUID) | Links to the parent meeting |
| `segments` | Array | Array of transcript segments, each containing speaker, text, and timestamp |
| `duration` | Number | Total duration of the transcribed session |
| `speaker_count` | Integer | Number of distinct speakers identified |
| `word_count` | Integer | Total number of words in the transcript |
| `language` | String | Language of the transcript |
| `created_at` | Timestamp | When the transcript was generated |

### Relationship Between Entities

```
NotetakerSettings (session config)
    |
    v
LiveTranscript (real-time display)
    |
    v
MeetingTranscript (persisted data)
    |
    v
MeetingNotes Page (review & export)
    |
    +-- Summary Tab
    +-- Actions Tab (action items with priority/assignee)
    +-- Insights Tab (type-specific AI insights)
    +-- Transcript Tab (full MeetingTranscript display)
```

---

## Common Questions & Troubleshooting

### General Notetaker Issues

**Q: The Notetaker is not recording.**
A: Verify:
1. `notetakerEnabled` is set to `true`.
2. The session has started (the notetaker records during active sessions).
3. There is active audio (someone is speaking with a working microphone).
4. Browser audio permissions are granted.

**Q: The transcript is empty even though people were talking.**
A: This usually indicates an audio capture issue:
- Check that the speakers' microphones are working and unmuted.
- Ensure the browser has permission to access audio.
- Try refreshing the browser and re-enabling the notetaker.

**Q: Meeting notes are not appearing on the MeetingNotes page.**
A: After a session ends, the AI needs time to process the transcript and generate notes. Allow a few minutes for processing. If notes still do not appear:
- Verify the notetaker was enabled during the session.
- Check that the session was long enough to generate meaningful content.
- Contact support if the issue persists.

**Q: Can I delete meeting notes?**
A: Check the MeetingNotes page for a delete option on individual meetings. Deletion policies may vary based on your organization's settings and data retention requirements.

**Q: Is the notetaker GDPR/privacy compliant?**
A: The notetaker records and transcribes meeting audio. It is the host's responsibility to inform participants that recording is taking place. The `showNotetakerInList` setting can make the notetaker visible in the participant list as a transparency measure. For specific GDPR or privacy compliance questions, consult your organization's legal team or R-Link's privacy documentation.

**Q: Can I use the notetaker with external meeting participants (non-R-Link users)?**
A: The notetaker captures audio from the Studio session regardless of whether participants are R-Link users or guests. As long as the audio is captured in the session, the notetaker can transcribe it.

### Transcript Quality Issues

**Q: The transcript has many errors.**
A: Transcript accuracy depends on:
- Audio quality (use good microphones, minimize noise).
- Speaker clarity (clear enunciation, moderate pace).
- Language settings (ensure the correct language is configured).
- Number of speakers (fewer simultaneous speakers produce better results).

**Q: Speaker identification is wrong.**
A: Speaker diarization is based on audio analysis. Improve accuracy by:
- Having speakers introduce themselves at the start.
- Avoiding crosstalk (one speaker at a time).
- Using individual microphones for each speaker.

---

## Technical Reference

### Components Map

| Component | Location | Purpose |
|-----------|----------|---------|
| LiveTranscript | `studio/notetaker/LiveTranscript` | Real-time transcript display during session |
| MeetingNotes | `pages/MeetingNotes` | Post-session meeting notes page |

### Key State Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `notetakerEnabled` | Boolean | false | Master notetaker toggle |
| `notetakerRecording` | Boolean | false | Current recording status |
| `showNotetakerInList` | Boolean | varies | Notetaker visibility in participant list |
| `meetingType` | String | "auto" | Detection mode (auto/manual) |
| `detectedMeetingType` | String | null | AI-detected meeting type |
| `detectedConfidence` | Number | 0 | Detection confidence score (0-1) |

### Entity Reference

| Entity | Purpose | Key Fields |
|--------|---------|------------|
| NotetakerSettings | Notetaker configuration | notetakerEnabled, notetakerRecording, showNotetakerInList, meetingType, detectedMeetingType, detectedConfidence |
| MeetingTranscript | Transcript storage | meeting_id, segments, duration, speaker_count, word_count, language |

### Meeting Type Enum

```
MeetingTypes = {
  sales:           { icon: "money-bag",   color: "green"  },
  coaching:        { icon: "target",      color: "purple" },
  internal:        { icon: "people",      color: "blue"   },
  webinar:         { icon: "monitor",     color: "orange" },
  client_strategy: { icon: "chart",       color: "cyan"   },
  podcast:         { icon: "microphone",  color: "pink"   },
  other:           { icon: "notepad",     color: "gray"   }
}
```

### Stats Card Configuration

```
StatsCards = [
  { label: "Total Meetings",  source: "meeting_count"      },
  { label: "Action Items",    source: "action_item_count"   },
  { label: "Hours Recorded",  source: "total_hours"         },
  { label: "Decisions",       source: "decision_count"      }
]
```

### Export Format Capabilities

| Format | Summary | Actions | Insights | Transcript | Custom Recipients |
|--------|---------|---------|----------|------------|-------------------|
| PDF | Yes | Yes | Yes | Optional | No |
| Markdown | Yes | Yes | Yes | Optional | No |
| Email | Yes | Yes | Summary | Optional | Yes |
| Tasks | No | Yes | No | No | N/A |

---

*Last updated: 2026-01-29 | R-Link Customer Service Knowledge Base*
