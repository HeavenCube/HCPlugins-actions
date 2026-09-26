# Consumer template

Standard HCPlugins repository:

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
      artifact-path: build/libs/HCExample.jar
    secrets: inherit
```

A successful `main` build creates `v1`, then `v2`, etc. PR builds never create a release.

Repository with a Maven API:

```yaml
permissions:
  contents: write
  packages: write

jobs:
  build:
    uses: HeavenCube/HCPlugins-actions/.github/workflows/build.yml@main
    with:
      project-name: HCCore
      artifact-path: core-plugin/build/libs/HCCore.jar
      publish-gradle-task: ":core-api:publish"
    secrets: inherit
```

Keep `@main` so consumers receive shared workflow updates automatically.

For private consumers, grant `HCPlugins-actions` access under the shared repository's
Actions access settings. If the consumer restricts allowed actions, permit GitHub-owned
actions and `gradle/actions/setup-gradle` at the SHA used by the shared workflow.
