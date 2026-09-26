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

After HCPlugins-actions is stable, replace `@main` with `@v1`.
