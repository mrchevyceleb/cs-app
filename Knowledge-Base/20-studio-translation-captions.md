# Studio Translation and Captions

## Overview

R-Link's Studio includes built-in translation and captioning capabilities that make live sessions accessible to multilingual audiences. The system provides real-time live captions, configurable spoken and caption languages, caption session management via the TranslationService, and a standalone text translator for on-demand translation of text content. These features enable hosts to run inclusive sessions where participants can follow along in their preferred language.

---

## Live Captions

### How Live Captions Work

Live captions provide real-time text transcription of spoken audio during a Studio session. The captions are generated from the session's audio stream and displayed to participants as an overlay on the Studio stage.

**Core Components:**
- **LiveCaptions** -- The UI component that renders caption text on the Studio stage.
- `captionsEnabled` -- Boolean state that controls whether live captions are active.
- `liveCaptions` -- State array containing the current stream of caption entries.
- `captionSession` -- The active caption session object managed by the TranslationService.
- `captionError` -- State tracking any errors that occur during captioning.

### Step-by-Step: Enabling Live Captions

1. The host or participant accesses the captions control in the Studio toolbar.
2. Toggling captions on sets `captionsEnabled` to `true`.
3. A caption session is initialized via `createCaptionSession` from the **TranslationService**.
4. The `captionSession` object is created and stored in state.
5. As audio is detected, real-time caption text is generated and appended to the `liveCaptions` array.
6. The **LiveCaptions** component renders the caption text on screen.
7. To disable captions, toggle `captionsEnabled` to `false`, which ends the caption session.

### Caption Display

Captions appear as a text overlay on the Studio stage. The `liveCaptions` state is an array that holds caption entries, allowing the display to show recent lines of transcribed text with smooth scrolling or fade behavior.

---

## Language Configuration

### Spoken Language and Caption Language

The translation system distinguishes between two language settings:

- **Spoken Language (`spokenLanguage`)** -- The language being spoken by the presenter or participants. This tells the captioning engine what language to expect in the audio input.
- **Caption Language (`captionLanguage`)** -- The language in which captions should be displayed. If this differs from the spoken language, the system translates the captions in real time.

**Defaults:**
- Both `spokenLanguage` and `captionLanguage` are initialized from the `languageConfig` configuration:
  - `DEFAULT_SPOKEN_LANGUAGE` -- The default spoken language setting.
  - `DEFAULT_CAPTION_LANGUAGE` -- The default caption language setting.

### Step-by-Step: Configuring Languages

1. Open the captions/translation settings in the Studio.
2. Set the **Spoken Language** to match the language being spoken in the session. This ensures accurate speech recognition.
3. Set the **Caption Language** to the language in which participants want to read captions.
4. If the spoken and caption languages differ, the TranslationService automatically translates the captions from the spoken language to the caption language.
5. Changes take effect immediately for the active caption session.

### How Translation Works

When the spoken language and caption language are different, the system performs real-time translation:
1. Audio is captured and processed in the `spokenLanguage`.
2. The TranslationService transcribes the audio to text in the spoken language.
3. The transcribed text is then translated to the `captionLanguage`.
4. The translated caption text is added to the `liveCaptions` array and displayed.

---

## Caption Sessions

### Creating a Caption Session

Caption sessions are managed by the **TranslationService** and created using the `createCaptionSession` function.

**`createCaptionSession` Function:**
- Called when captions are enabled (`captionsEnabled` set to `true`).
- Initializes the speech-to-text pipeline with the configured `spokenLanguage`.
- Sets up the translation pipeline if `captionLanguage` differs from `spokenLanguage`.
- Returns a `captionSession` object that manages the active session.
- The session is stored in the `captionSession` state.

### Caption Session Lifecycle

1. **Initialization** -- `createCaptionSession` is called, establishing the audio processing and translation pipeline.
2. **Active** -- The session continuously processes audio, generating caption entries in the `liveCaptions` array.
3. **Error Handling** -- If an error occurs during captioning (e.g., audio processing failure, translation service error), the `captionError` state is updated with error details.
4. **Termination** -- When captions are disabled (`captionsEnabled` set to `false`), the caption session is ended and resources are released.

### Caption Errors

The `captionError` state captures any issues that arise during the caption session. Common errors include:
- Audio input unavailable or inaccessible.
- TranslationService connection failure.
- Unsupported language combination.
- Rate limiting or service capacity issues.

When a `captionError` occurs, the **LiveCaptions** component may display an error indicator or the captions may stop updating until the issue is resolved.

---

## Text Translator

### How the Text Translator Works

The **TextTranslator** is a standalone translation tool that allows participants to translate text content on demand, independent of the live caption system. This is useful for translating chat messages, shared content, or any other text.

**Core Components:**
- **TextTranslator** -- The UI component providing the text translation interface.
- `showTextTranslator` -- State toggle controlling visibility of the text translator panel.

### Step-by-Step: Using the Text Translator

1. The participant opens the Text Translator by toggling `showTextTranslator` to `true`.
2. The **TextTranslator** panel appears in the Studio interface.
3. The participant enters or pastes the text to be translated.
4. The participant selects the source and target languages.
5. The translation is processed and the translated text is displayed.
6. The participant can close the translator by setting `showTextTranslator` to `false`.

### Text Translator vs. Live Captions

| Feature | Live Captions | Text Translator |
|---------|--------------|-----------------|
| Input | Real-time audio | Manual text entry |
| Output | Continuous caption stream | On-demand text translation |
| Automation | Automatic from audio | User-initiated |
| Use Case | Following spoken content | Translating specific text |
| State | `captionsEnabled` | `showTextTranslator` |

---

## TranslationService Integration

### Service Architecture

The **TranslationService** is the backend service that powers both live captions and text translation. It provides:

- **Speech-to-text** -- Converting audio input to text in the spoken language.
- **Text translation** -- Translating text from one language to another.
- **Session management** -- Creating and managing caption sessions via `createCaptionSession`.

### Language Configuration (`languageConfig`)

The `languageConfig` object defines the default language settings for the translation system:

| Property | Description |
|----------|-------------|
| `DEFAULT_SPOKEN_LANGUAGE` | The default language expected for spoken audio input |
| `DEFAULT_CAPTION_LANGUAGE` | The default language for caption output display |

These defaults are applied when a session starts and can be overridden by the host or participants through the language configuration interface.

---

## Settings and Options

| Setting | Scope | Description |
|---------|-------|-------------|
| `captionsEnabled` | Per-user/session | Toggle live captions on or off |
| `spokenLanguage` | Per-session | The language being spoken (audio input language) |
| `captionLanguage` | Per-user | The language for caption display (can be per-user for personalized translation) |
| `showTextTranslator` | Per-user | Toggle visibility of the text translator panel |
| `DEFAULT_SPOKEN_LANGUAGE` | System default | Default spoken language from `languageConfig` |
| `DEFAULT_CAPTION_LANGUAGE` | System default | Default caption language from `languageConfig` |

---

## Troubleshooting

### Captions not appearing
- Verify `captionsEnabled` is set to `true`.
- Check that a `captionSession` has been created successfully (no `captionError`).
- Ensure the audio input is active and the microphone is not muted for the speaker.
- Verify the `spokenLanguage` is set correctly for the language being spoken.

### Captions are inaccurate
- Confirm the `spokenLanguage` matches the language actually being spoken. Mismatched language settings significantly reduce accuracy.
- Check audio quality -- background noise, poor microphone quality, or multiple simultaneous speakers can reduce transcription accuracy.
- Ensure the speaker is speaking clearly and at a moderate pace.

### Translation not working (captions appear in spoken language only)
- Verify `captionLanguage` is set to a different language than `spokenLanguage`.
- Check that the TranslationService supports the requested language combination.
- Look for errors in the `captionError` state that might indicate a translation pipeline failure.

### Caption session errors
- Check the `captionError` state for specific error details.
- Common causes: network connectivity issues, TranslationService unavailability, unsupported language.
- Try disabling and re-enabling captions to restart the caption session.

### Text Translator not appearing
- Verify `showTextTranslator` is set to `true`.
- Check that the UI panel is not hidden behind other Studio elements.

### Text Translator returning incorrect translations
- Verify the source and target languages are set correctly.
- Some language pairs may have lower translation quality depending on the TranslationService capabilities.

---

## FAQ

**Q: Can different participants see captions in different languages?**
A: The `captionLanguage` setting can be configured per user, allowing each participant to choose their preferred caption display language. The system translates from the `spokenLanguage` to each user's selected `captionLanguage`.

**Q: What languages are supported for captions?**
A: Supported languages are determined by the TranslationService. The system uses `DEFAULT_SPOKEN_LANGUAGE` and `DEFAULT_CAPTION_LANGUAGE` from `languageConfig` as defaults, with additional languages available through the language selection interface.

**Q: Can I use live captions and the text translator at the same time?**
A: Yes, live captions and the text translator are independent features. You can have `captionsEnabled` set to `true` and `showTextTranslator` set to `true` simultaneously.

**Q: Do captions work with multiple speakers?**
A: Yes, the captioning system processes audio from the session's audio stream, which includes all speakers. However, accuracy may vary with multiple simultaneous speakers.

**Q: Are captions saved after the session?**
A: Caption data stored in the `liveCaptions` array is session-scoped. For persistent transcription, see the Notetaker and Transcription features (Document 21).

**Q: Does the text translator use the same service as live captions?**
A: Both features are powered by the **TranslationService**, but they operate independently. Live captions use the speech-to-text and translation pipeline, while the text translator uses only the text translation pipeline.

**Q: What happens if the TranslationService goes down during a session?**
A: The `captionError` state will be updated with error information. Captions will stop updating until the service recovers. The host can try disabling and re-enabling captions to re-establish the connection.

---

## Known Limitations

- Live captions depend on audio quality; noisy environments or poor microphones can significantly reduce accuracy.
- Real-time translation adds a slight delay compared to same-language captioning.
- Not all language combinations may be supported for real-time translation.
- The `liveCaptions` array is session-scoped and is not automatically persisted after the session ends.
- Caption accuracy may decrease with heavy accents, technical jargon, or rapid speech.
- The text translator is manual and does not automatically translate incoming chat messages or other dynamic content.
- Multiple simultaneous speakers can reduce transcription accuracy as the speech-to-text engine may have difficulty distinguishing between overlapping voices.

---

## Plan Requirements

| Feature | Basic Plan | Business Plan |
|---------|-----------|---------------|
| Live Captions | Available | Available |
| Language Configuration | Available | Available |
| Caption Sessions | Available | Available |
| Text Translator | Available | Available |

Translation and caption features are available across both plans.

---

## Related Documents

- [01 - Platform Overview](01-platform-overview.md) -- General platform capabilities.
- [18 - Studio Collaboration](18-studio-collaboration.md) -- Collaboration tools for multilingual sessions.
- [19 - Studio Reactions & Engagement](19-studio-reactions-engagement.md) -- Engagement features that work alongside captions.
- [21 - Studio Notetaker & Transcription](21-studio-notetaker-transcription.md) -- Persistent transcription and meeting notes.
