# HCPlugins-actions

## Scope

This repository owns reusable GitHub Actions infrastructure for HeavenCube HCPlugins repositories.

Do not add Minecraft plugin business logic, Paper code, plugin-specific dependency versions or
project-specific hacks here.

## Design

- Keep workflows generic for Java/Gradle repositories.
- Java 25 is the default but remains an explicit reusable-workflow input.
- Consuming repositories own their Gradle build, dependency versions, Paper version and artifact layout.
- Prefer reusable workflows for the standard path and composite actions for custom jobs.
- Do not create a complex CI framework unless several HCPlugins repositories genuinely need it.

## Security

- Default to minimal GitHub token permissions.
- Pin third-party actions to immutable full commit SHAs.
- Do not print secrets or credentials.
- Pull-request builds must not require repository secrets.
- Publishing workflows may request only the permissions required by the target registry.

## Compatibility

- Treat workflow inputs and outputs as public API.
- Avoid silently changing input semantics.
- Breaking workflow contracts require a new major version once version tags are in use.
- During bootstrap, callers may use `@main`; once stable, consumers should move to `@v1`.

## Git

- Do not commit, push, rebase, reset, stash or force-update refs unless explicitly requested by the user.
