# Survos OTIO Bundle

Thin Symfony integration for [survos/otio](https://github.com/survos/otio).

**Status: development scaffold.** The bundle class and Composer wiring exist. No OTIO commands, Twig player, React assets, configuration options or media resolvers are implemented yet. Publishing the repository allows Packagist registration before building the demo; it does not constitute a functional player release.

Requires PHP 8.5+, Symfony 8.1+ and `survos/kit-bundle` ^2.36. The core library is currently required as `dev-main`; replace that with a compatible tagged constraint for the first release.

## Installation after Packagist registration

Register `survos/otio` first, then this package. Until both have stable tags, explicitly opt in to both development packages in the consuming app:

```bash
composer require survos/otio-bundle:dev-main survos/otio:dev-main
```

Symfony Flex should register the bundles. Without Flex, add these entries to `config/bundles.php`:

```php
Survos\Kit\SurvosKitBundle::class => ['all' => true],
Survos\OtioBundle\SurvosOtioBundle::class => ['all' => true],
```

Use the existing `monolink` workflow for local source development. Do not add Composer path repositories or edit vendor files.

## Responsibilities

This package will wire the standalone library into Symfony, expose method-level console commands and host the player as a Twig/React island. Timing/parsing stay in the library; source retrieval, credentials and story orchestration stay in the application/integration layer.

The initial class extends kit's `AbstractSurvosBundle` because it ships no UX assets. When the player is added, switch to `AbstractUxBundle` and introduce the required `symfony-ux` keyword, `@survos/otio-bundle` assets/package.json and kit Stimulus helpers together. Preserve the Flex marker and required kit bundle declaration.

See [PLAN.md](PLAN.md) and the [core design docs](https://github.com/survos/otio/tree/main/docs). Do not start `otio-demo` until both repositories are published and registered on Packagist.

## Validation

```bash
composer validate --strict
php -l src/SurvosOtioBundle.php
```

MIT; see [LICENSE](LICENSE).
