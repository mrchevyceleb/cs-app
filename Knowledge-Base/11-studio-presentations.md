# 11 - Studio Presentations

## Overview

R-Link Studio includes a full-featured presentation system that enables hosts to create, upload, manage, and deliver slide-based presentations during live sessions. The system supports manual file uploads, an AI-powered presentation generator, customizable navigation and transition effects, real-time presenting with audience sync, preview modes, and sharing capabilities through the SharedPresentation entity. Presentations are first-class elements in Studio, appearing on the stage alongside video, chat, and other interactive elements.

---

## Table of Contents

1. [Creating Presentations](#creating-presentations)
2. [File Upload](#file-upload)
3. [AI Presentation Generator](#ai-presentation-generator)
4. [Managing Presentations](#managing-presentations)
5. [Navigation & Transitions](#navigation--transitions)
6. [Presenting](#presenting)
7. [Previewing](#previewing)
8. [Sharing Presentations](#sharing-presentations)
9. [SharedPresentation Entity](#sharedpresentation-entity)
10. [Active Presentation & State](#active-presentation--state)
11. [Common Questions & Troubleshooting](#common-questions--troubleshooting)
12. [Technical Reference](#technical-reference)

---

## Creating Presentations

### What It Is

Presentations in R-Link Studio can be created in two ways: by uploading an existing file (e.g., PDF, PowerPoint) or by using the AI Presentation Generator to create slides from a text prompt. Both methods produce a presentation element that can be added to the Studio stage and presented during live sessions.

### Methods of Creation

| Method | Description | Best For |
|--------|-------------|----------|
| **File Upload** | Upload an existing presentation file (PDF, PPTX, or other supported formats) to the platform. The file is processed and converted into slides. | Hosts who already have a prepared presentation in a standard format. |
| **AI Generator** | Use the **AIPresentationGenerator** to create a presentation from a text description or topic. The AI generates slides with content, structure, and layout. | Quick creation when no prepared file exists, brainstorming, or when the host wants AI-assisted content. |

### Creation Workflow

1. Navigate to the room admin panel or Elements tab.
2. Select "Add Presentation" or find the Presentation element.
3. The **PresentationElementModal** opens.
4. Choose to upload a file or use the AI generator.
5. Configure the presentation settings (name, navigation, transition).
6. Save the presentation element.
7. The presentation is now available for use during the session.

---

## File Upload

### What It Is

The file upload method allows hosts to bring their own presentation files into R-Link Studio. The uploaded file is processed and converted into individual slides that can be navigated during the session.

### Supported Data

| Property | Type | Description |
|----------|------|-------------|
| `fileUrl` | String (URL) | The URL of the uploaded presentation file after it has been processed and stored. This is the permanent reference to the file. |
| `fileType` | String | The type/format of the uploaded file (e.g., "pdf", "pptx", "ppt", "key"). Used to determine how the file is processed and rendered. |

### Upload Process

1. The host opens the **PresentationElementModal** from the Elements tab.
2. The host selects "Upload File" and chooses a file from their device.
3. The file is uploaded to the platform and assigned a `fileUrl`.
4. The system detects the `fileType` and processes the file:
   - **PDF**: Each page becomes a slide.
   - **PPTX/PPT**: Each slide is extracted and converted.
   - Other formats may be supported depending on the platform's processing capabilities.
5. The processed slides populate the `slides[]` array in the presentation's `activePresentation` object.
6. The host can preview the slides before the session.

### File Requirements

- **Supported formats**: PDF, PPTX, PPT, and potentially other document formats.
- **File size limits**: Check your plan for maximum upload file size. Large files may take longer to process.
- **Slide count**: There is no strict limit on the number of slides, but very large presentations may impact loading times.
- **Content**: Text, images, shapes, and charts in the original file are preserved. Complex animations from PowerPoint may not be fully supported; static slide rendering is used.

### Common Customer Questions

**Q: What file formats can I upload?**
A: The system supports PDF and PowerPoint (PPTX/PPT) files. PDF files are converted with each page as a slide. PowerPoint files are processed to extract individual slides.

**Q: My uploaded presentation looks different from the original.**
A: R-Link renders uploaded presentations as static slide images. Some formatting differences may occur, especially with:
- Custom fonts (web-safe fonts are used as fallbacks).
- Complex PowerPoint animations (these are not supported; slides are rendered statically).
- Embedded videos (these are not played within slides).
- Very complex layouts with overlapping elements.
For best results, use simple, clean layouts and standard fonts.

**Q: The upload is taking a long time.**
A: Large files take longer to upload and process. Factors that affect upload time:
- File size (large files with many high-resolution images are slower).
- Internet connection speed.
- Number of slides (more slides means more processing time).
If the upload seems stuck, refresh the page and try again. Consider reducing file size by compressing images in the source file.

**Q: Can I replace an uploaded file?**
A: Yes. Open the presentation element in the **PresentationElementModal** and upload a new file. The previous file will be replaced with the new one.

---

## AI Presentation Generator

### What It Is

The **AIPresentationGenerator** is an AI-powered tool that creates presentation slides from a text description or topic provided by the host. Instead of uploading an existing file, the host describes what they want to present, and the AI generates a complete slide deck with content, structure, and layout.

### How It Works

1. The host opens the **PresentationElementModal** and selects the AI Generator option.
2. The host provides input:
   - **Topic or description**: A text prompt describing the presentation subject (e.g., "Q4 sales results for the eastern region" or "Introduction to machine learning for beginners").
   - **Optional parameters**: Number of slides, tone/style, key points to include.
3. The **AIPresentationGenerator** processes the input and generates:
   - Slide titles
   - Slide content (bullet points, key messages)
   - Slide structure and ordering
   - Visual layout suggestions
4. The generated slides populate the `slides[]` array.
5. The host can preview and edit the generated slides before presenting.

### AI Generator Capabilities

- **Content generation**: Creates relevant text content based on the topic.
- **Structure**: Organizes content into a logical slide sequence (intro, body, conclusion).
- **Key points**: Identifies and highlights main takeaways.
- **Adaptability**: Works for a wide range of topics and industries.

### Limitations

- **Visual design**: AI-generated slides may have a basic visual design. Hosts can enhance the design manually.
- **Domain expertise**: The AI generates content based on general knowledge. Highly specialized or proprietary content should be reviewed and edited by the host.
- **Image generation**: The AI may or may not include images. If images are needed, the host may need to add them manually.
- **Accuracy**: AI-generated content should be reviewed for factual accuracy before presenting.

### Common Customer Questions

**Q: How do I use the AI to create a presentation?**
A: In the PresentationElementModal, select the AI Generator option. Enter a topic or description of your presentation, optionally specify the number of slides and key points, and click Generate. The AI will create a slide deck for you.

**Q: Can I edit the AI-generated slides?**
A: Yes. After generation, you can preview and edit the slides. Add, remove, or modify content as needed. The AI provides a starting point that you can customize.

**Q: How good are the AI-generated presentations?**
A: The AI creates well-structured presentations with relevant content. Quality depends on the specificity of your input prompt. A detailed prompt produces better results than a vague one. Always review and refine the generated content before presenting.

**Q: Can the AI generate presentations in other languages?**
A: The AI can generate content in multiple languages if specified in the prompt. For best results, provide the prompt in the desired language or explicitly state the language you want the presentation in.

---

## Managing Presentations

### What It Is

Once a presentation is created (via upload or AI generation), it becomes an element in the room that can be managed through the admin panel. Management includes editing, reordering slides, configuring navigation and transitions, and deleting presentations.

### PresentationElementModal

The **PresentationElementModal** is the primary interface for creating and managing presentation elements. It provides:

- **File upload area**: Drag-and-drop or browse to upload a file.
- **AI Generator access**: Switch to the AI generation mode.
- **Presentation settings**: Name, navigation mode, transition effect.
- **Slide preview**: Thumbnail view of all slides in the presentation.
- **Slide management**: Reorder, add, or remove individual slides.
- **Save/Cancel**: Save changes or cancel without saving.

### Editing an Existing Presentation

1. Open the room admin panel or Elements tab.
2. Find the presentation element and click Edit.
3. The **PresentationElementModal** opens with the current presentation loaded.
4. Make changes:
   - Upload a new file to replace the current one.
   - Edit presentation name.
   - Change navigation or transition settings.
   - Reorder slides.
5. Save changes.

### Common Customer Questions

**Q: How do I edit my presentation after creating it?**
A: Open the Elements tab in your room admin panel, find the presentation element, and click Edit. The PresentationElementModal opens with your current presentation, allowing you to make changes.

**Q: Can I reorder slides?**
A: Yes. In the PresentationElementModal, you can drag and drop slide thumbnails to reorder them. The new order is saved when you click Save.

**Q: Can I have multiple presentations in one room?**
A: Yes. You can add multiple presentation elements to a room. During the session, you can switch between them by activating different presentations.

---

## Navigation & Transitions

### What It Is

Navigation controls how the presenter moves between slides, and transitions control the visual effect when switching from one slide to another. Both are configured as part of the `activePresentation` object.

### Active Presentation Object

The `activePresentation` object is the core data structure for a presentation in use:

| Property | Type | Description |
|----------|------|-------------|
| `id` | String (UUID) | Unique identifier for the presentation |
| `name` | String | Display name of the presentation |
| `slides` | Array | Ordered array of slide objects, each containing the slide content and metadata |
| `file_url` | String (URL) | The URL of the source file (if uploaded). Same as `fileUrl` from the upload process. |
| `navigation` | Object | Navigation configuration controlling how slides are advanced |
| `transition` | String | The transition effect applied when moving between slides. Default: `fade` |

### Navigation Configuration

The `navigation` property controls how the presenter and participants interact with slide progression:

| Setting | Description |
|---------|-------------|
| **Manual** | The presenter manually advances slides using next/previous controls. Participants see whatever slide the presenter is on. |
| **Timed** | Slides advance automatically on a timer. The presenter can override by manually navigating. |
| **Participant-controlled** | (If available) Participants can navigate slides independently at their own pace. |

### Transition Effects

The `transition` property defines the visual animation when switching between slides:

| Transition | Description |
|------------|-------------|
| `fade` | The current slide fades out and the next slide fades in. This is the **default** transition. |
| `slide` | The current slide slides out in one direction and the next slide slides in from the opposite direction. |
| `none` | No transition effect. The next slide appears instantly. |
| Additional | Additional transition effects may be available depending on platform updates. Check the transition dropdown in the presentation settings. |

### Configuring Navigation and Transitions

1. Open the presentation in the **PresentationElementModal**.
2. Find the Navigation setting and select the desired mode.
3. Find the Transition setting and select the desired effect (default: `fade`).
4. Save the presentation.

### Common Customer Questions

**Q: How do I change the slide transition effect?**
A: Open the presentation element in the PresentationElementModal. Look for the Transition dropdown and select your preferred effect. The default is `fade`.

**Q: Can I use different transitions for different slides?**
A: The transition setting applies to the entire presentation. All slides use the same transition effect. Individual per-slide transitions are not currently supported.

**Q: How do I advance slides during a presentation?**
A: Use the next/previous controls in the Studio presenter toolbar. You can also use keyboard shortcuts (arrow keys) if supported. The navigation mode determines whether slides advance manually or on a timer.

**Q: The slides are advancing automatically. How do I stop it?**
A: The navigation mode may be set to "Timed." Open the presentation settings and switch to "Manual" navigation. You can override timed navigation by manually clicking next/previous at any time.

---

## Presenting

### What It Is

Presenting is the act of delivering a presentation during a live Studio session. The host activates a presentation, and it appears on the Studio stage for all participants to see. The presenter controls slide navigation, and the presentation state is synchronized across all viewers.

### Presentation State

The `presentationState` object tracks the current status of the presentation during a session:

| Property | Type | Description |
|----------|------|-------------|
| `status` | String (enum) | Current status: `idle` (no presentation active) or `active` (a presentation is being shown on stage) |
| `currentSlide` | Number (index) | The index of the currently displayed slide (0-based). Updates in real time as the presenter navigates. |

### PresentationStageRenderer

The **PresentationStageRenderer** is the component that renders the active presentation on the Studio stage:

- Displays the current slide from the `activePresentation.slides[]` array.
- Applies the configured `transition` effect when slides change.
- Handles responsive layout to fit the stage area.
- Synchronizes the display across all participants so everyone sees the same slide.

### How Presenting Works

1. The host selects a presentation element to present.
2. `presentationState.status` changes from `idle` to `active`.
3. The **PresentationStageRenderer** renders the first slide (or the `currentSlide` if resuming).
4. The presentation appears on the Studio stage for all participants.
5. The host uses navigation controls to advance or go back slides.
6. Each slide change updates `presentationState.currentSlide` and applies the configured `transition`.
7. All participants see the slide change in sync.
8. The host ends the presentation when finished, and `presentationState.status` returns to `idle`.

### Presenter Controls

During an active presentation, the host has access to:

- **Next slide**: Advance to the next slide.
- **Previous slide**: Go back to the previous slide.
- **Jump to slide**: Select a specific slide from a thumbnail strip or slide number.
- **End presentation**: Stop presenting and return to the standard Studio stage view.
- **Slide counter**: Shows the current slide number and total slides (e.g., "5 / 20").

### Common Customer Questions

**Q: How do I start presenting?**
A: Select the presentation element from the Studio elements panel and activate it. The presentation will appear on the stage and you can begin navigating through slides.

**Q: Participants say they cannot see the presentation.**
A: Verify:
- The presentation is activated (`presentationState.status` is `active`).
- The stage layout is showing the presentation element.
- Participants should refresh their browser if the presentation was recently activated.
- Check that the presentation file loaded correctly (slides are not empty).

**Q: Can participants navigate slides on their own?**
A: By default, all participants see the same slide as the presenter (synchronized). Some navigation modes may allow participant-controlled navigation, but this depends on the presentation configuration.

**Q: The presentation is showing a blank slide.**
A: This could be caused by:
- A slide in the presentation that has no content.
- The file failed to process correctly. Try re-uploading the file.
- A rendering issue. Refresh the browser.
- The `currentSlide` index pointing to a non-existent slide.

**Q: Can I switch between presentations during a session?**
A: Yes. End the current presentation and activate a different one. The `activePresentation` object updates to the new presentation, and `presentationState` resets.

---

## Previewing

### What It Is

Previewing allows the host to view a presentation before presenting it live. This is essential for verifying that the uploaded file rendered correctly, checking AI-generated content, and rehearsing the presentation flow.

### Key Components

| Component | Purpose |
|-----------|---------|
| **PresentationPreviewModal** | A modal dialog that displays the presentation slides in a preview mode. The host can navigate through all slides, check content and formatting, without the presentation being visible to participants. |
| **TestPresentationViewer** | A full-screen or expanded preview mode for thorough testing. Allows the host to see the presentation exactly as it will appear on the Studio stage, including transitions and layout. |

### Preview Workflow

1. The host opens the presentation element from the admin panel.
2. The host clicks "Preview" to open the **PresentationPreviewModal**.
3. The modal displays the slides with navigation controls.
4. The host reviews each slide for:
   - Content accuracy
   - Formatting and layout
   - Image quality
   - Slide ordering
5. For a more thorough review, the host can use the **TestPresentationViewer** to see the full-stage rendering.
6. The host closes the preview and makes any necessary edits before the session.

### Preview vs. Presenting

| Aspect | Preview | Presenting |
|--------|---------|------------|
| Visibility | Host only | All participants |
| Components | PresentationPreviewModal, TestPresentationViewer | PresentationStageRenderer |
| State | Does not change presentationState | Sets presentationState.status to "active" |
| Purpose | Review and verify | Deliver to audience |
| Interactivity | Navigate and review | Navigate with live audience sync |

### Common Customer Questions

**Q: How do I preview my presentation before going live?**
A: Open the presentation element from the Elements tab and click "Preview." This opens the PresentationPreviewModal where you can review all slides. For a full rendering test, use the TestPresentationViewer.

**Q: Can participants see my preview?**
A: No. Previewing is a host-only action. Participants do not see anything when you are previewing. The presentation only becomes visible to participants when you activate it during the session.

**Q: The preview looks different from the original file.**
A: The preview shows how the presentation will render in R-Link Studio. Some differences from the original file are expected due to format conversion. See the [File Upload](#file-upload) section for details on what may differ.

---

## Sharing Presentations

### What It Is

Sharing allows the host to share a presentation with others outside of the live session context. This is useful for distributing slide decks to participants after a session, sharing with team members for review, or making presentations available for on-demand viewing.

### PresentationShareModal

The **PresentationShareModal** is the interface for configuring and executing presentation sharing:

- **Share link generation**: Create a shareable link that recipients can use to view the presentation.
- **Access control**: Configure who can access the shared presentation (public, specific users, password-protected).
- **Sharing options**: Copy link, send via email, or embed in other platforms.
- **Expiration**: Optionally set an expiration date for the share link.

### How Sharing Works

1. The host opens the presentation element and clicks "Share."
2. The **PresentationShareModal** opens.
3. The host configures sharing settings:
   - Access level (public, restricted, password-protected).
   - Optional expiration date.
4. The system creates a **SharedPresentation** entity (see below).
5. A shareable link is generated.
6. The host distributes the link via their preferred method.
7. Recipients access the link and view the presentation in a dedicated viewer.

### Common Customer Questions

**Q: How do I share my presentation after the session?**
A: Open the presentation element and click "Share." The PresentationShareModal lets you generate a shareable link with configurable access settings.

**Q: Can I restrict who sees my shared presentation?**
A: Yes. The PresentationShareModal provides access control options. You can make the presentation public, restrict it to specific users, or add password protection.

**Q: Does the shared link expire?**
A: You can optionally set an expiration date for the share link. If no expiration is set, the link remains active until manually revoked.

**Q: Can recipients download the shared presentation?**
A: This depends on the sharing configuration. Download permissions may be configurable in the share settings.

---

## SharedPresentation Entity

### What It Is

The **SharedPresentation** entity is the data model that represents a presentation that has been shared outside of the live session. It is created when the host shares a presentation through the PresentationShareModal.

### Entity Structure

| Field | Type | Description |
|-------|------|-------------|
| `id` | String (UUID) | Unique identifier for the shared presentation instance |
| `presentation_id` | String (UUID) | Links back to the source presentation element |
| `share_url` | String (URL) | The publicly accessible URL for viewing the shared presentation |
| `access_level` | String (enum) | Access configuration: public, restricted, password-protected |
| `password_hash` | String | Hashed password for password-protected presentations (null if not password-protected) |
| `allowed_users` | Array | List of user IDs allowed to access (for restricted access) |
| `expires_at` | Timestamp | When the share link expires (null for no expiration) |
| `created_by` | String (UUID) | The user ID of the host who created the share |
| `created_at` | Timestamp | When the shared presentation was created |
| `view_count` | Integer | Number of times the shared presentation has been viewed |
| `download_enabled` | Boolean | Whether recipients can download the presentation file |
| `slides` | Array | Copy of the slide data at the time of sharing (ensures the shared version is a snapshot) |

### Entity Behavior

- **Snapshot**: The SharedPresentation contains a snapshot of the slides at the time of sharing. If the original presentation is later edited, the shared version remains unchanged.
- **View tracking**: The `view_count` increments each time someone accesses the shared presentation.
- **Expiration**: If `expires_at` is set and has passed, the share link returns an "expired" message and the presentation is no longer accessible.
- **Revocation**: The host can revoke (delete) a SharedPresentation to immediately disable the share link.

### Common Customer Questions

**Q: If I edit my presentation, does the shared version update?**
A: No. The shared presentation is a snapshot taken at the time of sharing. Edits to the original do not affect the shared version. To share the updated version, create a new share.

**Q: How do I see who viewed my shared presentation?**
A: The SharedPresentation entity tracks `view_count` for overall view statistics. Detailed viewer analytics may be available depending on the access level and platform features.

**Q: How do I stop sharing a presentation?**
A: You can revoke the share by deleting the SharedPresentation or disabling the share link from the PresentationShareModal. This immediately makes the link inaccessible.

**Q: Can I share multiple presentations from the same session?**
A: Yes. Each presentation element can be shared independently. Multiple SharedPresentation entities can exist for different presentations or even multiple shares of the same presentation with different settings.

---

## Active Presentation & State

### Summary of Data Structures

The presentation system uses two main state objects during a session:

#### activePresentation Object

```
activePresentation: {
  id:          String (UUID)        // Unique presentation identifier
  name:        String               // Display name
  slides:      Array                // Ordered array of slide objects
  file_url:    String (URL)         // Source file URL (if uploaded)
  navigation:  Object               // Navigation mode configuration
  transition:  String               // Transition effect (default: "fade")
}
```

#### presentationState Object

```
presentationState: {
  status:       String              // "idle" or "active"
  currentSlide: Number              // Index of the currently displayed slide (0-based)
}
```

### State Transitions

```
[No presentation]
  status: idle, currentSlide: 0
    |
    | (Host activates presentation)
    v
[Presentation active]
  status: active, currentSlide: 0
    |
    | (Host navigates slides)
    v
[Presenting slide N]
  status: active, currentSlide: N
    |
    | (Host ends presentation)
    v
[Presentation ended]
  status: idle, currentSlide: 0
```

---

## Common Questions & Troubleshooting

### General Presentation Issues

**Q: I cannot find the option to add a presentation.**
A: The presentation element is added from the room admin panel under the Elements tab. Look for "Presentation" in the available elements list. If you do not see it, check your plan to ensure presentations are included.

**Q: The presentation file failed to upload.**
A: Troubleshoot:
- Check the file format (PDF and PPTX are recommended).
- Check the file size against your plan's upload limits.
- Ensure your internet connection is stable.
- Try a different browser.
- If using a very large file, try compressing it or reducing image sizes.

**Q: The AI generator is not working.**
A: Ensure:
- You have access to the AI generator feature (check your plan).
- Enter a clear, descriptive prompt.
- Wait for the generation to complete (it may take 15-30 seconds for complex topics).
- If the generator returns an error, try simplifying or shortening your prompt.

**Q: Transitions are not smooth.**
A: Transition smoothness depends on the participant's device and browser performance. For best results:
- Use Chrome or Edge.
- Close unnecessary tabs and applications.
- Ensure hardware acceleration is enabled in the browser.
- If transitions are still choppy, consider using `none` as the transition for instant slide changes.

**Q: Can I add audio or video to my presentation slides?**
A: R-Link presentations render slides as static images. Embedded audio or video from the source file may not play within the presentation. For audio and video, use the Studio's native media capabilities alongside the presentation.

**Q: My keyboard shortcuts for slide navigation are not working.**
A: Keyboard shortcuts may require focus on the Studio stage area. Click on the stage area first, then try the arrow keys. If shortcuts still do not work, use the on-screen navigation buttons.

### Sharing Issues

**Q: The share link is not working for recipients.**
A: Check:
- The share link has not expired (`expires_at`).
- The recipient meets the access requirements (if restricted or password-protected).
- The SharedPresentation has not been revoked/deleted.
- The link was copied correctly (no extra spaces or truncation).

**Q: Can I share a presentation with someone who does not have an R-Link account?**
A: If the access level is set to "public," anyone with the link can view the presentation without an account. Password-protected shares also work without an account as long as the recipient has the password.

---

## Technical Reference

### Components Map

| Component | Location | Purpose |
|-----------|----------|---------|
| PresentationElementModal | `studio/presentation/PresentationElementModal` | Create and edit presentation elements |
| PresentationStageRenderer | `studio/presentation/PresentationStageRenderer` | Render active presentation on stage |
| PresentationPreviewModal | `studio/presentation/PresentationPreviewModal` | Preview presentation before presenting |
| PresentationShareModal | `studio/presentation/PresentationShareModal` | Share presentation with external access |
| TestPresentationViewer | `studio/presentation/TestPresentationViewer` | Full rendering test for presentations |
| AIPresentationGenerator | `studio/presentation/AIPresentationGenerator` | AI-powered slide generation |

### Key Data Objects

| Object | Key Properties |
|--------|---------------|
| `activePresentation` | id, name, slides[], file_url, navigation, transition |
| `presentationState` | status (idle/active), currentSlide |
| `fileUrl` | URL of the uploaded source file |
| `fileType` | Format of the uploaded file |

### Entity Reference

| Entity | Purpose | Key Fields |
|--------|---------|------------|
| SharedPresentation | Shared presentation snapshot | id, presentation_id, share_url, access_level, password_hash, allowed_users, expires_at, created_by, created_at, view_count, download_enabled, slides |

### State Enums

| Property | Values | Default |
|----------|--------|---------|
| `presentationState.status` | `idle`, `active` | `idle` |
| `activePresentation.transition` | `fade`, `slide`, `none` | `fade` |
| `SharedPresentation.access_level` | `public`, `restricted`, `password-protected` | varies |

### Component Relationships

```
PresentationElementModal (create/edit)
    |
    +-- File Upload --> fileUrl, fileType
    +-- AIPresentationGenerator --> slides[]
    |
    v
activePresentation (data model)
    |
    +-- PresentationPreviewModal (host preview)
    +-- TestPresentationViewer (full test)
    +-- PresentationStageRenderer (live presenting)
    +-- PresentationShareModal --> SharedPresentation entity
```

---

*Last updated: 2026-01-29 | R-Link Customer Service Knowledge Base*
