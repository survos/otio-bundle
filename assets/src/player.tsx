import {fadeLevel} from './fade';
import React, {createRef, useEffect} from 'react';
import {createRoot} from 'react-dom/client';
import {Player, type PlayerRef} from '@remotion/player';
import {AbsoluteFill, Img, Sequence, interpolate, spring, Html5Audio as Audio, Html5Video as Video, useCurrentFrame} from 'remotion';

export type PlaybackClip = {
  id: string; assetId: string; name: string; kind: 'image' | 'audio' | 'video'; url: string;
  startFrame: number; durationFrames: number; sourceStartSeconds: number; layer: number;
  gain: number; muted: boolean; layout: 'editorial' | 'lower-third'; caption: string; eyebrow: string; credit: string;
  motion: {fromScale: number; toScale: number; fromX: number; toX: number; fromY: number; toY: number};
};
export type Playback = {version: number; title: string; fps: number; width: number; height: number; durationFrames: number; fadeInFrames?: number; fadeOutFrames?: number; clips: PlaybackClip[]};
type CompositionProps = {projection: Playback; motion: boolean; captions: boolean};

function Visual({clip, fps, motion, captions, level}: {clip: PlaybackClip; fps: number; motion: boolean; captions: boolean; level: number}) {
  const frame = useCurrentFrame();
  const progress = Math.min(1, Math.max(0, frame / Math.max(1, clip.durationFrames - 1)));
  const scale = motion ? interpolate(progress, [0, 1], [clip.motion.fromScale, clip.motion.toScale]) : 1;
  const x = motion ? interpolate(progress, [0, 1], [clip.motion.fromX, clip.motion.toX]) : 50;
  const y = motion ? interpolate(progress, [0, 1], [clip.motion.fromY, clip.motion.toY]) : 50;
  const opacity = 1;
  const lower = clip.layout === 'lower-third';
  const entrance = motion ? spring({frame: Math.max(0,frame - 8), fps, config:{damping:200}}) : 1;
  const imageStyle: React.CSSProperties = {width: '100%', height: '100%', objectFit: 'cover', objectPosition: `${x}% ${y}%`, transform: `scale(${scale})`, transformOrigin: `${x}% ${y}%`};
  return <AbsoluteFill style={{background: '#080d12', opacity, overflow: 'hidden'}}>
    {clip.kind === 'image'
      ? <Img src={clip.url} style={imageStyle} data-otio-visual={clip.id}/>
      : <Video src={clip.url} preload="metadata" trimBefore={Math.round(clip.sourceStartSeconds * fps)} muted={clip.muted} volume={clip.gain * level} style={imageStyle}/>}
    {lower ? <div data-otio-lower-third style={{position:'absolute',left:54,bottom:64,maxWidth:900,transform:`translateX(${(1-entrance)*-50}px)`,opacity:entrance,color:'#fffaf1',background:'rgba(12,25,25,.88)',borderLeft:'5px solid #d9b071',padding:'22px 30px'}}>
      <div style={{fontSize:16,letterSpacing:3,textTransform:'uppercase',color:'#d9b071',marginBottom:10}}>{clip.eyebrow}</div>
      <div style={{fontFamily:'Georgia,serif',fontSize:42,lineHeight:1.1}}>{clip.name}</div>
      {captions && <div style={{fontSize:20,marginTop:12,lineHeight:1.4}}>{clip.caption}</div>}
    </div> : <>
    <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(4,9,15,.18), transparent 36%, rgba(4,9,15,.9))', pointerEvents: 'none'}}/>
    <div style={{position:'absolute',top:48,left:60,color:'#f6ede0',fontSize:19,fontWeight:600,letterSpacing:4,textTransform:'uppercase'}}>{clip.eyebrow}</div>
    <div style={{position:'absolute',bottom:70,left:60,right:60,color:'#fffaf1'}}>
      <div style={{width:42,height:3,background:'#d9b071',marginBottom:22}}/>
      <h2 style={{fontFamily:'Georgia, serif',fontWeight:400,fontSize:66,lineHeight:1.03,margin:'0 0 20px',maxWidth:950}}>{clip.name}</h2>
      {captions && <p style={{fontSize:25,lineHeight:1.45,maxWidth:950,margin:0,color:'#e5dfd5'}}>{clip.caption}</p>}
    </div>
    </>}
    <div style={{position:'absolute',bottom:24,right:40,color:'#c7c0b5',fontSize:14,letterSpacing:1}}>{clip.credit}</div>
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
      style={{width:'100%',aspectRatio:`${projection.width}/${projection.height}`,borderRadius:10,overflow:'hidden'}}
      errorFallback={({error}: {error: Error}) => <div role="alert" style={{color:'white',padding:24}}>Playback failed: {error.message}</div>}/>;
  }
  const render = () => root.render(<Host/>);
  render();
  return {
    play: () => ref.current?.play(), pause: () => ref.current?.pause(),
    seekTo: (frame: number) => ref.current?.seekTo(Math.max(0,Math.min(projection.durationFrames - 1,Math.round(frame)))),
    getCurrentFrame: () => ref.current?.getCurrentFrame() ?? 0,
    setMotion: (enabled: boolean) => {motion = enabled;render();},
    setCaptions: (enabled: boolean) => {captions = enabled;render();},
    unmount: () => root.unmount(),
  };
}
