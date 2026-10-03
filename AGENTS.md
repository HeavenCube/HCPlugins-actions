# HCPlugins-actions

- CI : docs seules => aucun build/release manuel ; si commit autorisé, ajouter [skip ci].
  [ci-skip] : alias sur dernier commit push ou titre PR ; jamais pour code/tests/assets/build.
  Politique : https://github.com/HeavenCube/HCPlugins-actions/blob/main/docs/CI_COSTS.md.

## Entry point and efficient handoff

- Read this file, `git status --short`, then the relevant section of [docs/TECHNICAL.md](docs/TECHNICAL.md).
- For plugin architecture or a new consumer, inspect the sibling Core AGENTS and
  [Core's creation guide](https://github.com/HeavenCube/HCPlugins-Core/blob/main/docs/NEW_PLUGIN.md).
  Every specialized HCPlugins plugin requires HCCore; generic Java workflow consumers need not.
- Search only affected workflows/actions/callers with `rg`; batch independent reads and limit logs.
  Do not load every plugin source or all guides for a workflow/documentation task.
- Documentation-only changes: check links, contracts and `git diff --check`; no unnecessary Gradle builds.
- For workflow changes, validate YAML/shell and affected callers. Preserve release gating/concurrency,
  optional secret behavior and pinned action revisions; report local syntax checks separately from live CI.
- Maintain the guide when inputs/outputs change. CLAUDE.md/GEMINI.md point here, without copied rules.
- No subagents without an explicit request/applicable instruction. Resolve routine choices autonomously.
- Final response: concise French, changes, exact validation, remaining limitation/action. Handoff:
  goal, affected repositories/files/commits, verified results and next step. Never include secret values.

## Scope

This repository owns reusable GitHub Actions infrastructure for HeavenCube HCPlugins repositories.
Do not add Minecraft plugin business logic, Paper code or project-specific hacks here.

## Design

- Keep workflows generic for Java/Gradle repositories.
- Java 25 is the default but remains configurable.
- Consuming repositories own their Gradle build, dependency versions, Paper version and artifact layout.
- A successful build of the configured release branch may create the next numeric GitHub release.
- The numeric release number is the source of truth for tags; Gradle receives `-Pversion=YYYY.MM.DD-b<n>` for plugin metadata and JARs.
- Release builds also receive the UTC date as `-PbuildDate=YYYY.MM.DD`; release titles use `YYYY.MM.DD-b<n>`.
- Release notes list commits since the previous numeric release, including direct commits without pull requests.
- Release numbering uses the maximum existing numeric release tag matching the configured prefix, then increments by exactly one.
- Serialize builds per repository/ref so concurrent release builds cannot allocate the same version.
- Consumers that use Core compile its `core-api` project from the current `HCPlugins-Core` main source through a Gradle composite build; no Maven package is published.
- `source-repositories` optionally checks out other public sibling builds from `main` for Gradle composite consumers.
- Prefer reusable workflows for the standard path and composite actions for custom jobs.
- Do not create a complex CI framework unless several HCPlugins repositories genuinely need it.

## Security

- Default to minimal GitHub token permissions.
- Release callers need `contents: write`.
- Pin third-party actions to immutable full commit SHAs.
- Do not print secrets or credentials.
- Pull-request builds must not require repository secrets.

## Compatibility

- Treat workflow inputs and outputs as public API.
- Avoid silently changing input semantics.
- Consumers use `@main` to receive shared workflow updates automatically.
- Keep input and output changes compatible with existing consumers; coordinate breaking changes across affected repositories.

## Git

- Do not commit, push, rebase, reset, stash or force-update refs unless explicitly requested by the user.
