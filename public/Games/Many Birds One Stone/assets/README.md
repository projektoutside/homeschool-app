# Woodland art and sound

Created for this game on 2026-10-21. No runtime provider credentials or network generation are needed.

`woodland-v2.webp`: original backdrop generated with Codex's built-in imagegen, converted to 720 x 1280 WebP with FFmpeg. Prompt: a premium hand-painted 2.5D woodland valley, jade/mint foliage, luminous turquoise sky, distant teal mountains, honey sunlight, cream clouds, painted trees framing only the margins and bottom; spacious clear central playfield; no birds, animals, stone, machinery, text, UI, or watermark. The generated full-resolution original remains in Codex generated_images for this chat.

`audio/manifest.json` contains the complete prompts, durations, provider, model, and filenames for all eight ElevenLabs sound effects. Generation used the existing OAuth CLI, one request per sound, `eleven_text_to_sound_v2`, 44.1 kHz / 128 kbps MP3, prompt influence 0.45. The ambience is a 20-second seamless loop; effects are 0.5–2.5 seconds. Sound cues are decoded after a user gesture, rate-limited, muted through a shared gain, and suspended on pause/backgrounding. An optional lightweight tone fallback preserves interaction when audio is unavailable.

Local fonts: Fredoka 600 and Nunito Sans 400–800, downloaded from the official Google Fonts service. Their respective SIL Open Font Licenses are included in `fonts/`.

Technical references: [ElevenLabs sound generation](https://elevenlabs.io/docs/api-reference/text-to-sound-effects/convert), [pointer capture and pointer events](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events), [speech result events](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition/result_event).
