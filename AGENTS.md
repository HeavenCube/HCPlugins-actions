# HCPlugins-actions

## Scope

This repository owns reusable GitHub Actions infrastructure for HeavenCube HCPlugins repositories.
Do not add Minecraft plugin business logic, Paper code or project-specific hacks here.

## Design

- Keep workflows generic for Java/Gradle repositories.
- Java 25 is the default but remains configurable.
- Consuming repositories own their Gradle build, dependency versions, Paper version and artifact layout.
- A successful build of the configured release branch may create the next numeric GitHub release.
- The release number is the source of truth for CI release builds and is passed to Gradle as `-Pversion=<n>`.
- Release builds also receive the UTC date as `-PbuildDate=YYYY.MM.DD`; titles use `<project-name>-YYYY.MM.DD-b<n>`.
- Release notes list commits since the previous numeric release, including direct commits without pull requests.
- Release numbering uses the maximum existing numeric release tag matching the configured prefix, then increments by exactly one.
- Serialize builds per repository/ref so concurrent release builds cannot allocate the same version.
- Optional package publication must happen in the same release build when it depends on that generated version; do not rely on a release created with `GITHUB_TOKEN` to trigger another workflow.
- Prefer reusable workflows for the standard path and composite actions for custom jobs.
- Do not create a complex CI framework unless several HCPlugins repositories genuinely need it.

## Security

- Default to minimal GitHub token permissions.
- Release callers need `contents: write`; Maven-package callers additionally need `packages: write`.
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
