# Plan

- [x] Declare PHP/Symfony, kit and core library dependencies.
- [x] Add a kit-based concrete bundle, RequiredBundle attribute and Flex discovery marker.
- [x] Register `bu/otio-bundle` in mono's split workflow with the package files.
- [ ] Publish both split repositories on GitHub and verify their Composer files.
- [ ] User registers the core and bundle on Packagist.
- [ ] Implement and test the core cut/gap/trim reader and projection first.
- [ ] Add cohesive method-level `otio:validate`, `otio:inspect`, `otio:project` commands and resolver wiring.
- [ ] Add Twig/Remotion UX integration using AbstractUxBundle and matching Composer/asset names.
- [ ] Create `otio-demo` only after the publication/registration prerequisite is met.
- [ ] Verify a real sample's playback and seeking, then add platform evidence retrieval.
- [ ] Replace the bootstrap `dev-main` core constraint with a tagged constraint before a stable release.

The detailed supported subset, source-retrieval architecture, platform conventions and acceptance criteria live with [survos/otio](https://github.com/survos/otio/blob/main/PLAN.md). Avoid duplicating timing logic or maintaining a second media catalog here.
