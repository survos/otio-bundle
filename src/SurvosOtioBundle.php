<?php

declare(strict_types=1);

namespace Survos\OtioBundle;

use Survos\Kit\AbstractUxBundle;
use Survos\Kit\SurvosKitBundle;
use Survos\OtioBundle\Command\RenderCommand;
use Survos\OtioBundle\Playback\RemotionProjector;
use Survos\OtioBundle\Render\RemotionRenderer;
use Symfony\Component\DependencyInjection\ContainerBuilder;
use Symfony\Component\DependencyInjection\Kernel\RequiredBundle;
use Symfony\Component\DependencyInjection\Loader\Configurator\ContainerConfigurator;

#[RequiredBundle(SurvosKitBundle::class)]
// Symfony\Component\HttpKernel\Bundle\Bundle <-- Flex auto-registration marker (see Survos\Kit\AbstractSurvosBundle)
final class SurvosOtioBundle extends AbstractUxBundle
{
    public function loadExtension(array $config, ContainerConfigurator $container, ContainerBuilder $builder): void
    {
        parent::loadExtension($config, $container, $builder);
        $container->services()->set(RemotionProjector::class)->autowire()->autoconfigure();
        $container->services()->set(RemotionRenderer::class)->autowire()->autoconfigure();
        $container->services()->set(RenderCommand::class)->autowire()->autoconfigure();
    }
}
