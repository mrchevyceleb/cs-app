# Studio Presentations

## Overview

R-Link's Studio includes a full presentation system that allows hosts to create, upload, manage, and deliver slide-based presentations within live sessions. The system supports file-based presentations (including PDF uploads), slide-by-slide navigation with configurable transitions, previewing before presenting, sharing with participants, and a planned AI slide generator. Presentations are rendered directly on the Studio stage, providing a seamless visual experience alongside video, chat, and other Studio features.

---

## Creating Presentations

### How Presentation Creation Works

Presentations are created and configured through the **PresentationElementModal**, which provides a full interface for uploading files, configuring slides, and setting presentation options.

**Core Components:**
- **PresentationElementModal** -- The host-facing modal for creating and editing presentation elements.

### Presentation Data Structure

Each presentation element stores the following data:

**Top-Level Element Data:**
| Field | Type | Description |
|-------|------|-------------|
| `fileUrl` | string | URL to the uploaded presentation file (top level of element data) |
| `fileType` | string | The type of the uploaded file (e.g., PDF) (top level of element data) |

**Active Presentation State (`activePresentation`):**
| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier for the presentation |
| `name` | string | Display name of the presentation |
| `slides` | array | Array of slide objects contained in the presentation |
| `file_url` | string | URL to the presentation file |
| `navigation` | object | Navigation configuration (controls how slides are navigated) |
| `transition` | string | Slide transition type (default: `fade`) |

**Presentation State (`presentationState`):**
| Field | Type | Description |
|-------|------|-------------|
| `status` | enum | Current presentation status: `idle` or `active` |
| `currentSlide` | number/string | Index or identifier of the currently displayed slide |

### Step-by-Step: Creating a Presentation

1. The host opens the presentation tool from the Studio toolbar or element menu.
2. The **PresentationElementModal** appears.
3. The host uploads a presentation file. The file is stored at `fileUrl` (top level of element data) and the file type is recorded in `fileType`.
4. The system processes the uploaded file and extracts individual slides into the `slides` array.
5. The host enters a name for the presentation (`name` field).
6. The host configures navigation settings and transition type (defaults to `fade`).
7. The host saves the presentation element, which is ready to be presented, previewed, or shared.

### Supported File Types

The presentation system accepts file uploads via URL (`file_url` / `fileUrl`). PDF is a confirmed supported format, as evidenced by the **TestPresentationViewer** component (which uses a hardcoded PDF for testing). Additional file types may be supported depending on the platform's processing capabilities.

---

## Slide Management

### Working with Slides

The `slides` array in the `activePresentation` object contains all slides for the current presentation. Each slide represents a single page or view within the presentation.

### Navigation

The `navigation` object in the `activePresentation` controls how slides are navigated:
- Navigation settings define whether the host controls slide advancement exclusively or whether participants can navigate independently.
- The `currentSlide` field in `presentationState` tracks which slide is currently being displayed.

### Transitions

The `transition` field in the `activePresentation` object defines how slides animate when changing:
- **`fade`** -- The default transition. Slides fade in and out smoothly when navigating between them.
- Additional transition types may be added in future updates.

---

## AI Slide Generator

### Status: Planned Feature

The AI slide generator is a planned capability that will allow hosts to generate presentation slides automatically using AI. Based on platform development plans, this feature will:
- Accept a topic, outline, or prompt from the host.
- Generate slide content (text, layout, and potentially images) using AI.
- Produce a complete slide deck that can be further edited and presented.

**Note:** This feature is referenced in development plans but may not yet be fully available. Check the latest platform release notes for current availability.

---

## Presenting

### How Presenting Works

When a host activates a presentation, it is rendered on the Studio stage for all participants to see. The host controls slide navigation in real time.

**Core Components:**
- **PresentationStageRenderer** -- The renderer that displays the active presentation on the Studio stage.

### Step-by-Step: Delivering a Presentation

1. The host selects a previously created presentation to present.
2. The presentation is loaded into the `activePresentation` state with all slide data, navigation config, and transition settings.
3. The `presentationState.status` changes from `idle` to `active`.
4. The **PresentationStageRenderer** renders the first slide on the Studio stage.
5. The `presentationState.currentSlide` is set to the first slide.
6. The host navigates through slides using the presentation controls:
   - **Next slide** -- Advances `currentSlide` to the next slide in the `slides` array.
   - **Previous slide** -- Moves `currentSlide` to the previous slide.
   - **Jump to slide** -- Sets `currentSlide` to a specific slide index.
7. Each slide change triggers the configured `transition` animation (default: `fade`).
8. All participants see the slide changes in real time via the **PresentationStageRenderer**.
9. When finished, the host ends the presentation, setting `presentationState.status` back to `idle`.

### Current Slide Tracking

The `presentationState.currentSlide` field is the authoritative source for which slide is currently being displayed:
- It updates in real time as the host navigates.
- The **PresentationStageRenderer** reads this value to determine which slide to render.
- Participants' views stay synchronized with the host's current slide.

---

## Previewing Presentations

### How Preview Works

The **PresentationPreviewModal** allows the host to preview a presentation before presenting it live. This is useful for reviewing content, checking slide order, and verifying that the file uploaded correctly.

**Core Components:**
- **PresentationPreviewModal** -- The modal displaying a preview of the presentation for the host only.
- **TestPresentationViewer** -- A development/testing component that renders a hardcoded PDF for verification purposes.

### Step-by-Step: Previewing a Presentation

1. The host selects a presentation from their list of created presentations.
2. The host clicks the preview option.
3. The **PresentationPreviewModal** opens, showing the presentation slides.
4. The host can navigate through slides within the preview to review content.
5. The preview is visible only to the host -- participants do not see the preview.
6. The host closes the preview modal when finished reviewing.

---

## Sharing Presentations

### How Sharing Works

The **PresentationShareModal** provides a mechanism for hosts to share presentations with participants or external parties outside of the live presentation context.

**Core Components:**
- **PresentationShareModal** -- The modal for sharing presentation files and links.

### Step-by-Step: Sharing a Presentation

1. The host selects a presentation from their list.
2. The host clicks the share option.
3. The **PresentationShareModal** opens with sharing options.
4. The host configures sharing settings (e.g., who can access, expiration).
5. The host generates a share link or sends the presentation directly.
6. Recipients can access the shared presentation content.

---

## Google Slides Integration

### Status: Integration Reference

Google Slides integration is referenced in the platform's feature scope. The current status of this integration should be verified against the latest platform documentation and release notes. When available, Google Slides integration would allow:
- Importing presentations directly from Google Slides.
- Syncing slide updates from the Google Slides source.
- Maintaining formatting and layout from the original Google Slides presentation.

**Note:** Check with platform support or the latest release notes for the current availability of Google Slides integration.

---

## Settings and Options

| Setting | Scope | Description |
|---------|-------|-------------|
| `fileUrl` | Per-element | URL of the uploaded presentation file |
| `fileType` | Per-element | Type of the uploaded file (e.g., PDF) |
| `name` | Per-presentation | Display name of the presentation |
| `transition` | Per-presentation | Slide transition animation (default: `fade`) |
| `navigation` | Per-presentation | Navigation configuration object |
| `currentSlide` | Per-session (live) | Currently displayed slide during active presentation |

---

## Troubleshooting

### Presentation file not loading
- Verify the `fileUrl` is accessible and points to a valid file.
- Check the `fileType` to ensure it is a supported format.
- Ensure the file was fully uploaded before attempting to present.
- Try re-uploading the file if the URL appears broken.

### Slides not displaying on stage
- Verify `presentationState.status` is `active`.
- Check that the `activePresentation` object contains a valid `slides` array with at least one entry.
- Ensure the **PresentationStageRenderer** is not obscured by other stage elements.

### Slide navigation not working
- Confirm the host is using the presentation controls (not browser navigation).
- Check that `presentationState.currentSlide` is updating when navigation buttons are clicked.
- Verify the `navigation` configuration is properly set.

### Transition not animating
- Verify the `transition` field is set (default is `fade`).
- If using a non-default transition, ensure it is a supported transition type.
- Check for performance issues that might cause animations to skip.

### Preview not showing correct content
- Ensure the presentation file was fully processed after upload.
- Verify the `slides` array contains the expected number of entries.
- Try re-uploading the presentation file.

### Participants not seeing the presentation
- Confirm `presentationState.status` is `active` (not `idle`).
- Ensure participants have a stable connection to the session.
- Check that the presentation element is visible on the stage layout.

### Shared presentation link not working
- Verify the share link has not expired.
- Check that the recipient has the necessary permissions to access the shared content.
- Ensure the presentation file is still available at the stored `fileUrl`.

---

## FAQ

**Q: What file formats are supported for presentations?**
A: PDF is a confirmed supported format. The system accepts files via URL upload (`fileUrl`). Additional formats may be supported depending on the platform's current processing capabilities.

**Q: Can participants navigate slides independently?**
A: This depends on the `navigation` configuration set by the host. By default, the host controls slide navigation for all participants. Independent navigation may be available as a configurable option.

**Q: What slide transitions are available?**
A: The default transition is `fade`, which provides a smooth fade animation between slides. Additional transition types may be added in future platform updates.

**Q: Is the AI slide generator available now?**
A: The AI slide generator is a planned feature referenced in development plans. Check the latest platform release notes for current availability.

**Q: Can I present while other stage elements are active?**
A: Yes, the presentation renders on the Studio stage via the **PresentationStageRenderer** and can coexist with other stage elements depending on the stage layout configuration.

**Q: Can I edit a presentation after creating it?**
A: Yes, the **PresentationElementModal** supports editing existing presentations. You can update the file, name, navigation settings, and transitions.

**Q: How does the current slide sync across participants?**
A: The `presentationState.currentSlide` value is synchronized in real time. When the host changes slides, all participant views update to show the same slide via the **PresentationStageRenderer**.

**Q: Can I preview a presentation without showing it to participants?**
A: Yes, the **PresentationPreviewModal** is host-only and does not affect the stage or participant views.

**Q: Is Google Slides integration available?**
A: Google Slides integration is referenced in the platform's feature scope. Check with platform support or the latest release notes for current availability status.

---

## Known Limitations

- Only one presentation can be active on stage at a time.
- The `transition` type currently defaults to `fade`; additional transition options may be limited.
- The AI slide generator is a planned feature and may not yet be available.
- Google Slides integration status should be verified against current platform capabilities.
- Very large presentation files (many slides or high-resolution images) may take longer to process and load.
- The **TestPresentationViewer** component is for development/testing purposes and uses a hardcoded PDF; it is not intended for production use.
- Presentation files are stored by URL reference (`fileUrl`); if the source file is moved or deleted, the presentation will fail to load.

---

## Plan Requirements

| Feature | Basic Plan | Business Plan |
|---------|-----------|---------------|
| Create Presentations | Available | Available |
| Present on Stage | Available | Available |
| Preview Presentations | Available | Available |
| Share Presentations | Available | Available |
| Slide Transitions | Available | Available |
| AI Slide Generator | Planned | Planned |

Presentation features are available across both plans.

---

## Related Documents

- [01 - Platform Overview](01-platform-overview.md) -- General platform capabilities and session modes.
- [17 - Studio Commerce](17-studio-commerce.md) -- Commerce features that can accompany presentations.
- [18 - Studio Collaboration](18-studio-collaboration.md) -- Collaboration tools (whiteboard, breakout rooms) used alongside presentations.
- [20 - Studio Translation & Captions](20-studio-translation-captions.md) -- Captions for multilingual presentation audiences.
- [21 - Studio Notetaker & Transcription](21-studio-notetaker-transcription.md) -- Transcription of presentation sessions.
