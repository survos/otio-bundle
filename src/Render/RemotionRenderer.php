<?php

declare(strict_types=1);

namespace Survos\OtioBundle\Render;

use Symfony\Component\Filesystem\Filesystem;
use Symfony\Component\Process\ExecutableFinder;
use Symfony\Component\Process\Process;

/**
 * Renders a playback projection (RemotionProjector output) to MP4, using the same composition as
 * the browser player, through Remotion's renderer in Node (assets/render.mjs).
 *
 * Optional tooling: it needs `node` and the bundle's render packages (`npm ci` in assets/). When
 * either is missing, unavailable() says what to install and render() refuses before starting.
 */
final class RemotionRenderer
{
    private readonly string $assets;

    public function __construct(
        private readonly Filesystem $files = new Filesystem(),
    ) {
        $this->assets = \dirname(__DIR__, 2).'/assets';
    }

    /** Why rendering cannot run here, or null when it can. */
    public function unavailable(): ?string
    {
        if (null === $this->node()) {
            return 'MP4 rendering needs Node.js (node 20+) on the PATH.';
        }
        if (!is_dir($this->assets.'/node_modules/@remotion/renderer')) {
            return \sprintf('MP4 rendering needs the render packages: npm ci --prefix %s', $this->assets);
        }

        return null;
    }

    /**
     * @param array<string, mixed>              $projection RemotionProjector::project() output
     * @param callable(int $percent): void|null $progress
     */
    public function render(array $projection, string $output, bool $captions = false, ?string $still = null, float $scale = 1.0, ?callable $progress = null): void
    {
        if (null !== $reason = $this->unavailable()) {
            throw new \RuntimeException($reason);
        }
        $input = $this->files->tempnam(sys_get_temp_dir(), 'otio-playback', '.json');
        $this->files->dumpFile($input, json_encode($projection, \JSON_THROW_ON_ERROR | \JSON_UNESCAPED_SLASHES));
        $this->files->mkdir(\dirname($output));

        $command = [$this->node(), $this->assets.'/render.mjs', $input, $output, '--scale='.$scale];
        if ($captions) {
            $command[] = '--captions';
        }
        if (null !== $still) {
            $command[] = '--still='.$still;
        }
        $process = new Process($command, $this->assets, timeout: null);
        try {
            $process->mustRun(static function (string $type, string $buffer) use ($progress): void {
                if (null !== $progress && preg_match_all('/^progress (\d+)$/m', $buffer, $m)) {
                    foreach ($m[1] as $percent) {
                        $progress((int) $percent);
                    }
                }
            });
        } finally {
            $this->files->remove($input);
        }
    }

    private function node(): ?string
    {
        return (new ExecutableFinder())->find('node');
    }
}
