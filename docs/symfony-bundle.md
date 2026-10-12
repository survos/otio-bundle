> Historical design notes. The current implementation and package boundary are described in ../README.md.

# Symfony integration (planned)

## 2. `survos/otio-bundle`: thin Symfony wrapper

Namespace: `Survos\OtioBundle`. Composer type `symfony-bundle`; depends on `survos/otio`. Follow current Survos bundle conventions.

Keep timing, parsing, and projection algorithms in the library. The bundle adds service registration, configuration, Symfony commands, application media resolver wiring, and optional Twig integration.

Proposed commands (adapt to existing conventions):

```text
otio:validate input.otio
otio:inspect input.otio
otio:project input.otio --output=preview.json
```

Expose structured diagnostics and useful exit codes. Keep remote fetching separate from parsing. Restrict allowed schemes and application-managed storage roots; a submitted timeline must not cause arbitrary local-file reads or unrestricted server-side URL fetching.

### Twig component and React island

A Twig UX component can host React; Twig renders the mount point and serialized configuration, React mounts Remotion Player inside it. A tiny Stimulus controller may handle mounting/unmounting and Turbo navigation, but playback remains in React/Remotion. Do not migrate the application to React.

Proposed usage, subject to actual UX component conventions:

```twig
<twig:OtioPlayer timelineUrl="{{ path('demo_preview', {slug: sample.slug}) }}" />
```

Keep React/Remotion dependencies and the bundled entry point localized. Inspect AssetMapper support and existing frontend tooling before choosing Vite/esbuild. Give consumers a clear installation/build contract; Composer installation alone does not install npm dependencies. Pin compatible Remotion packages together.

Use Remotion's clock/sequences and documented synchronized media primitives. Implement source trimming, layering, mute/gain, deterministic Ken Burns, basic fades, and play/pause/seek controls. Seeking must produce the same transform as continuous playback at that frame. Test buffering and real media seeks; timing unit tests cannot establish decoding performance.

### Persistence

Do not require Doctrine or invent a second media catalog. Begin with a timeline repository interface and filesystem demo implementation. Evaluate optional application entities later: EditorialDocument (stable identity, title, version, source/provenance), immutable document revisions, and application asset associations. Store the canonical OTIO document, with a URL-free cached projection keyed by document hash, profile version, and source/resolver revision; resolve expiring URLs per request or bounded TTL. Do not persist expiring signed URLs as canonical media references.

Bookmark/exhibit/timeline integration should link document ID plus rational time/range and source asset IDs. Do not couple the core package to bookmark-bundle.
