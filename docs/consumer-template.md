# Consumer template

Standard HCPlugins repository without a Core source dependency:

Every new plugin repository must also copy `templates/plugin/LICENSE` from this
repository to its root as `LICENSE`. The source is visible for contributions,
but use outside the official HeavenCube server requires prior written permission.

Store editable files under `plugins/HCPlugins/` using Core's
`fr.noltox.hcplugins.core.api.config.HCPluginFiles`. A plugin with one
configuration uses `<PluginName>.yml` at that root. A plugin with multiple
configuration files uses `<PluginName>/` beneath it. Copy bundled defaults with
`HCPluginFiles.copyDefault(...)`; Paper's `saveDefaultConfig()` and
`saveResource()` use the plugin's own data folder instead.

```yaml
name: Build

on:
  push:
    branches: [main]
  pull_request:
  workflow_dispatch:

permissions:
  contents: write

jobs:
  build:
    uses: HeavenCube/HCPlugins-actions/.github/workflows/build.yml@main
    with:
      project-name: HCExample
      artifact-path: build/libs/HCExample-*.jar
    secrets: inherit
```

A successful `main` build creates `v1`, then `v2`, etc. Gradle receives a plugin
version such as `2026.09.26-b3`, which is also the release title; PR builds never create a release.

## Plugin using HCCore

Clone `HCPlugins-Core` next to the consumer locally:

```text
parent/
├── HCPlugins-Core/
└── HCPlugins-Glowing/
```

In the consumer's `settings.gradle.kts`, include Core's source build. The CI checkout path
takes precedence when it exists; local builds use the sibling clone. The substitution maps
the dependency notation to the `core-api` project, without accessing a Maven repository:

```kotlin
val coreBuild = file(".hcplugins/HCPlugins-Core").takeIf { it.isDirectory }
    ?: file("../HCPlugins-Core")
require(coreBuild.resolve("settings.gradle.kts").isFile) {
    "Clone HCPlugins-Core next to this repository before building."
}

includeBuild(coreBuild) {
    dependencySubstitution {
        substitute(module("fr.noltox.hcplugins:core-api")).using(project(":core-api"))
    }
}
```

In `build.gradle.kts`, add only the compile-time dependency. Gradle builds the included
`core-api` project as needed:

```kotlin
dependencies {
    compileOnly("fr.noltox.hcplugins:core-api")
}
```

The consumer's `paper-plugin.yml` still requires the installed HCCore plugin at runtime:

```yaml
dependencies:
  server:
    HCCore:
      load: BEFORE
      required: true
      join-classpath: true
```

In `.gitignore`, exclude the CI source checkout:

```gitignore
.hcplugins/
```

The consumer workflow opts in to Core source checkout:

```yaml
name: Build

on:
  push:
    branches: [main]
  pull_request:
  workflow_dispatch:

permissions:
  contents: write

jobs:
  build:
    uses: HeavenCube/HCPlugins-actions/.github/workflows/build.yml@main
    with:
      project-name: HCGlowing
      artifact-path: build/libs/HCGlowing-*.jar
      core-source: true
    secrets: inherit
```

The workflow checks out the public `HCPlugins-Core` repository directly. No secret is required,
including for pull requests.

For another public sibling source build, declare its repository in the caller:

```yaml
      source-repositories: HeavenCube/HCPlugins-PlaceholdersExtra
```

The workflow clones its current `main` to `.hcplugins/HCPlugins-PlaceholdersExtra`.
The consumer can then use Gradle `includeBuild` with that path in CI and
`../HCPlugins-PlaceholdersExtra` locally.

Keep `@main` so consumers receive shared workflow updates automatically. For private
consumers, grant `HCPlugins-actions` access under the shared repository's Actions access
settings. If the consumer restricts allowed actions, permit GitHub-owned actions and
`gradle/actions/setup-gradle` at the SHA used by the shared workflow.
