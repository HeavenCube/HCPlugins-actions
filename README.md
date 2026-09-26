# HCPlugins-actions

CI/CD partagé pour les repositories `HCPlugins-*` de HeavenCube.

Le but est de garder chaque plugin indépendant tout en centralisant Java 25, Gradle, cache,
artifacts et releases GitHub. Les plugins qui utilisent HCCore compilent son petit module
`core-api` directement depuis le dépôt Git Core avec un build composite Gradle.

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
La CI fournit aussi `-PbuildDate=AAAA.MM.JJ` (UTC) à Gradle. Le titre de release et le nom
de l'artifact Actions suivent `<project-name>-AAAA.MM.JJ-bN`. Les notes listent les commits
depuis la release précédente, y compris les commits directs sans pull request.

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
- `core-source` : clone `HCPlugins-Core@main` pour les consommateurs qui compilent contre Core.

Pour un plugin dépendant de HCCore :

```yaml
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

Le workflow clone la branche publique `main` de Core dans `.hcplugins/HCPlugins-Core` avant le
build. Aucun secret n'est nécessaire. En local, les deux dépôts peuvent rester côte à côte. La
configuration Gradle et Paper est détaillée dans le [modèle de consommateur](docs/consumer-template.md).

## Composite action

```yaml
steps:
  - uses: actions/checkout@v4
  - uses: HeavenCube/HCPlugins-actions/.github/actions/setup-gradle@main
    with:
      java-version: "25"
  - run: ./gradlew build
```

## Référence de HCPlugins-actions

Les consommateurs utilisent `@main` pour recevoir automatiquement les corrections des workflows
partagés. Les changements d'inputs et d'outputs doivent rester compatibles avec les consommateurs
existants ; toute rupture nécessite une migration coordonnée des repositories concernés.

Les repositories privés consommateurs doivent être autorisés dans les paramètres d'accès Actions
de `HCPlugins-actions`. Si leur politique Actions limite les actions externes, elle doit autoriser
les actions GitHub (`actions/*`) et `gradle/actions/setup-gradle` à la révision utilisée par le
workflow partagé.

## Principes

- permissions minimales côté repository consommateur ;
- actions tierces épinglées sur SHA ;
- aucun secret requis pour les PR ;
- aucune logique métier Minecraft ici ;
- chaque plugin garde son propre Gradle et ses versions de dépendances.
