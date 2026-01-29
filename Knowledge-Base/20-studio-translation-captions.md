# 20 - Studio Translation & Captions

## Overview

R-Link Studio includes built-in translation and captioning features that make live sessions accessible to multilingual and hearing-impaired audiences. The system provides real-time live captions of spoken content, configurable spoken and caption languages, session-based caption management, and a text translator for written content. These features ensure that language barriers do not prevent participants from fully engaging with Studio sessions.

---

## Table of Contents

1. [Live Captions](#live-captions)
2. [Language Configuration](#language-configuration)
3. [Caption Sessions](#caption-sessions)
4. [Text Translator](#text-translator)
5. [Setup & Configuration Guide](#setup--configuration-guide)
6. [Common Questions & Troubleshooting](#common-questions--troubleshooting)
7. [Technical Reference](#technical-reference)

---

## Live Captions

### What It Is

**LiveCaptions** is the real-time captioning system that transcribes spoken audio into text displayed on the Studio interface. As the host or guests speak, their words are converted to text and shown as captions overlaying the video or in a dedicated caption area. This is essential for accessibility (hearing-impaired participants) and multilingual sessions (where captions can be displayed in a different language than the spoken language).

### How It Works

1. The host enables captions by setting `captionsEnabled` to `true` in the session settings.
2. The system begins listening to the audio input from active speakers.
3. Speech is processed through the speech-to-text engine, using the configured `spokenLanguage` as the source language.
4. The transcribed text is translated (if needed) to the configured `captionLanguage`.
5. Captions are displayed in real time on the participant's screen via the **LiveCaptions** component.
6. Captions update continuously as the speaker talks, with a slight delay for processing.

### Caption Display

- Captions appear at the bottom of the video stage area by default.
- Text is displayed in a readable format with a semi-transparent background for contrast.
- Captions scroll or replace as new speech is detected.
- Multiple speakers may be distinguished by name labels or color coding.
- Participants can toggle caption visibility on their individual view without affecting other participants.

### Enabling and Disabling Captions

| Property | Type | Description |
|----------|------|-------------|
| `captionsEnabled` | Boolean | Master toggle for the caption system. When `true`, captions are active and processing audio. When `false`, no captioning occurs. |

The host controls `captionsEnabled` from the Studio session controls. Individual participants can hide captions on their local view, but the captioning system itself is controlled by the host.

### Common Customer Questions

**Q: How do I turn on captions?**
A: The host can enable captions from the Studio session controls or room settings. Look for a "Captions" or "CC" toggle. When enabled, captions will appear for all participants (though individual participants can hide them on their view).

**Q: Captions are not appearing even though I enabled them.**
A: Troubleshoot:
- Confirm that `captionsEnabled` is `true` in the session settings.
- Ensure the speaker's microphone is working and picking up audio clearly.
- Check that the `spokenLanguage` is set correctly (the system needs to know what language to listen for).
- Verify the participant has not hidden captions on their local view.
- Refresh the browser if captions were recently enabled.

**Q: The captions are inaccurate or contain errors.**
A: Caption accuracy depends on several factors:
- **Audio quality**: Clear audio with minimal background noise produces better captions. Use a good quality microphone and minimize echo.
- **Spoken language setting**: Ensure `spokenLanguage` matches the language actually being spoken. Incorrect language settings cause major accuracy issues.
- **Speaking pace**: Speaking too fast or mumbling reduces accuracy. Encourage speakers to speak clearly at a moderate pace.
- **Technical terms**: Highly specialized or uncommon terminology may not be accurately transcribed. Consider spelling out critical terms.

**Q: Can participants enable captions for themselves?**
A: Captions must be enabled at the session level by the host (`captionsEnabled: true`). Once enabled, individual participants can show or hide captions on their own view, but they cannot activate the captioning system if the host has not enabled it.

**Q: Is there a delay in the captions?**
A: Yes, there is a slight delay (typically 1-3 seconds) between when something is spoken and when the caption appears. This is due to the time required to process the audio, transcribe it, and optionally translate it. This delay is normal and expected.

---

## Language Configuration

### What It Is

The language configuration system controls which languages are used for speech recognition (input) and caption display (output). This is what enables multilingual captioning, where the host speaks in one language and participants read captions in another.

### Configuration Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `spokenLanguage` | String (language code) | `DEFAULT_SPOKEN_LANGUAGE` | The language being spoken by the host/speakers. This tells the speech recognition engine what language to expect. Must be set to the correct language for accurate transcription. |
| `captionLanguage` | String (language code) | `DEFAULT_CAPTION_LANGUAGE` | The language in which captions are displayed to participants. If different from `spokenLanguage`, the system translates the transcribed text into this language. |

### Default Language Constants

| Constant | Purpose |
|----------|---------|
| `DEFAULT_SPOKEN_LANGUAGE` | The default language code used for `spokenLanguage` when no custom language is set. Typically English (en). |
| `DEFAULT_CAPTION_LANGUAGE` | The default language code used for `captionLanguage` when no custom language is set. Typically matches `DEFAULT_SPOKEN_LANGUAGE`. |

### How Language Configuration Works

1. **Same language (transcription only)**: When `spokenLanguage` and `captionLanguage` are the same, the system performs speech-to-text transcription without translation. Example: Host speaks English, captions appear in English.

2. **Different languages (transcription + translation)**: When `spokenLanguage` and `captionLanguage` differ, the system first transcribes the speech in the spoken language, then translates the text to the caption language. Example: Host speaks English (`spokenLanguage: "en"`), captions appear in Spanish (`captionLanguage: "es"`).

### Supported Languages

The system supports a wide range of languages for both speech recognition and caption display. Common languages include:

| Language | Code |
|----------|------|
| English | en |
| Spanish | es |
| French | fr |
| German | de |
| Portuguese | pt |
| Japanese | ja |
| Chinese (Simplified) | zh |
| Korean | ko |
| Italian | it |
| Dutch | nl |
| Arabic | ar |
| Hindi | hi |
| Russian | ru |

*Note: The full list of supported languages may vary. Check the language selection dropdown in the Studio settings for the current list.*

### Common Customer Questions

**Q: How do I change the spoken language?**
A: The host can change the `spokenLanguage` in the Studio session controls or room settings. Look for a language or caption settings panel and select the language being spoken from the dropdown.

**Q: How do participants choose their caption language?**
A: The `captionLanguage` setting controls the language of the displayed captions. Depending on the session configuration, this may be set globally by the host or individually by each participant from their caption settings.

**Q: The captions are in the wrong language.**
A: Check both language settings:
- `spokenLanguage` must match the language actually being spoken.
- `captionLanguage` must be set to the desired display language.
If `spokenLanguage` is wrong, the system cannot accurately transcribe the audio, and subsequent translation will also be incorrect.

**Q: Can I have captions in multiple languages simultaneously?**
A: The system supports one `captionLanguage` at a time for the caption display. If individual participants can set their own caption language, multiple participants may see captions in different languages, but each participant sees only one language.

**Q: What happens if a language is not supported?**
A: If a language is not in the supported list, it will not appear in the language selection dropdown. If the speaker switches to an unsupported language mid-session without changing the `spokenLanguage` setting, caption accuracy will degrade significantly.

---

## Caption Sessions

### What It Is

A **Caption Session** is a managed session object that represents an active captioning instance. It is created when the host enables captions and tracks the state and configuration of the captioning service for the duration of the session.

### The captionSession Object

The `captionSession` is created by calling the `createCaptionSession()` function. It encapsulates:

| Property | Description |
|----------|-------------|
| Session ID | Unique identifier for this caption session |
| Spoken Language | The `spokenLanguage` configured when the session was created |
| Caption Language | The `captionLanguage` configured when the session was created |
| Status | Whether the caption session is active, paused, or ended |
| Start Time | When the caption session began |
| Transcript Data | Accumulated transcript text from the session |

### Creating a Caption Session

```
captionSession = createCaptionSession({
  spokenLanguage: "en",
  captionLanguage: "es"
})
```

The `createCaptionSession()` function:

1. Initializes the speech recognition engine with the specified `spokenLanguage`.
2. Configures the translation pipeline for the target `captionLanguage`.
3. Creates a session object that tracks all caption data.
4. Returns the `captionSession` object that can be used to manage the session.

### Caption Session Lifecycle

1. **Creation**: `createCaptionSession()` is called when the host enables captions.
2. **Active**: The caption session is actively processing audio and generating captions.
3. **Pause (optional)**: The session can be paused (e.g., during a break), stopping audio processing temporarily.
4. **Resume**: A paused session can be resumed to continue captioning.
5. **End**: The caption session ends when the host disables captions or the Studio session ends.
6. **Transcript**: The accumulated transcript from the caption session may be saved for post-session review.

### Common Customer Questions

**Q: What is a caption session?**
A: A caption session is the active captioning service instance that runs during your Studio session. It is created when captions are enabled and manages all the speech-to-text processing and translation.

**Q: Can I change the language during a caption session?**
A: Changing the spoken or caption language during an active session may require creating a new caption session. The current session would end and a new one would begin with the updated language settings.

**Q: Is the caption transcript saved?**
A: The transcript generated during a caption session may be saved and available for post-session review, depending on the session configuration and plan features.

**Q: The caption session is not starting.**
A: Troubleshoot:
- Ensure the host has enabled captions (`captionsEnabled: true`).
- Check that the microphone is active and the browser has audio permissions.
- Verify the `spokenLanguage` is set to a supported language.
- Refresh the browser and try enabling captions again.
- Check for any error messages in the session controls.

---

## Text Translator

### What It Is

The **TextTranslator** is a separate tool from live captions that provides on-demand translation of written text within the Studio environment. While live captions handle real-time speech-to-text translation, the TextTranslator handles static text translation needs.

### Use Cases

- **Chat message translation**: Translate individual chat messages from one language to another.
- **Content translation**: Translate text elements, descriptions, or instructions displayed in the session.
- **On-demand translation**: Participants or hosts can manually request translation of specific text.

### How It Works

1. The user selects or inputs text that needs to be translated.
2. The user selects the target language.
3. The **TextTranslator** processes the text and returns the translated version.
4. The translated text is displayed inline or in a translation panel.

### Difference from Live Captions

| Feature | Live Captions | Text Translator |
|---------|--------------|-----------------|
| Input | Real-time audio (speech) | Written text |
| Output | Continuous caption stream | One-time translated text |
| Processing | Continuous, automatic | On-demand, manual trigger |
| Use case | Accessibility, live translation | Chat translation, text content |
| Component | LiveCaptions | TextTranslator |

### Common Customer Questions

**Q: How do I translate a chat message?**
A: Look for a translate option (often a globe icon or "Translate" link) on the chat message. Click it to translate the message to your configured language. This uses the TextTranslator.

**Q: Can I translate text that is not in the chat?**
A: The TextTranslator may be available for other text elements in the Studio interface, depending on the specific implementation. Check for translate icons or options on text elements.

**Q: The translation seems inaccurate.**
A: Machine translation may not be perfect, especially for:
- Slang, idioms, or cultural expressions.
- Highly technical or domain-specific terminology.
- Very short text fragments without context.
If accurate translation is critical, consider having a human translator present in the session.

**Q: What languages does the Text Translator support?**
A: The TextTranslator supports the same languages as the live caption system. See the [Supported Languages](#supported-languages) section for the common language list.

---

## Setup & Configuration Guide

### For Hosts: Enabling Captions and Translation

1. **Before the session**:
   - Navigate to your room settings.
   - Find the Captions/Translation section.
   - Set the `spokenLanguage` to the language you will be speaking.
   - Set the `captionLanguage` to the language your audience primarily reads.
   - Enable `captionsEnabled` if you want captions active from the start.

2. **During the session**:
   - Toggle captions on/off from the Studio session controls (look for a "CC" button).
   - Change languages from the caption settings panel if needed.
   - Monitor caption quality. If accuracy is poor, check your microphone setup and spoken language setting.

3. **After the session**:
   - Review the caption transcript (if available) from the session details.
   - Download or share the transcript as needed.

### For Participants: Using Captions

1. **Viewing captions**: If the host has enabled captions, they appear automatically at the bottom of the video stage.
2. **Hiding captions**: You can toggle caption visibility on your view without affecting other participants.
3. **Changing caption language**: If individual language selection is available, look for a language option in the caption controls.
4. **Translating chat messages**: Use the translate option on individual chat messages to translate them to your language.

### Optimal Audio Setup for Captions

For the best caption accuracy:

- **Use a quality microphone**: A dedicated microphone (USB or headset) produces better results than a laptop's built-in microphone.
- **Minimize background noise**: Use noise cancellation if available. Close windows, turn off fans, and find a quiet environment.
- **Speak clearly**: Enunciate clearly and speak at a moderate pace.
- **Avoid crosstalk**: When multiple speakers are present, only one should speak at a time for best results.
- **Position the microphone correctly**: Keep the microphone at a consistent distance (6-12 inches) from your mouth.

---

## Common Questions & Troubleshooting

### General Translation & Caption Issues

**Q: Captions are not appearing for any participant.**
A: Steps to diagnose:
1. Confirm `captionsEnabled` is `true` in session settings.
2. Check that the host's microphone is active and producing audio.
3. Verify that `spokenLanguage` is set to a supported language.
4. Try disabling and re-enabling captions.
5. If the issue persists, refresh the browser and enable captions again.

**Q: Captions appear but are garbled or completely wrong.**
A: This is almost always caused by an incorrect `spokenLanguage` setting. If the host is speaking English but `spokenLanguage` is set to Japanese, the system tries to interpret the audio as Japanese, producing nonsensical output. Verify that `spokenLanguage` matches the language being spoken.

**Q: There is a long delay between speech and captions.**
A: Some delay (1-3 seconds) is normal. If the delay is significantly longer:
- Check the internet connection speed and stability.
- Reduce other bandwidth-heavy activities (video streaming, downloads).
- The translation step (when spoken and caption languages differ) adds a small amount of additional latency.

**Q: Can I use captions without translation?**
A: Yes. Set `spokenLanguage` and `captionLanguage` to the same language. This provides transcription-only captions without translation, which has lower latency and higher accuracy.

**Q: Captions work for the host but not for guests.**
A: The caption system processes audio from active speakers. If a guest's audio is not being captured:
- Ensure the guest's microphone is working and unmuted.
- Check that the guest has granted browser microphone permissions.
- The captioning system may need to be configured to capture audio from multiple sources.

**Q: The caption language changed unexpectedly.**
A: Someone may have changed the `captionLanguage` setting. The host can verify and reset the language from the caption settings panel. If individual participants can set their own language, the change affects only their view.

### Performance Issues

**Q: Captions are causing the session to lag.**
A: The captioning system runs in the background and should have minimal performance impact. If lag occurs:
- Close unnecessary browser tabs and applications.
- Check internet connection stability.
- Try a different browser.
- As a last resort, disable captions temporarily to confirm they are the cause of the lag.

**Q: The TextTranslator is slow.**
A: Text translation is typically fast (sub-second). If slow:
- Check internet connectivity.
- Try translating a shorter piece of text.
- Refresh the browser and try again.

---

## Technical Reference

### Components Map

| Component | Location | Purpose |
|-----------|----------|---------|
| LiveCaptions | `studio/captions/LiveCaptions` | Real-time speech-to-text caption display |
| TextTranslator | `studio/translation/TextTranslator` | On-demand text translation |

### Key State Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `captionsEnabled` | Boolean | false | Master toggle for live captions |
| `spokenLanguage` | String | `DEFAULT_SPOKEN_LANGUAGE` | Language of the speaker(s) |
| `captionLanguage` | String | `DEFAULT_CAPTION_LANGUAGE` | Language for caption display |
| `captionSession` | Object | null | Active caption session object |

### Functions

| Function | Input | Output | Description |
|----------|-------|--------|-------------|
| `createCaptionSession(config)` | `{ spokenLanguage, captionLanguage }` | captionSession object | Creates and initializes a new caption session |

### Constants

| Constant | Purpose |
|----------|---------|
| `DEFAULT_SPOKEN_LANGUAGE` | Default spoken language code for new sessions |
| `DEFAULT_CAPTION_LANGUAGE` | Default caption language code for new sessions |

### Data Flow

```
Speaker Audio
    |
    v
Speech Recognition (spokenLanguage)
    |
    v
Transcribed Text (source language)
    |
    v
Translation Engine (if captionLanguage != spokenLanguage)
    |
    v
Translated Caption Text
    |
    v
LiveCaptions Component (display)
```

### Caption Session States

| State | Description |
|-------|-------------|
| Active | Processing audio and generating captions |
| Paused | Temporarily stopped, can be resumed |
| Ended | Session complete, transcript available |

---

*Last updated: 2026-01-29 | R-Link Customer Service Knowledge Base*
