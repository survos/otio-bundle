import {fadeLevel} from './fade';
import {subtitleAt, subtitleChunks} from './subtitles';
import React, {createRef, useEffect} from 'react';
import {createRoot} from 'react-dom/client';
import {Player, type PlayerRef} from '@remotion/player';
import {AbsoluteFill, Easing, Img, Sequence, interpolate, Html5Audio as Audio, Html5Video as Video, useCurrentFrame} from 'remotion';

export type PlaybackClip = {
  id: string; assetId: string; name: string; kind: 'image' | 'audio' | 'video'; url: string;
  startFrame: number; durationFrames: number; sourceStartSeconds: number; layer: number;
  gain: number; muted: boolean; layout: 'editorial' | 'lower-third' | 'title' | 'credits'; caption: string; eyebrow: string; credit: string;
  fadeInFrames?: number; fadeOutFrames?: number;
  motion: {fromScale: number; toScale: number; fromX: number; toX: number; fromY: number; toY: number};
};
export type Playback = {version: number; title: string; fps: number; width: number; height: number; durationFrames: number; fadeInFrames?: number; fadeOutFrames?: number; clips: PlaybackClip[]};
type CompositionProps = {projection: Playback; motion: boolean; captions: boolean};

const EASE = Easing.bezier(0.65, 0, 0.35, 1);
/** 0→1→0 envelope: in over [start, start+len], out over [end-len, end] (frames, clip-relative). */
function wipe(frame: number, start: number, end: number, len = 20): number {
  if (end - start < 2 * len) return frame >= start && frame < end ? 1 : 0;
  return interpolate(frame, [start, start + len, end - len, end], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE});
}
/** A left-to-right crop reveal, the way broadcast lower thirds wipe on and off. */
const reveal = (amount: number): React.CSSProperties => ({clipPath: `inset(0 ${(1 - amount) * 100}% 0 0)`});

function Visual({clip, fps, motion, captions, level}: {clip: PlaybackClip; fps: number; motion: boolean; captions: boolean; level: number}) {
  const frame = useCurrentFrame();
  const progress = Math.min(1, Math.max(0, frame / Math.max(1, clip.durationFrames - 1)));
  const scale = motion ? interpolate(progress, [0, 1], [clip.motion.fromScale, clip.motion.toScale]) : 1;
  const x = motion ? interpolate(progress, [0, 1], [clip.motion.fromX, clip.motion.toX]) : 50;
  const y = motion ? interpolate(progress, [0, 1], [clip.motion.fromY, clip.motion.toY]) : 50;
  // Clip-relative fades: an upper layer fading in over the clip below reads as a crossfade.
  const opacity = fadeLevel(frame, clip.durationFrames, clip.fadeInFrames ?? 0, clip.fadeOutFrames ?? 0);
  const lower = clip.layout === 'lower-third';
  const title = clip.layout === 'title';
  const credits = clip.layout === 'credits';
  // A lower third identifies the scene, then gets out of the way (about five seconds).
  const lowerHold = Math.min(clip.durationFrames, Math.round(fps * 5.5));
  const lowerIn = (delay: number) => wipe(frame, 8 + delay, lowerHold - delay);
  const lowerOn = lower && frame < lowerHold;
  // Title card: each element rises in after `seconds`; all clear 1.6s before the clip ends.
  const titleIn = (seconds: number) => wipe(frame, Math.round(seconds * fps), clip.durationFrames - Math.round(1.6 * fps), Math.round(0.7 * fps));
  const imageStyle: React.CSSProperties = {width: '100%', height: '100%', objectFit: 'cover', objectPosition: `${x}% ${y}%`, transform: `scale(${scale})`, transformOrigin: `${x}% ${y}%`};
  return <AbsoluteFill style={{background: 'transparent', opacity, overflow: 'hidden'}}>
    {clip.kind === 'image'
      ? <Img src={clip.url} style={imageStyle} data-otio-visual={clip.id}/>
      : <Video src={clip.url} preload="metadata" trimBefore={Math.round(clip.sourceStartSeconds * fps)} muted={clip.muted} volume={clip.gain * level} style={imageStyle}/>}
    {credits ? <>
    <AbsoluteFill style={{background:'rgba(4,9,15,.86)', pointerEvents:'none'}}/>
    <div data-otio-credits style={{position:'absolute',left:0,right:0,top:`${(1-progress)*100}%`,transform:`translateY(-${progress*100}%)`,textAlign:'center',color:'#fffaf1'}}>
      <div style={{fontSize:16,letterSpacing:4,textTransform:'uppercase',color:'#d9b071'}}>{clip.eyebrow}</div>
      <div style={{fontFamily:'Georgia, serif',fontSize:56,margin:'14px 0 60px'}}>{clip.name}</div>
      {clip.caption.split(/\n\s*\n/).map((section, i) => {
        const [heading, ...lines] = section.split('\n');
        return <div key={i} style={{marginBottom:56}}>
          <div style={{fontSize:16,letterSpacing:4,textTransform:'uppercase',color:'#d9b071',marginBottom:16}}>{heading}</div>
          {lines.map((line, j) => <div key={j} style={{fontSize:24,lineHeight:1.6,color:'#e5dfd5'}}>{line}</div>)}
        </div>;
      })}
    </div>
    </> : title ? <>
    <AbsoluteFill style={{background:'radial-gradient(ellipse at center, rgba(4,9,15,.55), rgba(4,9,15,.88))', pointerEvents:'none'}}/>
    {/* Staggered entrance; the text clears before the next scene dissolves in. */}
    <AbsoluteFill data-otio-title style={{alignItems:'center',justifyContent:'center',textAlign:'center',padding:'0 120px',color:'#fffaf1'}}>
      <div style={{fontSize:18,letterSpacing:5,textTransform:'uppercase',color:'#d9b071',marginBottom:26,opacity:titleIn(0.5),...reveal(titleIn(0.5))}}>{clip.eyebrow}</div>
      <div style={{fontFamily:'Georgia, serif',fontWeight:400,fontSize:84,lineHeight:1.05,color:'#fffaf1',opacity:titleIn(0.9),transform:`translateY(${(1-titleIn(0.9))*14}px)`}}>{clip.name}</div>
      <div style={{width:64,height:3,background:'#d9b071',margin:'30px auto',...reveal(titleIn(1.6))}}/>
      {captions && <div style={{fontSize:26,lineHeight:1.45,maxWidth:880,color:'#e5dfd5',opacity:titleIn(2.0)}}>{clip.caption}</div>}
    </AbsoluteFill>
    </> : lower ? <div data-otio-lower-third style={{position:'absolute',left:64,bottom:64,display:'flex',flexDirection:'column',alignItems:'flex-start'}}>
      {clip.eyebrow && <div style={{background:'#d9b071',color:'#14181c',font:'700 17px/1 Arial, Helvetica, sans-serif',letterSpacing:2,padding:'8px 14px',...reveal(lowerIn(4))}}>{clip.eyebrow}</div>}
      <div style={{background:'rgba(14,18,22,.9)',color:'#fffaf1',fontFamily:'Georgia, serif',fontSize:34,lineHeight:1,padding:'14px 18px',whiteSpace:'nowrap',...reveal(lowerIn(0))}}>{clip.name}</div>
    </div> : <>
    <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(4,9,15,.18), transparent 36%, rgba(4,9,15,.75))', pointerEvents: 'none'}}/>
    {clip.eyebrow && <div data-otio-eyebrow style={{position:'absolute',top:40,right:48,maxWidth:640,textAlign:'right',color:'#f6ede0',fontSize:18,fontWeight:600,letterSpacing:2,textShadow:'0 1px 4px rgba(0,0,0,.85)'}}>{clip.eyebrow}</div>}
    <div style={{position:'absolute',bottom:150,left:60,right:60,color:'#fffaf1'}}>
      <div style={{width:42,height:3,background:'#d9b071',marginBottom:22}}/>
      <h2 style={{color:'#fffaf1',fontFamily:'Georgia, serif',fontWeight:400,fontSize:66,lineHeight:1.03,margin:0,maxWidth:950}}>{clip.name}</h2>
    </div>
    </>}
    {/* Closed captions: the narration as subtitles, white on a solid box so they read on any picture. */}
    {/* While a lower third is up, captions move to the top of the frame, as broadcasters do. */}
    {captions && !title && !credits && clip.caption && <div data-otio-cc style={{position:'absolute',left:'10%',right:'10%',...(lowerOn ? {top:36} : {bottom:36}),textAlign:'center'}}>
      <span style={{background:'rgba(0,0,0,.82)',color:'#fff',font:'500 30px/1.5 Arial, Helvetica, sans-serif',padding:'3px 12px',boxDecorationBreak:'clone',WebkitBoxDecorationBreak:'clone'}}>{subtitleAt(subtitleChunks(clip.caption), progress)}</span>
    </div>}
    {!credits && clip.credit && <div data-otio-credit style={{position:'absolute',bottom:22,right:36,color:'#e5dfd5',fontSize:15,letterSpacing:1,textShadow:'0 1px 3px rgba(0,0,0,.8)'}}>{clip.credit}</div>}
  </AbsoluteFill>;
}

function Composition({projection, motion, captions}: CompositionProps) {
  const frame = useCurrentFrame();
  const level = fadeLevel(frame, projection.durationFrames, projection.fadeInFrames, projection.fadeOutFrames);
  return <AbsoluteFill style={{background:'#000',fontFamily:'Arial, sans-serif'}}>
    <AbsoluteFill data-otio-fade={level} style={{opacity:level}}>
    {projection.clips.map(clip => <Sequence key={clip.id} from={clip.startFrame} durationInFrames={clip.durationFrames} premountFor={Math.round(projection.fps)} name={clip.name}>
      {clip.kind === 'audio'
        ? <Audio src={clip.url} trimBefore={Math.round(clip.sourceStartSeconds * projection.fps)} volume={clip.gain * level} />
        : <Visual clip={clip} fps={projection.fps} motion={motion} captions={captions} level={level}/>}
    </Sequence>)}
    </AbsoluteFill>
  </AbsoluteFill>;
}

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
