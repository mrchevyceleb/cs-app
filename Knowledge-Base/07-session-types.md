# 07 - Session Types and Layouts

## Overview

R-Link supports three distinct session types, each designed for different use cases: **Meeting**, **Webinar**, and **Live Stream**. Each session type has its own set of supported features, available layouts, and default configurations. Session types determine the fundamental interaction model -- from equal-participation meetings to host-centric webinars to broadcast-style live streams.

Session types are selected either at the room level (default session type) or via the URL parameter `?type=` when launching the studio. The session type controls which layouts are available, which features are enabled, and how the studio interface is configured.

---

## Session Type Comparison Matrix

| Attribute | Meeting | Webinar | Live Stream |
|-----------|---------|---------|-------------|
| Internal key | `meeting` | `webinar` | `livestream` |
| Session label | "Meeting" | "Webinar" | "Live Stream" |
| URL parameter | `?type=meeting` | `?type=webinar` | `?type=livestream` |
| Primary use case | Team collaboration, small group discussions | Presentations, demos, education | Broadcasting, content creation, social streaming |
| Interaction model | Equal participation for all | Host/presenter-focused, audience Q&A | Host broadcast with audience comments |
| Default layout | `gallery` | `stage_host` | `live_host` |
| Number of layouts | 5 | 6 | 7 |
| CTA support | No | Yes (select layouts) | Yes (select layouts) |
| Talking points | No | Yes (select layouts) | Yes (select layouts) |
| Comments overlay | No | No | Yes (select layouts) |
| Gallery view | Yes | No | No |
| Screen sharing | Yes | Yes | Yes |
| Q&A panel | No | Yes | No |
| Audience participation | Equal (all can unmute/share) | Controlled (raise hand, Q&A) | Minimal (comments only) |

### Feature Breakdown by Session Type

#### Meeting Features
```
features = ['gallery', 'screen-share', 'equal-participation']
```

| Feature | Description |
|---------|-------------|
| `gallery` | All participants displayed equally in a grid layout |
| `screen-share` | Any participant can share their screen |
| `equal-participation` | All participants have equal audio/video/chat privileges |

#### Webinar Features
```
features = ['cta', 'talking-points', 'stage-focused', 'audience-qa']
```

| Feature | Description |
|---------|-------------|
| `cta` | Call-to-action overlays can be displayed during the session |
| `talking-points` | Host can display talking point prompts visible only to presenters |
| `stage-focused` | UI emphasizes the host/presenter with audience in a secondary position |
| `audience-qa` | Dedicated Q&A panel for audience members to submit questions |

#### Live Stream Features
```
features = ['scenes', 'comments-overlay', 'media-scenes', 'cta', 'talking-points']
```

| Feature | Description |
|---------|-------------|
| `scenes` | Multiple pre-configured visual scenes that can be switched during the stream |
| `comments-overlay` | Live audience comments can be overlaid on the video canvas |
| `media-scenes` | Scenes that display pre-loaded media (images, videos) instead of live camera feeds |
| `cta` | Call-to-action overlays for live streams |
| `talking-points` | Talking point prompts for the host |

---

## Session Type URL Parameters

### Setting Session Type

The session type is set via the `?type=` URL parameter when navigating to the studio:

```
/Studio?type=meeting
/Studio?type=webinar
/Studio?type=livestream
```

### Combined Parameters

```
/Studio?room={slug}&type={session_type}&name={display_name}
```

**Parameter priority:**
1. `?type=` parameter takes highest priority
2. If no `?type=` is specified, the room's default `session_type` is used
3. If neither is specified, defaults to `meeting`

### Setup Page Session Label

The setup page displays the session type label based on the `sessionLabels` mapping:

| Key | Label |
|-----|-------|
| `meeting` | "Meeting" |
| `webinar` | "Webinar" |
| `livestream` | "Live Stream" |

The label appears in the setup page header, e.g., "Join Meeting" or "Start Webinar".

---

## Layouts - Complete Reference

### Meeting Layouts (5 total)

#### 1. `gallery`

| Property | Value |
|----------|-------|
| Display name | Gallery |
| Description | Equal-sized video tiles arranged in a 2x2 grid (or NxN for more participants). All participants are equally visible. |
| Default for | Meeting sessions |
| Grid | 2x2 base, expands as participants join |
| `supportsCTA` | `false` |
| `supportsTalkingPoints` | `false` |
| `supportsCommentsOverlay` | `false` |
| `ctaProminent` | `false` |
| `commentsProminent` | `false` |

**Region configuration:**
```
+-------------------+
|  [P1]  |  [P2]   |
|---------|---------|
|  [P3]  |  [P4]   |
+-------------------+
All regions: 50% width, 50% height each
```

**Use case:** Team meetings, standups, collaborative discussions where all participants should be equally visible.

#### 2. `speaker_filmstrip`

| Property | Value |
|----------|-------|
| Display name | Speaker + Filmstrip |
| Description | Active speaker takes up the main area; other participants shown as a filmstrip strip on the side or bottom. |
| Grid | 1 main + filmstrip strip |
| `supportsCTA` | `false` |
| `supportsTalkingPoints` | `false` |
| `supportsCommentsOverlay` | `false` |
| `ctaProminent` | `false` |
| `commentsProminent` | `false` |

**Region configuration:**
```
+-------------------+--------+
|                   | [P2]   |
|   Active Speaker  |--------|
|   (Main - 75%)    | [P3]   |
|                   |--------|
|                   | [P4]   |
+-------------------+--------+
Main: 75% width | Filmstrip: 25% width
```

**Use case:** Presentations where one person is speaking most of the time, but you still want to see other participants.

#### 3. `screen_thumbnails`

| Property | Value |
|----------|-------|
| Display name | Screen + Thumbnails |
| Description | Shared screen takes up 80% of the canvas; participant video thumbnails in the remaining 20%. |
| Grid | 80% screen + 20% thumbnails |
| `supportsCTA` | `false` |
| `supportsTalkingPoints` | `false` |
| `supportsCommentsOverlay` | `false` |
| `ctaProminent` | `false` |
| `commentsProminent` | `false` |

**Region configuration:**
```
+------------------------+------+
|                        | [P1] |
|   Screen Share         |------|
|   (80% width)          | [P2] |
|                        |------|
|                        | [P3] |
+------------------------+------+
Screen: 80% width | Thumbnails: 20% width
```

**Use case:** Screen sharing sessions, code reviews, document collaboration, demos where the shared content is primary.

#### 4. `presenter_pip`

| Property | Value |
|----------|-------|
| Display name | Presenter Picture-in-Picture |
| Description | Presenter shown as a small PiP window overlaid on the shared screen or content area. |
| Grid | Full-canvas content + PiP overlay |
| `supportsCTA` | `false` |
| `supportsTalkingPoints` | `false` |
| `supportsCommentsOverlay` | `false` |
| `ctaProminent` | `false` |
| `commentsProminent` | `false` |

**Region configuration:**
```
+----------------------------+
|                            |
|   Screen Share / Content   |
|   (Full canvas)            |
|                   +------+ |
|                   | PiP  | |
|                   +------+ |
+----------------------------+
Content: 100% canvas | PiP: ~15% bottom-right corner
```

**Use case:** Presentations where the content should dominate but the presenter's face should still be visible.

#### 5. `focus`

| Property | Value |
|----------|-------|
| Display name | Focus |
| Description | Single participant or active speaker fills the entire canvas. No other participants visible. |
| Grid | 1 full-canvas |
| `supportsCTA` | `false` |
| `supportsTalkingPoints` | `false` |
| `supportsCommentsOverlay` | `false` |
| `ctaProminent` | `false` |
| `commentsProminent` | `false` |

**Region configuration:**
```
+----------------------------+
|                            |
|   Focused Participant      |
|   (Full canvas - 100%)     |
|                            |
+----------------------------+
```

**Use case:** One-on-one sessions, spotlight moments, when full attention should be on one person.

---

### Webinar Layouts (6 total)

#### 1. `stage_host`

| Property | Value |
|----------|-------|
| Display name | Stage (Host) |
| Description | Host/presenter shown prominently on a virtual stage. This is the default webinar layout, emphasizing the presenter. |
| Default for | Webinar sessions |
| `supportsCTA` | `true` |
| `supportsTalkingPoints` | `true` |
| `supportsCommentsOverlay` | `false` |
| `ctaProminent` | `false` |
| `commentsProminent` | `false` |

**Region configuration:**
```
+----------------------------+
|                            |
|   Host / Presenter         |
|   (Full stage - 100%)      |
|                            |
|   [Talking Points Bar]     |
+----------------------------+
Host: 100% canvas
Optional CTA overlay: bottom or side
Optional talking points: bottom bar (presenter-only)
```

**Use case:** Solo presentations, keynotes, product demos where one person is the focus.

#### 2. `interview`

| Property | Value |
|----------|-------|
| Display name | Interview |
| Description | Split-screen view with two participants side by side. Designed for interview-style conversations. |
| `supportsCTA` | `true` |
| `supportsTalkingPoints` | `true` |
| `supportsCommentsOverlay` | `false` |
| `ctaProminent` | `false` |
| `commentsProminent` | `false` |

**Region configuration:**
```
+-------------+-------------+
|             |             |
|  Host       |  Guest      |
|  (50%)      |  (50%)      |
|             |             |
+-------------+-------------+
Left: 50% width | Right: 50% width
```

**Use case:** Interviews, two-person panels, podcast-style conversations, fireside chats.

#### 3. `panel`

| Property | Value |
|----------|-------|
| Display name | Panel |
| Description | 2x2 grid layout for panel discussions with up to 4 presenters. |
| `supportsCTA` | `true` |
| `supportsTalkingPoints` | `true` |
| `supportsCommentsOverlay` | `false` |
| `ctaProminent` | `false` |
| `commentsProminent` | `false` |

**Region configuration:**
```
+-------------+-------------+
|  Speaker 1  |  Speaker 2  |
|  (50x50%)   |  (50x50%)   |
+-------------+-------------+
|  Speaker 3  |  Speaker 4  |
|  (50x50%)   |  (50x50%)   |
+-------------+-------------+
2x2 grid, each cell: 50% width x 50% height
```

**Use case:** Panel discussions, roundtables, multi-speaker webinars with up to 4 presenters.

#### 4. `content_focus`

| Property | Value |
|----------|-------|
| Display name | Content Focus |
| Description | Shared content (screen, slides, media) takes the full canvas. Presenters are hidden or minimized. |
| `supportsCTA` | `true` |
| `supportsTalkingPoints` | `true` |
| `supportsCommentsOverlay` | `false` |
| `ctaProminent` | `false` |
| `commentsProminent` | `false` |

**Region configuration:**
```
+----------------------------+
|                            |
|   Shared Content           |
|   (Full canvas - 100%)     |
|                            |
+----------------------------+
Content: 100% canvas
No presenter video visible
```

**Use case:** Slide presentations, document reviews, training sessions where content is more important than seeing the presenter.

#### 5. `content_host_pip`

| Property | Value |
|----------|-------|
| Display name | Content + Host PiP |
| Description | Content fills the canvas with the host shown as a picture-in-picture overlay. Combines content focus with presenter visibility. |
| `supportsCTA` | `true` |
| `supportsTalkingPoints` | `true` |
| `supportsCommentsOverlay` | `false` |
| `ctaProminent` | `false` |
| `commentsProminent` | `false` |

**Region configuration:**
```
+----------------------------+
|                            |
|   Shared Content           |
|   (Full canvas)            |
|                   +------+ |
|                   | Host | |
|                   | PiP  | |
|                   +------+ |
+----------------------------+
Content: 100% canvas | Host PiP: ~15% bottom-right
```

**Use case:** Presentations where you want the audience to see both the content and the presenter, with content being primary.

#### 6. `offer`

| Property | Value |
|----------|-------|
| Display name | Offer |
| Description | Split layout with presenter on one side (60%) and a prominent CTA/offer card on the other (40%). Designed for sales, promotions, and lead generation. |
| `supportsCTA` | `true` |
| `supportsTalkingPoints` | `true` |
| `supportsCommentsOverlay` | `false` |
| `ctaProminent` | **`true`** |
| `commentsProminent` | `false` |

**Region configuration:**
```
+------------------+-----------+
|                  |           |
|   Presenter      |   CTA     |
|   (60% width)    |   Card    |
|                  |   (40%)   |
|                  |           |
+------------------+-----------+
Presenter: 60% width | CTA: 40% width
```

**Use case:** Product launches, sales presentations, special offers, any session where a call-to-action should be prominently displayed alongside the presenter.

---

### Live Stream Layouts (7 total)

#### 1. `live_host`

| Property | Value |
|----------|-------|
| Display name | Live Host |
| Description | Host fills the canvas for a solo live stream. Default live stream layout. |
| Default for | Live Stream sessions |
| `supportsCTA` | `true` |
| `supportsTalkingPoints` | `true` |
| `supportsCommentsOverlay` | `true` |
| `ctaProminent` | `false` |
| `commentsProminent` | `false` |

**Region configuration:**
```
+----------------------------+
|                            |
|   Host                     |
|   (Full canvas - 100%)     |
|                            |
+----------------------------+
Optional comments overlay: right side
Optional CTA: bottom
Optional talking points: bottom bar (host-only)
```

**Use case:** Solo live streams, vlogs, announcements, Q&A sessions.

#### 2. `live_interview`

| Property | Value |
|----------|-------|
| Display name | Live Interview |
| Description | Split-screen for two-person live streams. |
| `supportsCTA` | `true` |
| `supportsTalkingPoints` | `true` |
| `supportsCommentsOverlay` | `true` |
| `ctaProminent` | `false` |
| `commentsProminent` | `false` |

**Region configuration:**
```
+-------------+-------------+
|             |             |
|   Host      |   Guest     |
|   (50%)     |   (50%)     |
|             |             |
+-------------+-------------+
Left: 50% width | Right: 50% width
```

**Use case:** Live interviews, co-hosted streams, two-person shows.

#### 3. `live_panel`

| Property | Value |
|----------|-------|
| Display name | Live Panel |
| Description | 3x2 grid for multi-person live streams with up to 6 participants. |
| `supportsCTA` | `true` |
| `supportsTalkingPoints` | `true` |
| `supportsCommentsOverlay` | `true` |
| `ctaProminent` | `false` |
| `commentsProminent` | `false` |

**Region configuration:**
```
+-----------+-----------+-----------+
| Person 1  | Person 2  | Person 3  |
| (33x50%)  | (33x50%)  | (33x50%)  |
+-----------+-----------+-----------+
| Person 4  | Person 5  | Person 6  |
| (33x50%)  | (33x50%)  | (33x50%)  |
+-----------+-----------+-----------+
3x2 grid, each cell: ~33% width x 50% height
```

**Use case:** Live panel discussions, group streams, multi-host shows, live roundtables.

#### 4. `live_media`

| Property | Value |
|----------|-------|
| Display name | Live Media |
| Description | Full-canvas media scene. Displays pre-loaded images, videos, or other media content instead of live camera feeds. |
| `supportsCTA` | `true` |
| `supportsTalkingPoints` | `false` |
| `supportsCommentsOverlay` | `true` |
| `ctaProminent` | `false` |
| `commentsProminent` | `false` |

**Region configuration:**
```
+----------------------------+
|                            |
|   Media Content            |
|   (Full canvas - 100%)     |
|                            |
+----------------------------+
Media: 100% canvas
No live video feeds visible
```

**Use case:** Stream intermissions, pre-recorded content, sponsor slides, media showcases during a live stream.

#### 5. `live_media_pip`

| Property | Value |
|----------|-------|
| Display name | Live Media + PiP |
| Description | Media content fills the canvas with the host shown as a PiP overlay. Allows commentary over pre-loaded media. |
| `supportsCTA` | `true` |
| `supportsTalkingPoints` | `true` |
| `supportsCommentsOverlay` | `true` |
| `ctaProminent` | `false` |
| `commentsProminent` | `false` |

**Region configuration:**
```
+----------------------------+
|                            |
|   Media Content            |
|   (Full canvas)            |
|                   +------+ |
|                   | Host | |
|                   | PiP  | |
|                   +------+ |
+----------------------------+
Media: 100% canvas | Host PiP: ~15% bottom-right
```

**Use case:** Commentating over media, reaction streams, reviewing content live, watch parties.

#### 6. `live_comment`

| Property | Value |
|----------|-------|
| Display name | Live Comments |
| Description | Host video on the left (65%) with a prominent live comments feed on the right (30%). Remaining 5% is spacing/padding. |
| `supportsCTA` | `true` |
| `supportsTalkingPoints` | `true` |
| `supportsCommentsOverlay` | `true` |
| `ctaProminent` | `false` |
| `commentsProminent` | **`true`** |

**Region configuration:**
```
+--------------------+----------+
|                    |          |
|   Host Video       | Comments |
|   (65% width)      | Feed     |
|                    | (30%)    |
|                    |          |
+--------------------+----------+
Host: 65% width | Gap: 5% | Comments: 30% width
```

**Use case:** Interactive live streams, Q&A sessions, community engagement streams where reading and responding to comments is a core activity.

#### 7. `live_cta`

| Property | Value |
|----------|-------|
| Display name | Live CTA |
| Description | Host video on the left (55%) with a prominent CTA panel on the right (45%). Designed for live selling, promotions, and conversion events. |
| `supportsCTA` | `true` |
| `supportsTalkingPoints` | `true` |
| `supportsCommentsOverlay` | `true` |
| `ctaProminent` | **`true`** |
| `commentsProminent` | `false` |

**Region configuration:**
```
+-----------------+-------------+
|                 |             |
|   Host Video    |   CTA       |
|   (55% width)   |   Panel     |
|                 |   (45%)     |
|                 |             |
+-----------------+-------------+
Host: 55% width | CTA: 45% width
```

**Use case:** Live selling, product demonstrations with purchase links, promotional streams, fundraising events, any live stream where driving audience action is the primary goal.

---

## Layout Feature Support Matrix

### Complete Matrix: All 18 Layouts

| Layout | Session Type | supportsCTA | supportsTalkingPoints | supportsCommentsOverlay | ctaProminent | commentsProminent |
|--------|-------------|-------------|----------------------|------------------------|-------------|-------------------|
| `gallery` | Meeting | No | No | No | No | No |
| `speaker_filmstrip` | Meeting | No | No | No | No | No |
| `screen_thumbnails` | Meeting | No | No | No | No | No |
| `presenter_pip` | Meeting | No | No | No | No | No |
| `focus` | Meeting | No | No | No | No | No |
| `stage_host` | Webinar | Yes | Yes | No | No | No |
| `interview` | Webinar | Yes | Yes | No | No | No |
| `panel` | Webinar | Yes | Yes | No | No | No |
| `content_focus` | Webinar | Yes | Yes | No | No | No |
| `content_host_pip` | Webinar | Yes | Yes | No | No | No |
| `offer` | Webinar | Yes | Yes | No | **Yes** | No |
| `live_host` | Live Stream | Yes | Yes | Yes | No | No |
| `live_interview` | Live Stream | Yes | Yes | Yes | No | No |
| `live_panel` | Live Stream | Yes | Yes | Yes | No | No |
| `live_media` | Live Stream | Yes | No | Yes | No | No |
| `live_media_pip` | Live Stream | Yes | Yes | Yes | No | No |
| `live_comment` | Live Stream | Yes | Yes | Yes | No | **Yes** |
| `live_cta` | Live Stream | Yes | Yes | Yes | **Yes** | No |

### Key Observations

1. **Meeting layouts** have no CTA, talking points, or comments overlay support -- they are purely collaborative.
2. **Webinar layouts** all support CTA and talking points, but never support comments overlay.
3. **Live stream layouts** all support CTA and comments overlay; all except `live_media` support talking points.
4. **`ctaProminent`** is only `true` for `offer` (webinar) and `live_cta` (live stream) -- these layouts dedicate significant screen real estate to the CTA.
5. **`commentsProminent`** is only `true` for `live_comment` -- this layout dedicates 30% of the screen to the comments feed.

---

## Session Type Decision Guide

Use this guide to help users choose the right session type:

### Choose Meeting when:
- All participants should be equal contributors
- The session is collaborative (brainstorming, standup, team sync)
- Screen sharing and discussion are the primary activities
- There is no audience/viewer distinction
- No CTA or marketing elements are needed
- Group size is small (typically 2-12 people)

### Choose Webinar when:
- There is a clear presenter/audience distinction
- The host wants to present with controlled audience interaction
- Q&A functionality is needed
- CTA overlays or offers should be displayed
- The session is educational, a product demo, or a presentation
- Talking points should guide the presenter
- Audience members should not have audio/video by default

### Choose Live Stream when:
- The session is being broadcast to a large audience
- Live comments from viewers should be visible on-screen
- Multiple scenes (camera, media, transitions) are planned
- The host wants to display media content alongside live video
- The session is content-creation focused (vlog, show, podcast)
- Social-media-style engagement (comments, reactions) is expected
- Both CTA and comment features are needed simultaneously

### Decision Flowchart

```
Start
  |
  +-- "Are all participants equal contributors?"
  |     |
  |     Yes --> MEETING
  |     |
  |     No
  |       |
  |       +-- "Is there a live audience that comments/reacts?"
  |             |
  |             Yes --> LIVE STREAM
  |             |
  |             No --> WEBINAR
```

---

## Troubleshooting Guide

### Symptom: Wrong session type loaded in studio

**Diagnostic steps:**
1. Check the URL for `?type=` parameter
2. Check the room's default session type in room settings
3. Verify the URL parameter takes precedence over room default

**Common fixes:**
- Add or correct the `?type=` parameter in the URL
- Update the room's default session type if the parameter is not being used
- Refresh the page after changing the URL

### Symptom: CTA not appearing in session

**Diagnostic steps:**
1. Check if the current layout supports CTA (`supportsCTA = true`)
2. Verify the session type is Webinar or Live Stream (Meetings do not support CTA)
3. Check if a CTA has been configured in the studio elements panel

**Common fixes:**
- Switch to a layout that supports CTA (see matrix above)
- For prominent CTA display, use `offer` (webinar) or `live_cta` (live stream)
- Ensure CTA content has been created in the left sidebar elements panel

### Symptom: Comments overlay not showing

**Diagnostic steps:**
1. Verify the session type is Live Stream (only Live Stream supports comments overlay)
2. Check if the current layout supports comments overlay
3. Verify the comments overlay toggle is enabled in the studio

**Common fixes:**
- Switch to a Live Stream session type
- Use a layout with `supportsCommentsOverlay = true`
- For prominent comments, use the `live_comment` layout
- Toggle the comments overlay ON in the studio controls

### Symptom: Talking points not visible to presenter

**Diagnostic steps:**
1. Verify the session type is Webinar or Live Stream
2. Check if the current layout supports talking points
3. Confirm talking points have been added in the studio
4. Note: `live_media` does NOT support talking points

**Common fixes:**
- Switch to a layout that supports talking points
- Add talking points in the left sidebar elements panel
- Talking points are only visible to the presenter, not the audience

### Symptom: Cannot find expected layout option

**Diagnostic steps:**
1. Layouts are session-type-specific. Verify the correct session type is active.
2. Meeting layouts are ONLY available in Meeting mode
3. Webinar layouts are ONLY available in Webinar mode
4. Live Stream layouts are ONLY available in Live Stream mode

**Common fixes:**
- Change the session type to access the desired layout
- Refer to the layout reference above for which layouts belong to which session type

### Symptom: Layout regions showing wrong proportions

**Diagnostic steps:**
1. Check browser window size (layouts may render differently at small sizes)
2. Verify no CSS/zoom overrides are affecting the canvas
3. Confirm the correct layout is selected (some layouts look similar)

**Common fixes:**
- Maximize the browser window
- Reset browser zoom to 100%
- Try a different layout if the current one doesn't meet needs

---

## Frequently Asked Questions

### Q: Can I switch session types during a live session?
**A:** No. The session type is locked once the session starts. To change the session type, you must end the current session and start a new one with the desired type. You can change the `?type=` parameter in the URL and re-launch.

### Q: Can I use a meeting layout in a webinar?
**A:** No. Layouts are session-type-specific. The `gallery` layout (for example) is only available in Meeting mode. Webinars have their own set of 6 layouts. Each session type has exclusive access to its own layouts.

### Q: How do I show a CTA in a meeting?
**A:** CTAs are not supported in Meeting mode. If you need CTA functionality, switch to Webinar or Live Stream mode. The Webinar `offer` layout and Live Stream `live_cta` layout are specifically designed for prominent CTAs.

### Q: What is the difference between `offer` and `live_cta`?
**A:** `offer` is a Webinar layout (60% presenter + 40% CTA) while `live_cta` is a Live Stream layout (55% host + 45% CTA). The key difference is that `live_cta` also supports comments overlay, while `offer` does not. Additionally, Live Stream mode includes scene switching and other broadcast features.

### Q: Can I have more than 6 participants on the `live_panel` layout?
**A:** The `live_panel` layout is designed for a 3x2 grid (6 participants). If more participants join, the additional participants will not be visible in the grid. For larger groups, consider a different layout or have some participants off-screen.

### Q: Do talking points appear to the audience?
**A:** No. Talking points are visible only to the presenter/host in the studio. The audience sees the video/content output without the talking points overlay. This is a host-side productivity aid, not audience-visible content.

### Q: What does `commentsProminent` mean?
**A:** When `commentsProminent` is `true` (only on `live_comment` layout), it means the comments feed has a dedicated, significant portion of the screen (30%) rather than being a small overlay. This is for streams where engaging with comments is a primary activity.

### Q: Can I customize layout region sizes?
**A:** No. Layout regions have fixed proportions defined by the layout type. You cannot drag to resize regions. If you need different proportions, choose a layout that better matches your desired configuration.

---

## Known Limitations

1. **Session type locked at session start:** Cannot be changed during a live session. The session must be ended and restarted with a different type.

2. **No cross-type layout availability:** Layouts are strictly bound to their session type. You cannot use a Meeting layout in a Webinar or vice versa.

3. **Fixed region proportions:** Layout regions cannot be resized by the user. Proportions are pre-defined (e.g., 60/40, 65/30, 80/20).

4. **No custom layouts:** Users cannot create their own layout configurations. They must choose from the 18 built-in layouts.

5. **Live Stream comments depend on audience platform:** The comments overlay feature requires an active comment feed. If streaming to an external platform, comment integration depends on that platform's API support.

6. **Panel layouts have participant caps:** `panel` (webinar) supports 4 participants in the grid; `live_panel` supports 6. Additional participants are not displayed.

7. **Talking points not available on `live_media`:** The `live_media` layout does not support talking points because it is designed for media-only scenes without a live presenter.

8. **No layout transition animations:** Switching between layouts during a session is instant. There are no crossfade, slide, or other transition effects between layout changes.

---

## Plan Requirements

| Feature | Basic Plan | Business Plan |
|---------|-----------|---------------|
| Meeting session type | Yes | Yes |
| Webinar session type | Yes | Yes |
| Live Stream session type | No | Yes |
| All 5 Meeting layouts | Yes | Yes |
| All 6 Webinar layouts | Yes | Yes |
| All 7 Live Stream layouts | No (requires Business) | Yes |
| CTA support | No | Yes |
| Talking points | No | Yes |
| Comments overlay | No | Yes |
| Custom scenes | No | Yes |
| Media scenes | No | Yes |

**Note:** Basic plan users who attempt to select Live Stream or use CTA/talking points features will see an upgrade prompt directing them to the Business plan.

---

## Related Documents

- [05 - Authentication and Access](./05-authentication-and-access.md) - Permissions required to create sessions and manage rooms
- [06 - Rooms Management](./06-rooms-management.md) - Rooms are the containers for sessions; default session type is a room property
- [08 - Studio Interface](./08-studio-interface.md) - The studio UI where layouts are applied and sessions are run
- [09 - Studio Media Controls](./09-studio-media-controls.md) - Camera, microphone, and media controls available within sessions
