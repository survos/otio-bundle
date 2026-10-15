#!/usr/bin/env node
// Render an OTIO playback projection (RemotionProjector JSON) to MP4 with the same composition the
// browser player uses. Usage:
//   node render.mjs <playback.json> <out.mp4> [--captions] [--scale=1.5] [--still=<out.jpg>] [--still-frame=90]
//                   [--concurrency=N] [--frames=0-299] [--gl=angle|swangle|swiftshader] [--log=verbose]
// Captions are off by default: published video carries them as a separate caption track (SRT).
import {existsSync, readFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {bundle} from '@remotion/bundler';
import {renderMedia, renderStill, selectComposition} from '@remotion/renderer';

const [input, output, ...flags] = process.argv.slice(2);
if (!input || !output) {
  console.error('Usage: render.mjs <playback.json> <out.mp4> [--captions] [--scale=N] [--still=<out.jpg>] [--still-frame=N]');
  process.exit(2);
}
const flag = (name) => flags.find((f) => f.startsWith(`--${name}=`))?.split('=')[1];
const projection = JSON.parse(readFileSync(input, 'utf8'));
const inputProps = {projection, motion: true, captions: flags.includes('--captions')};
const scale = Number(flag('scale') ?? 1);
const concurrency = flag('concurrency') ? Number(flag('concurrency')) : null;
const frameRange = flag('frames')?.split('-').map(Number) ?? null;
const chromiumOptions = flag('gl') ? {gl: flag('gl')} : {};
const logLevel = flag('log') ?? 'info';
// --browser=<path>: a Chrome to render with instead of Remotion's downloaded headless shell.
// Remotion's own headless shell crashes on macOS 27 (signal 6), so prefer an installed Chrome there.
const macChrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browserExecutable = flag('browser') ?? process.env.REMOTION_BROWSER ?? (process.platform === 'darwin' && existsSync(macChrome) ? macChrome : null);

const serveUrl = await bundle({entryPoint: resolve(dirname(fileURLToPath(import.meta.url)), 'src/render/Root.tsx')});
const composition = await selectComposition({serveUrl, id: 'otio', inputProps, chromiumOptions, logLevel, browserExecutable});
let last = -1;
await renderMedia({
  composition, serveUrl, inputProps, scale, concurrency, frameRange, chromiumOptions, logLevel, browserExecutable,
  // Remotion's shared-memory frame capture crashes headless Chrome on macOS 27 (signal 6 in mojo);
  // encoded screenshots are slower but reliable. --shared-memory opts back in.
  disableSharedMemoryCapture: !flags.includes('--shared-memory'),
  codec: 'h264', audioCodec: 'aac', outputLocation: output,
  onProgress: ({progress}) => {
    const pct = Math.floor(progress * 100);
    if (pct !== last && pct % 5 === 0) { last = pct; console.log(`progress ${pct}`); }
  },
});
console.log(`video ${output}`);

const still = flag('still');
if (still) {
  await renderStill({composition, serveUrl, inputProps, scale, browserExecutable, chromiumOptions, output: still, imageFormat: 'jpeg', jpegQuality: 88, frame: Number(flag('still-frame') ?? Math.round(projection.fps * 4))});
  console.log(`still ${still}`);
}
