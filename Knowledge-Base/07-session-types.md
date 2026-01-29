# Session Types and Layouts

## Overview

R-Link supports three distinct session types, each designed for a different use case: **Meeting** for collaborative group sessions, **Webinar** for host-led presentations with audience interaction, and **Live Stream** for production-quality broadcasting to external platforms. Each session type has its own set of available layouts, supported features, and default configurations. Understanding the differences between session types is essential for helping customers choose the right mode for their needs and for troubleshooting layout and feature availability issues.

The session type is set at the room level and determines the entire Studio experience -- which layouts appear in the layout switcher, which overlays are available, and which controls appear in the bottom toolbar.

---

## Session Type Comparison Matrix

| Attribute | Meeting | Webinar | Live Stream |
|---|---|---|---|
| **ID** | `meeting` | `webinar` | `live` |
| **Description** | Collaborative sessions where everyone can participate | Host-led presentations with audience interaction | Production-quality streaming to external platforms |
| **Default Layout** | `gallery` | `stage_host` | `live_host` |
| **Number of Layouts** | 5 | 6 | 7 |
| **Key Features** | Gallery view, screen sharing, equal participation | CTA, talking points, stage-focused, audience Q&A | Scenes, comments overlay, media scenes, CTA, talking points |
| **Participant Model** | All participants are equal | Host + guests on stage; audience watches | Host + optional guests; audience on external platforms |
| **Max Participants** | Up to 50 (Basic) / 100 (Business) | Up to 100 interactive + 1,000 attendees (Business) | Host + guests in Studio; unlimited external viewers |
| **Plan Availability** | Basic and Business | Business only | Business only |
| **URL Parameter** | `?type=meeting` | `?type=webinar` | `?type=livestream` |
| **CTA Support** | No | Yes (multiple layouts) | Yes (multiple layouts) |
| **Talking Points** | No | Yes | Yes |
| **Comments Overlay** | No | No | Yes |
| **Scenes** | No | No | Yes |
| **Screen Sharing** | Yes (dedicated layouts) | Yes (content layouts) | Yes (media layouts) |
| **Q&A** | No (use chat) | Yes (dedicated Q&A panel) | No (use comments) |
| **Breakout Rooms** | Yes | No | No |

---

## Meeting Mode

### Description

Meeting mode is designed for collaborative sessions where all participants have equal status. There is no "host vs. audience" distinction in the layout -- everyone appears in the same grid or arrangement. This is the session type available on both Basic and Business plans and is the default choice for team meetings, standups, client calls, and any session where equal participation is desired.

### Features

| Feature | Description |
|---|---|
| `gallery` | Grid-based view where all participants are shown equally |
| `screen-share` | Any participant can share their screen |
| `equal-participation` | No host/audience distinction; all participants have the same UI |

### Meeting Layouts

#### 1. Gallery (`gallery`) -- Default

| Property | Value |
|---|---|
| Name | Gallery |
| Description | Grid layout showing all participants in a 2x2 grid |
| Grid Configuration | 2 columns x 2 rows |
| Best For | Small to medium group discussions (2-4 visible participants) |
| Supports CTA | No |
| Supports Talking Points | No |
| Supports Comments Overlay | No |

**Region Layout:**
- All participants are displayed in equally-sized tiles in a 2x2 grid.
- Additional participants beyond 4 are paginated or shown in a scrollable area.

#### 2. Speaker + Filmstrip (`speaker_filmstrip`)

| Property | Value |
|---|---|
| Name | Speaker + Filmstrip |
| Description | Active speaker featured prominently with other participants in a filmstrip |
| Layout | Featured speaker takes ~75% of the canvas; filmstrip of other participants on the side |
| Best For | Discussions where one person speaks at a time |
| Supports CTA | No |
| Supports Talking Points | No |
| Supports Comments Overlay | No |

**Region Layout:**
- `featured`: Large area for the active speaker (approximately 75% of canvas).
- `filmstrip`: Horizontal or vertical strip showing thumbnails of other participants (approximately 25% of canvas).

#### 3. Screen + Thumbnails (`screen_thumbnails`)

| Property | Value |
|---|---|
| Name | Screen + Thumbnails |
| Description | Shared screen takes 80% of the canvas with participant thumbnails in a 20% sidebar |
| Layout | Screen share content dominates; participants in sidebar |
| Best For | Screen sharing presentations, code reviews, document collaboration |
| Supports CTA | No |
| Supports Talking Points | No |
| Supports Comments Overlay | No |

**Region Layout:**
- `screen`: Shared screen content (80% of canvas width).
- `sidebar`: Participant thumbnails (20% of canvas width).

#### 4. Presenter PiP (`presenter_pip`)

| Property | Value |
|---|---|
| Name | Presenter Picture-in-Picture |
| Description | Shared content fills the screen with the presenter in a small PiP overlay |
| Layout | Content fullscreen; presenter in a small corner overlay |
| Best For | Presentations where the content should be the primary focus |
| Supports CTA | No |
| Supports Talking Points | No |
| Supports Comments Overlay | No |

**Region Layout:**
- `content`: Full canvas (100%) for shared screen or presentation.
- `pip`: Small picture-in-picture window for the presenter (typically bottom-right corner).

#### 5. Focus (`focus`)

| Property | Value |
|---|---|
| Name | Focus |
| Description | Single participant displayed fullscreen |
| Layout | Solo view of one participant |
| Best For | Spotlight on a single speaker, one-on-one calls |
| Supports CTA | No |
| Supports Talking Points | No |
| Supports Comments Overlay | No |

**Region Layout:**
- `solo`: Single participant fills the entire canvas (100%).

---

## Webinar Mode

### Description

Webinar mode is designed for host-led presentations where one or more hosts present to an audience. The layout is stage-focused, meaning hosts and guests appear on the "stage" while attendees watch and interact through Q&A and chat. Webinars support call-to-action (CTA) overlays, talking points for the presenter, and audience Q&A functionality. This session type is available only on the Business plan and supports up to 1,000 attendees.

### Features

| Feature | Description |
|---|---|
| `cta` | Call-to-action overlays and panels for audience engagement |
| `talking-points` | Presenter notes and talking points displayed as overlays |
| `stage-focused` | Layout emphasizes host/speaker; audience is not shown on screen |
| `audience-qa` | Dedicated Q&A panel for audience questions and host responses |

### Webinar Layouts

#### 1. Stage Host (`stage_host`) -- Default

| Property | Value |
|---|---|
| Name | Stage Host |
| Description | Host displayed fullscreen with lower-third name banner and logo |
| Layout | Host full canvas + lower-third overlay + logo overlay |
| Best For | Solo presentations, keynotes, announcements |
| Supports CTA | Yes |
| Supports Talking Points | Yes |
| Supports Comments Overlay | No |

**Region Layout:**
- `host`: Full canvas showing the host's video.
- `lower_third`: Overlay banner at the bottom showing host name/title.
- `logo`: Brand logo overlay (typically top corner).

#### 2. Interview (`interview`)

| Property | Value |
|---|---|
| Name | Interview |
| Description | Split screen with host on one side and guest on the other, each with lower-third banners |
| Layout | Left/right split + individual lower-thirds |
| Best For | Interviews, two-person discussions, fireside chats |
| Supports CTA | Yes |
| Supports Talking Points | Yes |
| Supports Comments Overlay | No |

**Region Layout:**
- `left`: Host video (50% of canvas).
- `right`: Guest video (50% of canvas).
- `lower_third_left`: Lower-third for the host.
- `lower_third_right`: Lower-third for the guest.

#### 3. Panel (`panel`)

| Property | Value |
|---|---|
| Name | Panel |
| Description | Grid layout for multiple speakers in a 2x2 arrangement |
| Layout | 2x2 grid for up to 4 panelists |
| Best For | Panel discussions, multi-speaker events |
| Supports CTA | Yes |
| Supports Talking Points | Yes |
| Supports Comments Overlay | No |

**Region Layout:**
- Grid of 2 columns x 2 rows, each cell showing one panelist.

#### 4. Content Focus (`content_focus`)

| Property | Value |
|---|---|
| Name | Content Focus |
| Description | Slides or shared content displayed fullscreen |
| Layout | Content fills the entire canvas |
| Best For | Slide presentations, document reviews where the host's face is not needed |
| Supports CTA | Yes |
| Supports Talking Points | Yes |
| Supports Comments Overlay | No |

**Region Layout:**
- `content`: Full canvas (100%) for slides or shared content.

#### 5. Content + Host PiP (`content_host_pip`)

| Property | Value |
|---|---|
| Name | Content + Host PiP |
| Description | Slides fullscreen with host in a picture-in-picture overlay and lower-third |
| Layout | Content fills canvas; host in small PiP window; lower-third overlay |
| Best For | Presentations where the audience should see both slides and the presenter |
| Supports CTA | Yes |
| Supports Talking Points | Yes |
| Supports Comments Overlay | No |

**Region Layout:**
- `content`: Full canvas (100%) for slides or shared content.
- `pip`: Small picture-in-picture window for the host.
- `lower_third`: Overlay banner for the host.

#### 6. Offer (`offer`)

| Property | Value |
|---|---|
| Name | Offer |
| Description | Host takes 60% of the screen with a CTA panel taking 40% |
| Layout | Host video on the left; CTA/offer panel on the right |
| Best For | Sales presentations, product offers, enrollment calls-to-action |
| Supports CTA | Yes (CTA is prominent -- `ctaProminent: true`) |
| Supports Talking Points | Yes |
| Supports Comments Overlay | No |

**Region Layout:**
- `host`: Host video (60% of canvas).
- `cta_panel`: Call-to-action panel (40% of canvas).

---

## Live Stream Mode

### Description

Live Stream mode is designed for production-quality broadcasting to external platforms such as YouTube, Facebook Live, Twitch, and LinkedIn Live via RTMP. It offers the most advanced layout and overlay options, including scene management, comments overlay from external platforms, media playback, and CTA panels. This session type is available only on the Business plan and provides tools for professional live production without external software.

### Features

| Feature | Description |
|---|---|
| `scenes` | Multiple pre-configured layouts that can be switched during the stream |
| `comments-overlay` | Display external platform comments overlaid on the stream |
| `media-scenes` | Full-screen media playback (video, images) as scenes |
| `cta` | Call-to-action overlays and panels |
| `talking-points` | Presenter talking points displayed as overlays |

### Live Stream Layouts

#### 1. Live Host (`live_host`) -- Default

| Property | Value |
|---|---|
| Name | Live Host |
| Description | Host displayed with lower-third and logo, optimized for streaming |
| Layout | Host full canvas + lower-third + logo |
| Best For | Solo streaming, vlogs, commentary |
| Supports CTA | Yes |
| Supports Talking Points | Yes |
| Supports Comments Overlay | Yes |

**Region Layout:**
- `host`: Full canvas showing the host's video.
- `lower_third`: Name/title banner overlay.
- `logo`: Brand logo overlay.

#### 2. Live Interview (`live_interview`)

| Property | Value |
|---|---|
| Name | Live Interview |
| Description | Split screen for host and guest with individual lower-thirds |
| Layout | Left/right split + lower-thirds |
| Best For | Live interviews, co-hosted streams |
| Supports CTA | Yes |
| Supports Talking Points | Yes |
| Supports Comments Overlay | Yes |

**Region Layout:**
- `left`: Host video (50%).
- `right`: Guest video (50%).
- `lower_third_left`: Host lower-third.
- `lower_third_right`: Guest lower-third.

#### 3. Live Panel (`live_panel`)

| Property | Value |
|---|---|
| Name | Live Panel |
| Description | Grid layout optimized for streaming with up to 6 participants in a 3x2 grid |
| Layout | 3 columns x 2 rows |
| Best For | Live panel discussions, group streams |
| Supports CTA | Yes |
| Supports Talking Points | Yes |
| Supports Comments Overlay | Yes |

**Region Layout:**
- Grid of 3 columns x 2 rows, supporting up to 6 participants.

#### 4. Live Media (`live_media`)

| Property | Value |
|---|---|
| Name | Live Media |
| Description | Media content (video, image, or presentation) displayed fullscreen |
| Layout | Media fills the entire canvas |
| Best For | Playing pre-recorded videos, showing images, media breaks during streams |
| Supports CTA | Yes |
| Supports Talking Points | No |
| Supports Comments Overlay | Yes |

**Region Layout:**
- `media`: Full canvas (100%) for media content.

#### 5. Live Media + PiP (`live_media_pip`)

| Property | Value |
|---|---|
| Name | Live Media + Host PiP |
| Description | Media content fullscreen with host in a picture-in-picture overlay |
| Layout | Media fills canvas; host in small PiP |
| Best For | Commenting over media playback, reaction streams |
| Supports CTA | Yes |
| Supports Talking Points | Yes |
| Supports Comments Overlay | Yes |

**Region Layout:**
- `media`: Full canvas (100%) for media content.
- `pip`: Small picture-in-picture window for the host.

#### 6. Live Comment (`live_comment`)

| Property | Value |
|---|---|
| Name | Live Comment |
| Description | Host takes 65% of the screen with a comment display box taking 30% |
| Layout | Host video on the left; comments panel on the right |
| Best For | Engaging with audience comments, Q&A streams, community interaction |
| Supports CTA | Yes |
| Supports Talking Points | Yes |
| Supports Comments Overlay | Yes (`commentsProminent: true`) |

**Region Layout:**
- `host`: Host video (65% of canvas).
- `comments`: Comment display box (30% of canvas, with 5% margin/spacing).

#### 7. Live CTA (`live_cta`)

| Property | Value |
|---|---|
| Name | Live CTA |
| Description | Host takes 55% of the screen with a CTA panel taking 45% |
| Layout | Host video on the left; CTA panel on the right |
| Best For | Product launches, sales streams, donation drives |
| Supports CTA | Yes (`ctaProminent: true`) |
| Supports Talking Points | Yes |
| Supports Comments Overlay | Yes |

**Region Layout:**
- `host`: Host video (55% of canvas).
- `cta_panel`: CTA panel (45% of canvas).

---

## Feature Support Matrix by Layout

### CTA Support

| Layout | Session Type | Supports CTA | CTA Prominent |
|---|---|---|---|
| gallery | Meeting | No | -- |
| speaker_filmstrip | Meeting | No | -- |
| screen_thumbnails | Meeting | No | -- |
| presenter_pip | Meeting | No | -- |
| focus | Meeting | No | -- |
| stage_host | Webinar | Yes | No |
| interview | Webinar | Yes | No |
| panel | Webinar | Yes | No |
| content_focus | Webinar | Yes | No |
| content_host_pip | Webinar | Yes | No |
| offer | Webinar | Yes | **Yes** |
| live_host | Live Stream | Yes | No |
| live_interview | Live Stream | Yes | No |
| live_panel | Live Stream | Yes | No |
| live_media | Live Stream | Yes | No |
| live_media_pip | Live Stream | Yes | No |
| live_comment | Live Stream | Yes | No |
| live_cta | Live Stream | Yes | **Yes** |

### Talking Points Support

| Layout | Session Type | Supports Talking Points |
|---|---|---|
| gallery | Meeting | No |
| speaker_filmstrip | Meeting | No |
| screen_thumbnails | Meeting | No |
| presenter_pip | Meeting | No |
| focus | Meeting | No |
| stage_host | Webinar | Yes |
| interview | Webinar | Yes |
| panel | Webinar | Yes |
| content_focus | Webinar | Yes |
| content_host_pip | Webinar | Yes |
| offer | Webinar | Yes |
| live_host | Live Stream | Yes |
| live_interview | Live Stream | Yes |
| live_panel | Live Stream | Yes |
| live_media | Live Stream | No |
| live_media_pip | Live Stream | Yes |
| live_comment | Live Stream | Yes |
| live_cta | Live Stream | Yes |

### Comments Overlay Support

| Layout | Session Type | Supports Comments | Comments Prominent |
|---|---|---|---|
| All Meeting layouts | Meeting | No | -- |
| All Webinar layouts | Webinar | No | -- |
| live_host | Live Stream | Yes | No |
| live_interview | Live Stream | Yes | No |
| live_panel | Live Stream | Yes | No |
| live_media | Live Stream | Yes | No |
| live_media_pip | Live Stream | Yes | No |
| live_comment | Live Stream | Yes | **Yes** |
| live_cta | Live Stream | Yes | No |

---

## Choosing the Right Session Type

### When to Use Meeting Mode

- Internal team meetings and standups
- Client calls and consultations
- Collaborative brainstorming sessions
- Small group discussions (up to 50 or 100 participants)
- Any session where all participants should be on equal footing
- When you need breakout rooms
- When you are on the Basic plan (Meeting is the only option)

### When to Use Webinar Mode

- Product demos and launch events
- Educational workshops and training sessions
- Town halls and all-hands meetings with large audiences
- Sales presentations with CTAs
- Events with audience Q&A
- Sessions with up to 1,000 attendees (Business plan)
- When the host needs talking points on screen

### When to Use Live Stream Mode

- Broadcasting to YouTube, Facebook, Twitch, or LinkedIn Live
- Podcast-style shows with audience engagement
- Product launches with commerce features (CTA, checkout)
- Events that need professional production quality
- Streams that incorporate pre-recorded media playback
- Sessions that display audience comments on screen
- Multi-platform simultaneous streaming

---

## URL Parameters for Session Types

The session type is passed as a URL parameter when launching the Studio:

| Parameter Value | Session Type |
|---|---|
| `?type=meeting` | Meeting |
| `?type=webinar` | Webinar |
| `?type=livestream` | Live Stream |

Additional URL parameters:

| Parameter | Description | Example |
|---|---|---|
| `name` | Session/room name displayed in the Studio | `?name=Product%20Launch` |
| `room_id` | Room identifier for loading room configuration | `?room_id=abc123` |

**Note**: The `type` parameter value for Live Stream is `livestream` (one word, no hyphen, no space).

---

## Settings and Options

### Session Type Selection

| Setting | Where | Notes |
|---|---|---|
| Room session type | Admin Portal > Rooms > Create/Edit Room | Set at room creation; can be changed later |
| URL override | Studio URL `?type=` parameter | Overrides room default if different |

### Layout Switching

- During a live session, the host can switch between available layouts using the **Layout Switcher Bar**.
- Only layouts for the current session type are shown.
- Layout changes take effect immediately for all participants/viewers.
- The default layout loads when the Studio first opens.

### Feature Toggles

| Feature | Toggle Location | Notes |
|---|---|---|
| CTA | Studio > CTA Modal | Available in Webinar and Live Stream layouts that support CTA |
| Talking Points | Studio > Talking Points Modal | Available in Webinar and Live Stream |
| Comments Overlay | Studio > Overlay Manager | Available in Live Stream only |
| Q&A | Studio > Right Sidebar > Q&A tab | Available in Webinar only |
| Scenes | Studio > Stage Panel | Available in Live Stream only |

---

## Troubleshooting

### Issue: Customer Cannot Find a Specific Layout

| Step | Action |
|---|---|
| 1 | Verify the session type -- layouts are session-type-specific |
| 2 | Meeting mode has 5 layouts, Webinar has 6, Live Stream has 7 |
| 3 | Check the URL `?type=` parameter to confirm the correct session type is loaded |
| 4 | If the customer is looking for a Webinar or Live Stream layout, confirm they are on the Business plan |

### Issue: CTA Button/Panel Not Available

| Step | Action |
|---|---|
| 1 | CTA is only available in Webinar and Live Stream modes, not Meeting |
| 2 | Verify the current layout supports CTA (see Feature Support Matrix above) |
| 3 | For prominent CTA display, use the "offer" layout (Webinar) or "live_cta" layout (Live Stream) |

### Issue: Comments Overlay Not Showing

| Step | Action |
|---|---|
| 1 | Comments overlay is only available in Live Stream mode |
| 2 | Verify the stream is connected to an external platform (YouTube, Facebook, etc.) |
| 3 | Check that the overlay is enabled in the Overlay Manager |
| 4 | For prominent comments, use the "live_comment" layout |

### Issue: Customer Wants to Change Session Type Mid-Session

| Step | Action |
|---|---|
| 1 | Session type cannot be changed during a live session |
| 2 | The customer must end the current session, change the room's session type in the Admin Portal, and relaunch |
| 3 | Alternatively, create a new room with the desired session type |

### Issue: URL Shows Wrong Session Type

| Step | Action |
|---|---|
| 1 | The `?type=` URL parameter determines the session type |
| 2 | If the URL says `?type=meeting` but the customer expected a webinar, the room may be configured as a meeting |
| 3 | Check the room settings in the Admin Portal |
| 4 | Relaunch from the Admin Portal to ensure correct URL parameters |

---

## FAQ

**Q: Can I switch between Meeting, Webinar, and Live Stream during a live session?**
A: No. The session type is fixed for the duration of a session. You must end the session, change the room's session type, and relaunch.

**Q: Why can't I see the Webinar or Live Stream option when creating a room?**
A: Webinar and Live Stream are Business plan features. If you are on the Basic plan, only Meeting is available. Upgrade to the Business plan to access all three session types.

**Q: What's the difference between a Webinar and a Live Stream?**
A: Webinars are hosted within R-Link with attendees joining via browser. Live Streams are broadcast to external platforms (YouTube, Facebook, Twitch, etc.) via RTMP. Webinars have built-in Q&A; Live Streams have comments overlay from external platforms.

**Q: How many people can join each session type?**
A: Meeting: up to 50 (Basic) or 100 (Business) interactive participants. Webinar: up to 100 interactive participants + up to 1,000 view-only attendees (Business). Live Stream: host + guests in Studio, with unlimited viewers on external platforms.

**Q: Can I use CTA in a Meeting?**
A: No. CTA is only available in Webinar and Live Stream session types. If you need CTA, switch to Webinar or Live Stream mode.

**Q: What is the "offer" layout?**
A: The "offer" layout is a Webinar layout that dedicates 40% of the screen to a CTA panel, making it ideal for sales presentations, product offers, and enrollment drives. The host appears in the remaining 60%.

**Q: Can I customize the layout regions (change sizes, positions)?**
A: Layout region configurations are predefined and cannot be customized by users. Each layout has fixed proportions as described in this document.

**Q: What happens if I launch a room with an invalid `?type=` parameter?**
A: If the type parameter is invalid or missing, the Studio defaults to the room's configured session type. If no room is specified, it defaults to Meeting mode.

---

## Known Limitations

1. **Session type cannot be changed mid-session**: The host must end and relaunch to switch types.
2. **Layout regions are not customizable**: Proportions and positions are fixed per layout.
3. **Meeting mode has no CTA, talking points, or comments overlay**: These features are exclusive to Webinar and Live Stream.
4. **Webinar has no comments overlay**: Comments overlay is Live Stream only.
5. **Live Stream has no built-in Q&A**: Use comments from external platforms instead.
6. **Gallery grid is fixed at 2x2**: Cannot be changed to 3x3 or other configurations.
7. **Live panel grid is fixed at 3x2 (max 6)**: Cannot accommodate more than 6 visible participants.
8. **Basic plan is limited to Meeting mode**: No Webinar or Live Stream access.
9. **No hybrid session type**: Cannot combine Meeting and Webinar features in a single session.

---

## Plan Requirements

| Feature | Basic | Business |
|---|---|---|
| Meeting session type | Yes | Yes |
| Webinar session type | No | Yes |
| Live Stream session type | No | Yes |
| Meeting layouts (all 5) | Yes | Yes |
| Webinar layouts (all 6) | -- | Yes |
| Live Stream layouts (all 7) | -- | Yes |
| CTA support | No (Meeting only) | Yes (Webinar/Live Stream) |
| Talking Points | No (Meeting only) | Yes (Webinar/Live Stream) |
| Comments Overlay | No | Yes (Live Stream) |
| Q&A | No | Yes (Webinar) |
| Scenes | No | Yes (Live Stream) |
| Max interactive participants | 50 | 100 |
| Max webinar attendees | -- | 1,000 |
| External streaming (RTMP) | No | Yes |

---

## Related Documents

- [06-rooms-management.md](./06-rooms-management.md) -- Creating and configuring rooms with session types
- [08-studio-interface.md](./08-studio-interface.md) -- Studio interface components for each session type
- [09-studio-media-controls.md](./09-studio-media-controls.md) -- Media controls available across all session types
- [01-platform-overview.md](./01-platform-overview.md) -- Platform architecture and session type overview
- [02-plans-and-pricing.md](./02-plans-and-pricing.md) -- Plan-based feature availability
