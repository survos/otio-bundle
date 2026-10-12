> Historical design notes. The current implementation and package boundary are described in ../README.md.

# Remotion prompt-to-video reference

Reviewed 2026-10-11: [template-prompt-to-video](https://github.com/remotion-dev/template-prompt-to-video). Its README describes a CLI generating a story, images and ElevenLabs voiceover from a title/topic. The repository is a mirror; pin the upstream revision and check applicable license terms before reusing code.

The [timeline types](https://github.com/remotion-dev/template-prompt-to-video/blob/main/src/lib/types.ts) define separate image/background, text and audio arrays with millisecond intervals. This is a template-specific schema, not OTIO.

The [timeline builder](https://github.com/remotion-dev/template-prompt-to-video/blob/main/cli/timeline.ts) schedules consecutive scenes from character-aligned audio durations and produces caption/scale animation data. Its text animation choices use Math.random during timeline construction: persist chosen values or use a recorded seed for reproducible regeneration. Do not copy its accumulated millisecond rounding as the OTIO time model.

[Root.tsx](https://github.com/remotion-dev/template-prompt-to-video/blob/main/src/Root.tsx) discovers local timeline files and registers portrait compositions at 1080×1920. Treat these as example defaults; our player needs a versioned projection and configurable dimensions.

## What to adapt

Use its separation of script, media preparation, timed composition and rendering as a reference. Our application flow adds source discovery and evidence retrieval before story planning:

```text
User prompt + constraints
  → relevant platform source discovery
  → retrieval + authoritative hydration + evidence manifest
  → sourced story plan + chosen original media
  → optional labeled narration/illustration + measured timing
  → canonical OTIO
  → validated playback projection
  → Twig-hosted Remotion Player
```

Reuse suitable rendering ideas only after comparing with the existing platform. Keep source credentials and retrieval server-side, keep model calls outside the library, and keep canonical documents independent of the template schema. Generated narration timing must not be confused with timestamps in original oral-history recordings.

First build a playback proof using known assets. Then add the [retrieval workflow](source-retrieval.md) and a small cross-source prompt example. A fully generated slideshow alone does not satisfy the platform story use case.
