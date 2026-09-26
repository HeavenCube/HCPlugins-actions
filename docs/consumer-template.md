# Consumer template

Minimal build workflow for a standard HCPlugins repository:

```yaml
name: Build

on:
  push:
    branches: [main]
  pull_request:
  workflow_dispatch:

permissions:
  contents: read

jobs:
  build:
    uses: HeavenCube/HCPlugins-actions/.github/workflows/build.yml@main
    with:
      project-name: HCExample
      artifact-path: build/libs/HCExample.jar
    secrets: inherit
```

For repositories that publish a Maven API:

```yaml
name: Publish API

on:
  release:
    types: [published]
  workflow_dispatch:

permissions:
  contents: read
  packages: write

jobs:
  publish:
    uses: HeavenCube/HCPlugins-actions/.github/workflows/publish-maven.yml@main
    with:
      gradle-task: publish
    secrets: inherit
```

After the shared repository is considered stable, replace `@main` with `@v1`.
