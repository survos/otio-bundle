<?php

declare(strict_types=1);

namespace Survos\OtioBundle\Playback;

use Survos\Otio\Clip;
use Survos\Otio\ExternalReference;
use Survos\Otio\Gap;
use Survos\Otio\Node;
use Survos\Otio\Timeline;
use Survos\Otio\Track;

/** Strict, deliberately small OTIO -> viewer adapter. Never silently flattens unsupported edits. */
final class RemotionProjector
{
    public function project(Timeline $timeline, callable $resolve): array
    {
        $profile = $timeline->metadata()['survos'] ?? [];
        if (($profile['version'] ?? 1) !== 1) {
            throw new \DomainException('metadata.survos.version: expected 1');
        }
        $fps = (float) ($profile['fps'] ?? 30);
        $width = (int) ($profile['width'] ?? 1920);
        $height = (int) ($profile['height'] ?? 1080);
        if ($fps <= 0 || !is_finite($fps) || $fps > 240 || $width < 1 || $height < 1) {
            throw new \DomainException('Invalid composition dimensions or rate.');
        }
        $fades = [];
        foreach (['fadeInSeconds', 'fadeOutSeconds'] as $key) {
            $value = $profile[$key] ?? 0;
            if (!is_numeric($value) || !is_finite((float) $value) || $value < 0 || $value > 10) {
                throw new \DomainException("metadata.survos.$key: expected 0–10 seconds");
            }
            $fades[$key] = (float) $value;
        }
        $this->check($timeline->tracks(), 'tracks', true);
        $clips = [];
        $duration = 0;
        foreach ($timeline->tracks()->children() as $layer => $track) {
            $path = "tracks.children[$layer]";
            if (!$track instanceof Track) {
                throw new \DomainException("$path: only flat Track.1 children are supported");
            }
            $this->check($track, $path, true);
            if (!in_array($track->kind(), ['Video', 'Audio'], true)) {
                throw new \DomainException("$path: unsupported track kind");
            }
            $cursor = 0.0;
            foreach ($track->children() as $index => $item) {
                $itemPath = "$path.children[$index]";
                $this->check($item, $itemPath);
                if (!$item instanceof Clip && !$item instanceof Gap) {
                    throw new \DomainException("$itemPath: unsupported {$item->schema()}");
                }
                $range = $item->sourceRange() ?? throw new \DomainException("$itemPath: explicit source_range required");
                $seconds = $range->duration->seconds();
                $start = (int) round($cursor * $fps);
                $cursor += $seconds;
                $end = (int) round($cursor * $fps);
                if ($item instanceof Gap) {
                    continue;
                }
                if ($end <= $start) {
                    throw new \DomainException("$itemPath: clip has no output frames");
                }
                $ref = $item->mediaReference();
                if (!$ref instanceof ExternalReference) {
                    throw new \DomainException("$itemPath: missing or unsupported media reference");
                }
                $media = $resolve($ref->targetUrl());
                if (!is_array($media) || !isset($media['url'], $media['kind'], $media['id']) || !in_array($media['kind'], ['image', 'audio', 'video'], true)) {
                    throw new \DomainException("$itemPath: resolver must supply id, url and explicit media kind");
                }
                if (('Audio' === $track->kind()) !== ('audio' === $media['kind'])) {
                    throw new \DomainException("$itemPath: media kind does not match track");
                }
                $trim = $range->startTime->seconds();
                if ($trim < 0 || ('image' === $media['kind'] && 0 != $trim)) {
                    throw new \DomainException("$itemPath: invalid source trim");
                }
                if (($available = $ref->availableRange()) && ($trim < $available->startTime->seconds() || $trim + $seconds > $available->endExclusive()->seconds() + 0.000001)) {
                    throw new \DomainException("$itemPath: source range exceeds available range");
                }
                $meta = $item->metadata()['survos'] ?? [];
                $motion = $meta['motion'] ?? ['fromScale' => 1, 'toScale' => 1, 'fromX' => 50, 'toX' => 50, 'fromY' => 50, 'toY' => 50];
                foreach (['fromScale', 'toScale', 'fromX', 'toX', 'fromY', 'toY'] as $key) {
                    if (!is_numeric($motion[$key] ?? null) || !is_finite((float) $motion[$key])) {
                        throw new \DomainException("$itemPath: invalid motion.$key");
                    }
                }
                if ($motion['fromScale'] < 1 || $motion['toScale'] < 1 || $motion['fromScale'] > 3 || $motion['toScale'] > 3) {
                    throw new \DomainException("$itemPath: scale outside supported range");
                }
                $clipFades = [];
                foreach (['fadeInSeconds', 'fadeOutSeconds'] as $key) {
                    $value = $meta[$key] ?? 0;
                    if (!is_numeric($value) || !is_finite((float) $value) || $value < 0 || $value > $seconds) {
                        throw new \DomainException("$itemPath: metadata.survos.$key must be between 0 and the clip duration");
                    }
                    $clipFades[$key] = (int) round((float) $value * $fps);
                }
                $gain = (float) ($meta['gain'] ?? 1);
                if (!is_finite($gain) || $gain < 0 || $gain > 1) {
                    throw new \DomainException("$itemPath: gain must be between 0 and 1");
                }
                $clips[] = [
                    'id' => "$layer-$index", 'assetId' => $media['id'], 'name' => $item->name(),
                    'kind' => $media['kind'], 'url' => $media['url'], 'layer' => $layer,
                    'startFrame' => $start, 'durationFrames' => $end - $start,
                    'sourceStartSeconds' => $trim, 'motion' => $motion, 'gain' => $gain,
                    // Embedded video sound is opt-in; audio tracks own sound by default.
                    'muted' => 'video' === $media['kind'] && !($meta['embeddedAudio'] ?? false),
                    'layout' => \in_array($meta['layout'] ?? null, ['lower-third', 'title', 'credits'], true) ? $meta['layout'] : 'editorial',
                    'caption' => (string) ($meta['caption'] ?? ''), 'eyebrow' => (string) ($meta['eyebrow'] ?? ''),
                    'credit' => (string) ($media['credit'] ?? ''),
                    // Clip-relative opacity ramps; an upper layer fading in over the clip below is a crossfade.
                    'fadeInFrames' => $clipFades['fadeInSeconds'], 'fadeOutFrames' => $clipFades['fadeOutSeconds'],
                ];
            }
            $duration = max($duration, (int) round($cursor * $fps));
        }
        if ($duration < 1) {
            throw new \DomainException('Timeline has no duration.');
        }

        return ['version' => 1, 'title' => $timeline->name(), 'fps' => $fps, 'width' => $width, 'height' => $height, 'durationFrames' => $duration, 'fadeInFrames' => (int) round($fades['fadeInSeconds'] * $fps), 'fadeOutFrames' => (int) round($fades['fadeOutSeconds'] * $fps), 'clips' => $clips, 'diagnostics' => []];
    }

    private function check(Node $node, string $path, bool $composition = false): void
    {
        $raw = $node->jsonSerialize();
        if (!empty($raw['effects'])) {
            throw new \DomainException("$path.effects: effects/retiming are not supported by this viewer yet");
        }
        if (($raw['enabled'] ?? true) !== true) {
            throw new \DomainException("$path.enabled: disabled items are not supported yet");
        }
        if ($composition && null !== $node->sourceRange()) {
            throw new \DomainException("$path.source_range: trimmed compositions are not supported yet");
        }
    }
}
