/** Remotion root for rendering: one composition, sized and timed by the playback projection it is given. */
import React from 'react';
import {Composition as RemotionComposition, registerRoot} from 'remotion';
import {Composition, type CompositionProps} from '../composition';

const Film: React.FC<CompositionProps> = (props) => <Composition {...props}/>;

function Root() {
  return <RemotionComposition
    id="otio"
    component={Film}
    defaultProps={{projection: {version: 1, title: '', fps: 30, width: 1280, height: 720, durationFrames: 1, clips: []}, motion: true, captions: false}}
    calculateMetadata={({props}) => ({durationInFrames: props.projection.durationFrames, fps: props.projection.fps, width: props.projection.width, height: props.projection.height})}
    durationInFrames={1} fps={30} width={1280} height={720}
  />;
}

registerRoot(Root);
