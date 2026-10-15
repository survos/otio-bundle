# Survos OTIO Bundle

Symfony integration that converts OTIO documents into a Remotion browser preview.
The standalone `survos/otio` package owns OTIO classes; this bundle owns playback.

```bash
composer require survos/otio-bundle survos/otio:dev-main
```

The current implementation is in mono development sources; the published 2.36.5
release is the original scaffold. Link the consumer with `php ../mono/link .`
until the next release publishes these changes.

The bundle ships a prebuilt ESM player containing React and Remotion. Consumers
use Symfony AssetMapper, without adding a React build to their application:

```js
import {mountOtioPlayer} from '@survos/otio-bundle/player';
const player = mountOtioPlayer(document.getElementById('player'), projection);
```

The UX package metadata registers that import through Flex. In a linked consumer
installed before this metadata existed, register it once:

```bash
php bin/console importmap:require @survos/otio-bundle/player --path=./vendor/survos/otio-bundle/assets/dist/player.js
```

Inject `Survos\OtioBundle\Playback\RemotionProjector` and call
`project($timeline, $resolve)`. The resolver receives an ExternalReference target
and returns `id`, `url`, `kind` (image/audio/video), and optional `credit`.
The application is responsible for authorization, source metadata and URL resolution.

## Supported preview

Flat video/audio tracks, explicit clip trims, gaps, layered visuals, images,
original audio and video, optional Ken Burns motion and lower thirds. Absolute
boundaries are rounded to output frames; source trims remain separate. Video
sound is opt-in to avoid doubling a separate audio track. Nested/trimmed
compositions, effects/retiming, transitions and unsupported references fail explicitly.
The preview uses native HTML media through Remotion for browser compatibility.
MP4 export is not implemented here.

`metadata.survos` is an optional presentation profile, version 1. Timeline fields:
`fps` (default 30), `width` (1920), `height` (1080), plus optional
`fadeInSeconds` and `fadeOutSeconds` (0–10, default 0). These apply a synchronized
picture-to-black and audio-to-silence envelope across the whole composition,
including overlays and embedded video sound; seeking recomputes it from frame time. Clip fields: `layout`
(`editorial` or `lower-third`), `caption`, `eyebrow`, `gain`, `embeddedAudio`, `fadeInSeconds`/`fadeOutSeconds`
(clip-relative opacity; a fade-in on an upper track overlapping the clip below is a
crossfade), and
`motion` (`fromScale`, `toScale`, `fromX`, `toX`, `fromY`, `toY`). Motion positions
are percentages; scale is 1–3. These are custom renderer hints, not standard OTIO
features that another editor must reproduce.

The player exposes play, pause, seekTo, getCurrentFrame, setMotion, setCaptions,
and unmount; it emits otio:frame, otio:play and otio:pause DOM events.

## Development

```bash
cd assets
npm ci
npm run typecheck
npm run build
```

Commit dist with source so Composer consumers do not need npm. Upstream notices
are shipped beside the build. React and Remotion retain their own licenses;
review Remotion's license for your intended usage. Our original code is MIT.
