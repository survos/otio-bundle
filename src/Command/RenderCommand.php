<?php

declare(strict_types=1);

namespace Survos\OtioBundle\Command;

use Survos\OtioBundle\Render\RemotionRenderer;
use Symfony\Component\Console\Attribute\Argument;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Attribute\Option;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Style\SymfonyStyle;

#[AsCommand('otio:render', 'Render a playback projection (JSON) to MP4 with Remotion')]
final class RenderCommand
{
    public function __construct(private readonly RemotionRenderer $renderer)
    {
    }

    public function __invoke(
        SymfonyStyle $io,
        #[Argument('Playback projection JSON (RemotionProjector output)')] string $playback,
        #[Argument('Output MP4 path')] string $output,
        #[Option('Burn captions into the picture')] bool $captions = false,
        #[Option('Also render a JPEG still (e.g. a thumbnail) to this path')] ?string $still = null,
        #[Option('Output scale: 1.5 turns 1280x720 into 1920x1080')] float $scale = 1.0,
    ): int {
        if (null !== $reason = $this->renderer->unavailable()) {
            $io->warning($reason);

            return Command::FAILURE;
        }
        $projection = json_decode((string) file_get_contents($playback), true, flags: \JSON_THROW_ON_ERROR);
        $bar = $io->createProgressBar(100);
        $this->renderer->render($projection, $output, $captions, $still, $scale, static fn (int $p) => $bar->setProgress($p));
        $bar->finish();
        $io->newLine(2);
        $io->success(array_filter([$output, $still]));

        return Command::SUCCESS;
    }
}
