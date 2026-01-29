# Leads and Analytics

## Overview

R-Link's lead management system captures, scores, tags, and exports attendee data from events, webinars, and interactive rooms. The **LeadsTab** in the Admin Dashboard provides a centralized interface for viewing, filtering, managing, and exporting leads. The system combines AI-powered qualification with engagement-based scoring to help users identify their most valuable prospects.

---

## LeadsTab

The LeadsTab is accessible from the Admin Dashboard via the `?tab=leads` URL parameter.

### Component Props

| Prop | Type | Description |
|------|------|-------------|
| `accountId` | string | The account ID used to scope all lead data |

### Core Features

The LeadsTab provides the following capabilities:

1. **Lead Capture** -- Automatic collection of attendee information from events and registrations.
2. **Lead Scoring** -- Dual scoring system combining AI qualification and engagement metrics.
3. **AI Tagging** -- Automated categorization and tagging of leads using AI analysis.
4. **CSV Export** -- Export lead data to CSV format for external use.
5. **CRM Integration** -- Sync leads with external CRM platforms.

---

## Lead Capture

Lead capture is the process of collecting attendee information during registration, event attendance, and post-event interactions.

### Capture Sources

Leads are captured from multiple touchpoints across the R-Link platform:

| Source | Data Captured | Trigger |
|--------|--------------|---------|
| Event Registration | Name, email, custom field responses | User submits registration form |
| Webinar Attendance | Name, email, join time, duration | User joins a webinar room |
| Room Participation | Name, interaction data, chat messages | User participates in a room |
| Landing Page Visits | Email (if provided), page views | User visits an event landing page |
| Shared Content Views | Email (if required), view data | User views shared clips or presentations |
| Poll Responses | Name, email, poll answers | User responds to a poll overlay |
| Q&A Submissions | Name, email, questions asked | User submits a Q&A question |

### Capture Behavior

- Leads are automatically created when a new email address is captured from any source.
- If a lead with the same email already exists, the existing lead record is updated with the new interaction data rather than creating a duplicate.
- All captured leads are scoped to the `accountId` and are only visible to users with access to the LeadsTab.
- Lead capture respects privacy settings: if a user opts out of data collection (where applicable), their data is not captured.

### Common Customer Questions About Lead Capture

**Q: How are leads captured during a webinar?**
A: When attendees register for a webinar, their name and email are captured as a lead. During the webinar, their attendance duration, chat participation, poll responses, and Q&A interactions are tracked and added to their lead record.

**Q: Are leads captured from replay viewers?**
A: Yes, if the replay requires an email to access (configurable per shared clip or recording). The viewer's email and engagement data (watch time, interactions) are captured.

**Q: I see duplicate leads in my list. Why?**
A: Leads are deduplicated by email address. If you see duplicates, they may have registered with slightly different email addresses (e.g., john@company.com vs john.doe@company.com). You can merge these manually or during CSV export.

**Q: Can I manually add leads?**
A: The LeadsTab is primarily designed for automatic capture. For manual lead entry, consider importing via CSV or using the CRM integration to sync from your existing CRM.

---

## Lead Scoring

R-Link uses a dual scoring system that combines two complementary approaches to evaluate lead quality.

### AI Qualification Score

The AI qualification score uses machine learning to assess a lead's likelihood of conversion based on their profile and behavioral patterns.

**How It Works:**

1. The AI analyzes the lead's registration data, including:
   - Company information (if provided via custom fields)
   - Job title or role (if provided)
   - Industry or segment
   - Historical patterns from similar leads
2. The AI assigns a qualification score on a standardized scale.
3. The score is recalculated as new data becomes available.

**Factors Considered:**
- Profile completeness (more data = better scoring)
- Firmographic data (company size, industry, revenue)
- Behavioral signals (registration timing, content preferences)
- Historical conversion patterns from similar profiles

**Score Interpretation:**
| Range | Label | Meaning |
|-------|-------|---------|
| High | Hot Lead | Strong match to ideal customer profile; high conversion likelihood |
| Medium | Warm Lead | Moderate match; may need nurturing |
| Low | Cold Lead | Low match; unlikely to convert without significant engagement |

### Engagement Score

The engagement score measures how actively a lead has interacted with your content and events.

**How It Works:**

1. Every interaction a lead has with R-Link content is tracked and weighted.
2. Interactions are aggregated into an overall engagement score.
3. The score updates in real time as new interactions occur.

**Interaction Weights (relative):**

| Interaction Type | Weight | Description |
|-----------------|--------|-------------|
| Event attendance | High | Attended a live event |
| Full event watch | High | Watched an entire event or replay |
| Poll participation | Medium | Responded to one or more polls |
| Q&A submission | Medium | Asked a question during a live event |
| Chat activity | Medium | Sent messages in the chat during an event |
| Partial replay view | Low-Medium | Watched part of a replay |
| Landing page visit | Low | Visited an event landing page without registering |
| Shared clip view | Low | Viewed a shared clip |

**Score Interpretation:**
| Range | Label | Meaning |
|-------|-------|---------|
| High | Highly Engaged | Active participant across multiple touchpoints |
| Medium | Moderately Engaged | Some interaction but not fully active |
| Low | Low Engagement | Minimal interaction; may need re-engagement |

### Combined Scoring

The AI qualification score and engagement score are displayed side by side for each lead, giving users a two-dimensional view of lead quality:

- **High AI + High Engagement**: Priority lead. Ready for direct outreach.
- **High AI + Low Engagement**: Qualified but disengaged. May need targeted content or a personal invitation.
- **Low AI + High Engagement**: Engaged but may not match the ideal customer profile. Consider for community building or upsell opportunities.
- **Low AI + Low Engagement**: Low priority. May benefit from automated nurture sequences.

### Common Customer Questions About Lead Scoring

**Q: How accurate is the AI qualification score?**
A: The AI qualification score improves over time as it learns from your specific audience. It is most accurate when leads provide detailed registration information and when you have historical conversion data. For new accounts, the score may be less precise initially.

**Q: Can I customize the scoring criteria?**
A: The engagement score weights are fixed by the platform. The AI qualification score adapts automatically to your audience patterns. Custom scoring rules are available on Enterprise plans.

**Q: Why does a lead have a high engagement score but a low AI score (or vice versa)?**
A: The two scores measure different things. AI qualification assesses profile fit (who they are), while engagement measures behavioral activity (what they do). A highly engaged lead may not match your ideal customer profile, and a well-qualified lead may not have interacted much yet.

**Q: How often are scores updated?**
A: Engagement scores update in real time as interactions occur. AI qualification scores are recalculated periodically and when significant new data becomes available (e.g., new registration fields filled out).

---

## AI Tagging

AI tagging automatically categorizes leads based on their behavior, profile, and interactions.

### How AI Tagging Works

1. The AI analyzes each lead's combined data (registration info, engagement history, content interactions).
2. Tags are automatically assigned based on detected patterns and characteristics.
3. Tags are updated as new data becomes available.

### Example Tags

| Tag | Applied When |
|-----|-------------|
| `decision-maker` | Lead's role indicates purchasing authority |
| `technical` | Lead engages primarily with technical content |
| `repeat-attendee` | Lead has attended multiple events |
| `high-intent` | Lead shows behaviors associated with purchase intent |
| `new-prospect` | First-time interaction with your content |
| `champion` | Highly engaged across multiple touchpoints |
| `at-risk` | Previously engaged but activity has declined |
| `webinar-focused` | Primarily engages through webinars |
| `content-consumer` | Primarily engages through replays and shared clips |

### Tag Management

- AI-assigned tags can be manually removed if they are incorrect.
- Users can add custom tags to leads manually.
- Tags can be used as filters in the LeadsTab and as criteria for CSV export.
- Tags are included in CRM sync data.

### Common Customer Questions About AI Tagging

**Q: Can I create my own tags?**
A: Yes. You can manually add custom tags to any lead. The AI will also continue to assign its own tags based on behavior patterns.

**Q: An AI tag seems incorrect. What should I do?**
A: You can remove any AI-assigned tag by clicking the "X" on the tag. The AI learns from these corrections over time.

**Q: How are tags different from scores?**
A: Scores are numerical measures of qualification and engagement. Tags are categorical labels that describe specific characteristics or behaviors. Tags provide more qualitative context that complements the quantitative scores.

---

## CSV Export

The CSV export feature allows users to download their lead data for use in external tools, reporting, or manual analysis.

### Export Process

1. Navigate to the LeadsTab.
2. Optionally apply filters (by score, tag, date range, event, etc.).
3. Click the "Export CSV" button.
4. The system generates a CSV file containing all leads matching the current filters.
5. The file is downloaded to the user's device.

### Exported Fields

The CSV export includes all available lead data:

| Field | Description |
|-------|-------------|
| Name | Lead's full name |
| Email | Lead's email address |
| Company | Company name (if captured) |
| AI Qualification Score | Numerical AI score |
| Engagement Score | Numerical engagement score |
| Tags | Comma-separated list of all tags |
| Source | Where the lead was first captured |
| First Interaction | Date/time of first interaction |
| Last Interaction | Date/time of most recent interaction |
| Events Attended | Number of events attended |
| Total Watch Time | Cumulative time spent watching content |
| Registration Date | When the lead first registered |
| Custom Fields | All custom field responses from registration |

### Export Behavior

- Exports respect the currently applied filters. If no filters are applied, all leads for the account are exported.
- Large exports may take a few seconds to generate.
- The export timestamp is included in the filename for reference.
- Exports are not scheduled; they are on-demand only.

### Common Customer Questions About CSV Export

**Q: Can I schedule automatic exports?**
A: CSV exports are currently on-demand only. For automated data flow, consider using the CRM integration which syncs data continuously.

**Q: The export file is missing some leads. Why?**
A: Check if you have any filters applied in the LeadsTab. Exports only include leads matching the current filter criteria. Clear all filters and export again to get the complete dataset.

**Q: What format is the CSV in?**
A: The file is a standard CSV (Comma-Separated Values) file encoded in UTF-8. It can be opened in Excel, Google Sheets, or any CSV-compatible tool.

---

## CRM Integration

R-Link integrates with external CRM platforms to sync lead data automatically.

### How CRM Integration Works

1. Navigate to the Integrations tab (or the CRM section within the LeadsTab).
2. Select your CRM platform from the supported list.
3. Authenticate with your CRM account (OAuth or API key, depending on the platform).
4. Configure field mappings between R-Link lead fields and your CRM fields.
5. Enable the sync.

### Sync Behavior

- **Direction**: R-Link syncs leads TO the CRM (one-way sync by default). Bidirectional sync may be available for supported platforms.
- **Frequency**: Leads are synced in near real-time as new data is captured.
- **Deduplication**: The integration uses email address as the unique identifier. If a lead with the same email exists in the CRM, it updates the existing record rather than creating a duplicate.
- **Field Mapping**: Users configure which R-Link fields map to which CRM fields during setup. Unmapped fields are not synced.
- **Score Sync**: Both AI qualification and engagement scores can be mapped to CRM fields (typically custom fields in the CRM).
- **Tag Sync**: Tags can be synced as CRM tags, labels, or custom field values.

### Common Customer Questions About CRM Integration

**Q: Which CRM platforms are supported?**
A: Check the Integrations tab for the current list of supported CRM platforms. Common integrations include Salesforce, HubSpot, Pipedrive, and others. The list is regularly expanded.

**Q: My CRM sync is not working. What should I check?**
A: Common issues include:
1. Expired authentication tokens. Re-authenticate from the Integrations tab.
2. Incorrect field mappings. Verify that R-Link fields are mapped to valid CRM fields.
3. CRM API rate limits. If you have a large number of leads, the sync may be throttled by your CRM's API limits.
4. Required CRM fields not mapped. If your CRM requires certain fields for new contacts, ensure they are mapped.

**Q: Can I sync historical leads to my CRM?**
A: Yes. When you first enable the CRM integration, you can choose to sync all existing leads or only new leads going forward.

**Q: Does the CRM integration work on all plans?**
A: CRM integration availability depends on your plan. Check the Billing tab or contact support for plan-specific feature availability.

---

## Troubleshooting

### No Leads Appearing in LeadsTab

**Possible Causes:**
- No events or registrations have occurred yet.
- The `accountId` is incorrect or the user is on the wrong account.
- Lead capture is not enabled for the events in question.

**Resolution Steps:**
1. Confirm that events have occurred and attendees registered or participated.
2. Verify the user is logged into the correct account.
3. Check that the events were created under the same account.
4. If leads should exist but do not appear, escalate to engineering with the account ID and event IDs.

### Lead Scores Not Updating

**Possible Causes:**
- The lead has no new interactions since the last score calculation.
- The AI scoring service is temporarily delayed.

**Resolution Steps:**
1. Check the lead's activity history. If there are no new interactions, the score will not change.
2. Engagement scores update in real time; if they are not updating, the interaction may not have been tracked (e.g., the user was anonymous).
3. AI qualification scores update periodically. Wait for the next recalculation cycle.
4. If scores remain stale for more than 24 hours, escalate to engineering.

### CSV Export Fails or Downloads Empty File

**Possible Causes:**
- No leads match the current filters.
- Network interruption during export generation.
- Browser blocked the download.

**Resolution Steps:**
1. Clear all filters and try exporting again.
2. Check the browser's download settings and ensure downloads are not blocked.
3. Try a different browser.
4. If the issue persists, escalate to engineering.

### CRM Sync Creates Duplicates

**Possible Causes:**
- The email field in the CRM is not set as the unique identifier.
- The CRM field mapping was changed after initial sync.
- The CRM has multiple matching records with different email formats.

**Resolution Steps:**
1. Verify that email is configured as the unique identifier in the CRM integration settings.
2. Check the CRM for existing records with similar email variations.
3. Review the field mapping configuration for accuracy.
4. If duplicates continue, disable sync, clean up duplicates in the CRM, and re-enable sync.

---

## Internal Reference

### Data Architecture

```
Lead Record
  |-- Profile Data (name, email, company, custom fields)
  |-- AI Qualification Score (recalculated periodically)
  |-- Engagement Score (updated in real time)
  |-- Tags (AI-assigned + manual)
  |-- Interaction History
  |     |-- Registration events
  |     |-- Attendance records
  |     |-- Poll responses
  |     |-- Chat activity
  |     |-- Q&A submissions
  |     |-- Content views
  |-- CRM Sync Status
  |-- Export History
```

### Related Entities

- **Account**: All leads are scoped to an account (via `accountId`)
- **Event**: Events are a primary source of lead capture
- **WebinarRegistration**: Registration data feeds into lead records
- **Poll**: Poll responses contribute to engagement scoring
- **Recording / SharedClip**: Content views contribute to engagement scoring

### Related Admin Tabs

- **LeadsTab** (`?tab=leads`): Primary lead management interface
- **IntegrationsTab** (`?tab=integrations`): CRM integration configuration
- **EventLandingTab** (`?tab=event-landing`): Event landing pages that capture leads
- **RecordingsTab** (`?tab=recordings`): Recordings that generate content view data
- **ClipsTab** (`?tab=clips`): Clips that generate content view data
