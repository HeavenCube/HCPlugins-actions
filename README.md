# HCPlugins-actions

**CI :** sources/ressources/build seulement ; docs seules sans runner. Pour les exceptions,
voir [la politique CI et les marqueurs de skip](https://github.com/HeavenCube/HCPlugins-actions/blob/main/docs/CI_COSTS.md).

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
    paths:
      - '**/src/**'
      - '**/*.gradle'
      - '**/*.gradle.kts'
      - '**/gradle.properties'
      - 'gradle/**'
      - 'gradlew'
      - 'gradlew.bat'
      - '.github/workflows/**'
      - '.github/actions/**'
  pull_request:
    types: [opened, synchronize, reopened, ready_for_review]
    paths:
      - '**/src/**'
      - '**/*.gradle'
      - '**/*.gradle.kts'
      - '**/gradle.properties'
      - 'gradle/**'
      - 'gradlew'
      - 'gradlew.bat'
      - '.github/workflows/**'
      - '.github/actions/**'
  workflow_dispatch:

permissions:
  contents: write

jobs:
  build:
    uses: HeavenCube/HCPlugins-actions/.github/workflows/build.yml@main
    with:
      project-name: HCExample
      artifact-path: build/libs/HCExample-*.jar
      core-source: true
    secrets: inherit
```

Les pull requests autorisées et branches non configurées font uniquement un build.
Les PR de forks utilisant Core privé sont ignorées avant allocation du runner ; leur validation
nécessite une revue par un mainteneur dans un contexte autorisé.

Le cache Gradle des dépendances et des sorties de compilation fonctionne sans secret. Pour
sauvegarder aussi le cache de configuration entre les exécutions, définir une seule fois le secret
d'organisation `GRADLE_ENCRYPTION_KEY` avec accès aux repositories des plugins, puis conserver
`secrets: inherit` dans leurs workflows. Sa valeur est une clé AES encodée en base64, générable
avec `openssl rand -base64 16`. Ce secret est facultatif : les builds continuent de fonctionner
sans lui. Il doit être accessible aux
repositories qui appellent le workflow. Le workflow manuel de vérification décrit ci-dessous
nécessite aussi cet accès dans `HCPlugins-actions`.

L'action composite `setup-gradle` gère les deux répertoires sans chevauchement :

- `gradle/actions/setup-gradle` sauvegarde le Gradle User Home. Les jobs publics compilant Core privé
  utilisent une liste limitée aux dépendances téléchargées et distributions du wrapper ; les sorties
  de compilation et scripts compilés sont exclus des caches non chiffrés.
- `actions/cache` sauvegarde `.gradle/configuration-cache`, chiffré par Gradle avec la clé fournie.
  Pour les jobs publics utilisant Core privé, il conserve aussi une archive chiffrée et authentifiée
  des scripts Gradle et transformations nécessaires à la réutilisation de cette configuration.
  L'action `gradle-state-cache` utilise la même clé AES, sans dépendance supplémentaire ; les sorties
  Java du build cache restent exclues. Aucun répertoire n'est sauvegardé par les deux mécanismes.
  Cette persistance est activée pour les wrappers Gradle stables **9.8 ou plus récents**.
  Sa clé de cache distingue OS, architecture, JDK, politique de confidentialité, fichiers Gradle des builds composites et commit.
  Un commit différent peut restaurer un cache compatible ; Gradle revalide ses propres entrées.

Ne pas ajouter `setup-java cache: gradle` ou un autre cache du Gradle User Home. Lors d'une
rotation de la clé AES, supprimer les caches `hcplugins-configuration-v2-*` avant le prochain build
(ainsi que les anciens `v1` encore présents).

Comme chaque release reçoit une nouvelle valeur `-Pversion`, Gradle recalcule sa configuration
pour ces builds ; la clé profite surtout aux exécutions répétées avec les mêmes paramètres.

Pour vérifier la persistance entre deux runners, lancer manuellement
`Verify Gradle Configuration Cache` dans les Actions de ce dépôt : d'abord avec `expect-reuse=false`,
puis, sans changer les sources, avec `expect-reuse=true`. Par défaut, ce workflow compile TranslationKey avec
Core et PlaceholdersExtra via leurs builds composites. `all-plugins=true` vérifie Core et ses sept
consommateurs, avec au plus deux jobs simultanés. Il exécute les tests et exige au second passage
`Reusing configuration cache.`. Il ne publie aucun artifact ni release et n'a aucun déclencheur automatique.

Chaque build réussi de `main` crée automatiquement une nouvelle release :

```text
v1
v2
v3
...
```

Le workflow cherche le plus grand tag de release numérique avec le préfixe configuré et ajoute
exactement `1`. Gradle reçoit `-Pversion=AAAA.MM.JJ-bN` : cette version est embarquée
dans le plugin et figure dans le nom du JAR.
La CI fournit aussi `-PbuildDate=AAAA.MM.JJ` (UTC) à Gradle. Le titre de release est
`AAAA.MM.JJ-bN` ; le nom de l'artifact Actions suit `<project-name>-AAAA.MM.JJ-bN`.
Les notes listent les commits depuis la release précédente, y compris les commits directs
sans pull request.

Exemple :

```text
release v12
plugin version = 2026.09.26-b12
prochain build main -> v13 / plugin version 2026.09.26-b13
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

Le workflow clone la branche `main` de Core privé dans `.hcplugins/HCPlugins-Core` avant le build.
Définir `HCPLUGINS_CORE_READ_TOKEN` avec `Contents: read` sur ce seul dépôt, accessible aux sept
consommateurs et à HCPlugins-actions. Le fournir également comme secret Dependabot pour ses PR ;
`secrets: inherit` reste inchangé. Une clé absente produit une erreur explicite avant le checkout.
En local, les clones restent côte à côte, avec un compte GitHub autorisé à lire Core.
La configuration Gradle et Paper est détaillée dans le [modèle de consommateur](docs/consumer-template.md).

Sur GitHub Free, Core privé doit posséder son propre secret de dépôt `GRADLE_ENCRYPTION_KEY`,
les secrets d'organisation n'étant pas disponibles pour les dépôts privés. Ses releases et le lien
`releases/latest/download/HCCore.jar` nécessitent désormais une authentification.

Lors du passage en privé, purger les anciens caches Gradle des consommateurs publics et du workflow
de vérification : changer la politique de sauvegarde ne supprime pas les anciennes classes déjà
publiées dans ces caches. Aucun JAR serveur Core ne doit être attaché à une release publique.

## Composite action

```yaml
steps:
  - uses: actions/checkout@v4
  - uses: HeavenCube/HCPlugins-actions/.github/actions/setup-gradle@main
    with:
      java-version: "25"
      cache-encryption-key: ${{ secrets.GRADLE_ENCRYPTION_KEY }}
      protect-private-source: "true" # Pour un job public compilant des sources privées.
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

## Release automatique d'un resource pack

Un pack sans Gradle peut utiliser `.github/workflows/resource-pack-release.yml@main` :

```yaml
name: Release resource pack

on:
  push:
    branches: [main]
    paths:
      - 'assets/**'
      - 'pack.mcmeta'
      - 'tools/**'
      - '.github/workflows/**'
  pull_request:
    types: [opened, synchronize, reopened, ready_for_review]
    paths:
      - 'assets/**'
      - 'pack.mcmeta'
      - 'tools/**'
      - '.github/workflows/**'
  workflow_dispatch:

permissions:
  contents: write

jobs:
  release:
    uses: HeavenCube/HCPlugins-actions/.github/workflows/resource-pack-release.yml@main
    with:
      pack-name: HCPack-CustomAssets
      validation-command: python3 tools/validate_pack.py
```

Ce workflow vérifie `pack.mcmeta`, crée un ZIP dont la racine contient seulement
`pack.mcmeta` et `assets/`, puis publie une release `vN` avec le titre
`AAAA.MM.JJ-bN` et les commits depuis la release précédente. Les exécutions
sur une même branche sont sérialisées. Il ne nécessite ni Gradle ni Java.
La commande facultative `validation-command` appartient au consommateur ; la supprimer
si celui-ci ne possède pas cet outil. Avec cette commande, une PR prête lance uniquement
la validation, dans le même job qui valide puis publie sur main.

## Éviter les exécutions inutiles

Les filtres `paths` doivent être définis dans **chaque caller**, comme dans les exemples :
les workflows réutilisables ne peuvent pas filtrer les fichiers à sa place. La documentation,
les instructions IA et Dependabot seul ne déclenchent plus de compilation automatique.

- PR en brouillon : aucun runner ; prête pour revue : build/tests sans artifact uploadé.
- Anciennes validations d'une même PR annulables ; main conserve le verrou de release sans annulation.
- Pack : validation et release dans un seul job GitHub Actions, sans second checkout/runner.
- `workflow_dispatch` conserve la possibilité de reconstruire volontairement.
- Commit docs seul : préférer `docs: clarify installation [skip ci]`, reconnu nativement par GitHub.
- Alias `[ci-skip]` : dernier commit d'un push ou titre d'une PR ; évalué avant allocation du runner.

La [politique CI](docs/CI_COSTS.md) précise les limites (diff global de PR, checks obligatoires),
les règles pour les IA et les validations. Aucun test métier n'est retiré pour économiser du temps.

## Principes

Pour la maintenance IA : [AGENTS.md](AGENTS.md) et [guide technique](docs/TECHNICAL.md).
Pour un nouveau plugin : [guide Core](https://github.com/HeavenCube/HCPlugins-Core/blob/main/docs/NEW_PLUGIN.md).

- permissions minimales côté repository consommateur ;
- actions tierces épinglées sur SHA ;
- PR externes utilisant Core privé validées par un mainteneur après revue ;
- aucune logique métier Minecraft ici ;
- chaque plugin garde son propre Gradle et ses versions de dépendances.
