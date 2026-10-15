import React, {createRef, useEffect} from 'react';
import {createRoot} from 'react-dom/client';
import {Player, type PlayerRef} from '@remotion/player';
import {Composition, type Playback} from './composition';

export type {Playback, PlaybackClip} from './composition';

/** React and Remotion are private implementation details of this ESM entrypoint. */
export function mountOtioPlayer(element: HTMLElement, projection: Playback) {
  if (projection.version !== 1 || projection.durationFrames < 1) throw new Error('Unsupported or empty OTIO playback projection.');
  const root = createRoot(element);
  const ref = createRef<PlayerRef>();
  let motion = true;
  let captions = true;
  const emit = (name: string, detail: unknown) => element.dispatchEvent(new CustomEvent(`otio:${name}`, {detail, bubbles:true}));
  function Host() {
    useEffect(() => {
      const player = ref.current;
      if (!player) return;
      const frame = () => emit('frame', {frame:player.getCurrentFrame(), fps:projection.fps});
      const play = () => emit('play', {});
      const pause = () => emit('pause', {});
      player.addEventListener('frameupdate', frame);
      player.addEventListener('play', play);
      player.addEventListener('pause', pause);
      return () => {player.removeEventListener('frameupdate', frame);player.removeEventListener('play',play);player.removeEventListener('pause',pause);};
    }, []);
    return <Player ref={ref} component={Composition} inputProps={{projection,motion,captions}}
      durationInFrames={projection.durationFrames} compositionWidth={projection.width} compositionHeight={projection.height}
      fps={projection.fps} controls clickToPlay showVolumeControls doubleClickToFullscreen
      renderCustomControls={() => <button type="button" data-otio-cc aria-pressed={captions} title={captions ? 'Hide captions' : 'Show captions'}
        onClick={() => setCaptions(!captions)}
        style={{background:'none',border:'2px solid #fff',borderRadius:4,color:'#fff',font:'700 12px/1 Arial, sans-serif',padding:'3px 5px',marginRight:10,cursor:'pointer',opacity:captions ? 1 : 0.5}}>CC</button>}
      style={{width:'100%',aspectRatio:`${projection.width}/${projection.height}`,borderRadius:10,overflow:'hidden'}}
      errorFallback={({error}: {error: Error}) => <div role="alert" style={{color:'white',padding:24}}>Playback failed: {error.message}</div>}/>;
  }
  const render = () => root.render(<Host/>);
  // The CC button and the host page both toggle captions; otio:captions keeps a page checkbox in sync.
  function setCaptions(enabled: boolean) {captions = enabled;render();emit('captions', {enabled});}
  render();
  return {
    play: () => ref.current?.play(), pause: () => ref.current?.pause(),
    seekTo: (frame: number) => ref.current?.seekTo(Math.max(0,Math.min(projection.durationFrames - 1,Math.round(frame)))),
    getCurrentFrame: () => ref.current?.getCurrentFrame() ?? 0,
    setMotion: (enabled: boolean) => {motion = enabled;render();},
    setCaptions,
    unmount: () => root.unmount(),
  };
}
