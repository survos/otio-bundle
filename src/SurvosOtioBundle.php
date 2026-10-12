<?php

declare(strict_types=1);

namespace Survos\OtioBundle;

use Survos\Kit\AbstractUxBundle;
use Survos\OtioBundle\Playback\RemotionProjector;
use Symfony\Component\DependencyInjection\ContainerBuilder;
use Symfony\Component\DependencyInjection\Loader\Configurator\ContainerConfigurator;
use Survos\Kit\SurvosKitBundle;
use Symfony\Component\DependencyInjection\Kernel\RequiredBundle;

#[RequiredBundle(SurvosKitBundle::class)]
// Symfony\Component\HttpKernel\Bundle\Bundle <-- Flex auto-registration marker (see Survos\Kit\AbstractSurvosBundle)
final class SurvosOtioBundle extends AbstractUxBundle
{
    public function loadExtension(array $config, ContainerConfigurator $container, ContainerBuilder $builder): void
    {
        parent::loadExtension($config, $container, $builder);
        $container->services()->set(RemotionProjector::class)->autowire()->autoconfigure();
    }
}
