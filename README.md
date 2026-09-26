# HCPlugins-actions

CI/CD partagé pour les repositories `HCPlugins-*` de HeavenCube.

Le but est de garder chaque plugin indépendant tout en centralisant la partie répétitive :
Java 25, Gradle, cache, build, artifacts et publication Maven.

## Architecture

Deux niveaux sont disponibles :

| Niveau | Usage |
|---|---|
| Reusable workflows | Pipeline standard avec quelques lignes dans le repository consommateur |
| Composite actions | Jobs personnalisés qui réutilisent seulement le setup Java/Gradle |

Le dépôt ne contient aucune logique métier de plugin Minecraft.

## Reusable workflow : build

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
      project-name: HCCore
      artifact-path: core-plugin/build/libs/HCCore.jar
    secrets: inherit
```

Entrées principales :

- `project-name` : nom lisible utilisé pour l'artifact.
- `java-version` : `25` par défaut.
- `gradle-task` : `build` par défaut.
- `gradle-arguments` : `--stacktrace` par défaut.
- `artifact-path` : chemin de l'artifact à uploader ; vide = aucun upload.
- `artifact-name` : nom optionnel ; sinon `<project>-<sha>`.
- `retention-days` : 14 par défaut.

## Reusable workflow : publication Maven

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
      gradle-task: ":core-api:publish"
    secrets: inherit
```

Le workflow expose automatiquement `GITHUB_ACTOR` et `GITHUB_TOKEN` au build Gradle.

## Composite action : setup-gradle

Pour un workflow spécifique :

```yaml
steps:
  - uses: actions/checkout@v4

  - uses: HeavenCube/HCPlugins-actions/.github/actions/setup-gradle@main
    with:
      java-version: "25"

  - run: ./gradlew build
```

## Versioning

Pendant le bootstrap des nouveaux repositories, `@main` est utilisé.

Quand l'architecture sera stabilisée, créer une version majeure `v1` et faire pointer tous les
repositories consommateurs vers `@v1`. Les évolutions compatibles restent en v1 ; une rupture
du contrat des workflows doit devenir v2.

## Repository privé

Pour qu'un reusable workflow d'un repository privé soit utilisable par les autres repositories
privés de l'organisation, configurer dans GitHub :

`Settings -> Actions -> General -> Access`

puis autoriser l'accès depuis les repositories de l'organisation HeavenCube.

## Principes

- Permissions GitHub minimales.
- Actions tierces épinglées sur un SHA complet.
- Pas de secrets obligatoires pour un simple build.
- Pas de logique spécifique à un plugin dans ce repository.
- Pas de version Minecraft/Paper imposée ici : chaque plugin reste propriétaire de son Gradle.
- La CI ne remplace pas le Gradle du repository consommateur ; elle l'exécute.
