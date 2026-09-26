# HCPlugins-actions

CI/CD partagé pour les repositories `HCPlugins-*` de HeavenCube.

Le but est de garder chaque plugin indépendant tout en centralisant Java 25, Gradle, cache,
artifacts, publication Maven et releases GitHub.

## Build + release automatique

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

Les pull requests et branches non configurées font uniquement un build.

Chaque build réussi de `main` crée automatiquement une nouvelle release :

```text
v1
v2
v3
...
```

Le workflow cherche le plus grand tag de release numérique avec le préfixe configuré et ajoute
exactement `1`. Le numéro obtenu est aussi passé à Gradle avec `-Pversion=<n>`, de sorte que
la version embarquée dans le plugin et la release restent cohérentes.

Exemple :

```text
release v12
plugin version = 12
prochain build main -> v13 / plugin version 13
```

Les builds du même repository et de la même ref sont sérialisés pour éviter que deux builds
calculent simultanément le même numéro.

Entrées utiles :

- `project-name` : nom de l'artifact et de la release.
- `artifact-path` : JAR produit et attaché à la release.
- `create-release` : `true` par défaut.
- `release-branch` : `main` par défaut.
- `release-tag-prefix` : `v` par défaut.
- `release-assets` : permet de remplacer les assets de release ; sinon `artifact-path` est utilisé.
- `publish-gradle-task` : tâche Gradle facultative exécutée avec le même numéro de version avant
  la création de la release.

Pour un projet qui publie aussi une API Maven :

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

La publication Maven est volontairement intégrée au build de release. Une release créée avec le
`GITHUB_TOKEN` ne doit pas être utilisée comme mécanisme pour déclencher un second workflow.

## Publication Maven autonome

`.github/workflows/publish-maven.yml` reste disponible pour les cas qui ont besoin d'une
publication indépendante.

## Composite action

```yaml
steps:
  - uses: actions/checkout@v4
  - uses: HeavenCube/HCPlugins-actions/.github/actions/setup-gradle@main
    with:
      java-version: "25"
  - run: ./gradlew build
```

## Versioning de HCPlugins-actions

Pendant le bootstrap, les consommateurs utilisent `@main`. Une fois le contrat stabilisé,
créer `v1` et faire pointer les repositories vers `@v1`. Une rupture de contrat devient `v2`.

## Principes

- permissions minimales côté repository consommateur ;
- actions tierces épinglées sur SHA ;
- aucun secret requis pour les PR ;
- aucune logique métier Minecraft ici ;
- chaque plugin garde son propre Gradle et ses versions de dépendances.
