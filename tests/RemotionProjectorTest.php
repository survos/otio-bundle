<?php

declare(strict_types=1);

namespace Survos\OtioBundle\Tests;

use PHPUnit\Framework\TestCase;
use Survos\Otio\Timeline;
use Survos\OtioBundle\Playback\RemotionProjector;

final class RemotionProjectorTest extends TestCase
{
    private function timeline(array $children): Timeline
    {
        return new Timeline(['OTIO_SCHEMA' => 'Timeline.1', 'tracks' => ['OTIO_SCHEMA' => 'Stack.1', 'children' => [['OTIO_SCHEMA' => 'Track.1', 'kind' => 'Video', 'children' => $children]]]]);
    }

    private function item(string $schema, float $start, float $duration, float $rate): array
    {
        return ['OTIO_SCHEMA' => $schema, 'source_range' => ['OTIO_SCHEMA' => 'TimeRange.1', 'start_time' => ['OTIO_SCHEMA' => 'RationalTime.1', 'value' => $start, 'rate' => $rate], 'duration' => ['OTIO_SCHEMA' => 'RationalTime.1', 'value' => $duration, 'rate' => $rate]], 'media_reference' => ['OTIO_SCHEMA' => 'ExternalReference.1', 'target_url' => 'asset:test']];
    }

    private function resolve(string $id): array
    {
        return ['id' => $id, 'url' => '/test.mp4', 'kind' => 'video'];
    }

    public function testGapAndSourceTrimRemainSeparate(): void
    {
        $timeline = $this->timeline([$this->item('Clip.1', 120, 48, 24), $this->item('Gap.1', 0, 15, 30), $this->item('Clip.1', 60, 60, 30)]);
        $result = (new RemotionProjector())->project($timeline, $this->resolve(...));
        self::assertSame([0, 75], array_column($result['clips'], 'startFrame'));
        self::assertSame([60, 60], array_column($result['clips'], 'durationFrames'));
        self::assertSame([5.0, 2.0], array_column($result['clips'], 'sourceStartSeconds'));
        self::assertSame(135, $result['durationFrames']);
        self::assertTrue($result['clips'][0]['muted']);
    }

    public function testAbsoluteRoundingDoesNotAccumulateDrift(): void
    {
        $timeline = $this->timeline(array_fill(0, 24, $this->item('Clip.1', 0, 1, 24)));
        $result = (new RemotionProjector())->project($timeline, $this->resolve(...));
        self::assertSame(30, $result['durationFrames']);
        self::assertSame(30, array_sum(array_column($result['clips'], 'durationFrames')));
    }

    public function testUnsupportedTransitionIsNotFlattened(): void
    {
        $this->expectException(\DomainException::class);
        $this->expectExceptionMessage('unsupported Transition.1');
        (new RemotionProjector())->project($this->timeline([['OTIO_SCHEMA' => 'Transition.1']]), $this->resolve(...));
    }
}
