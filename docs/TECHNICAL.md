# Guide technique — HCPlugins-actions

## Rôle et navigation

[AGENTS.md](../AGENTS.md) contient les règles. [README.md](../README.md) est le contrat public
des inputs, exemples et secrets. [consumer-template.md](consumer-template.md) donne le raccordement.
L'architecture des plugins et la création d'un dépôt sont dans
[Core](https://github.com/HeavenCube/HCPlugins-Core/blob/main/docs/NEW_PLUGIN.md), pas dans une build-logic centralisée.

## Carte des fichiers

| Fichier | Responsabilité |
| --- | --- |
| [.github/workflows/build.yml](../.github/workflows/build.yml) | Workflow réutilisable Java/Gradle, sources composites, artifacts et releases |
| [.github/actions/setup-gradle/action.yml](../.github/actions/setup-gradle/action.yml) | JDK/cache pour jobs personnalisés, clé facultative passée en input |
| [.github/workflows/resource-pack-release.yml](../.github/workflows/resource-pack-release.yml) | ZIP de pack sans Gradle/Java et release numérique |
| [.github/dependabot.yml](../.github/dependabot.yml) | Mise à jour des actions |
| [templates/plugin/LICENSE](../templates/plugin/LICENSE) | Licence à copier pour un nouveau plugin |

Ce dépôt ne possède ni versions Paper, ni dépendances métier, ni layout Gradle des consommateurs.
Les sept dépôts plugin sont Core et ses six consommateurs : Glowing, ItemFrame, JoinMessage,
HuskHomesGUI, PlaceholdersExtra, AdvancementsRedirect. Le pack n'est pas un plugin.

## Build et sources

Checkout du consommateur, clone Core main si `core-source`, puis autres builds publics demandés
par `source-repositories`, JDK (25 par défaut) et setup-gradle. Les sources sont dans `.hcplugins/` ;
le consommateur choisit les substitutions Gradle. Aucune publication Maven ni token de lecture
de sources publiques. Un dépôt source privé demanderait un accès authentifié distinct : ne pas
prétendre que le GITHUB_TOKEN d'un consommateur peut lire tous les autres dépôts privés.

## Version et release

Sur push/workflow_dispatch de la branche configurée, `create-release` alloue max des releases
numériques + 1 selon préfixe. `-Pversion=AAAA.MM.JJ-bN` et `-PbuildDate=AAAA.MM.JJ` (UTC) vont à
Gradle. Build puis artifact, release vN et JAR ; notes de commits depuis release précédente.
PR et autres branches ne publient pas. Concurrency par repository/ref, cancel-in-progress false :
préserver ce verrou et le séquencement. Ne pas introduire un second workflow release:published
pour prolonger implicitement une release générée avec GITHUB_TOKEN.

Les consumers emploient @main : toute modification compatible les affecte dès leur prochaine
exécution. Les actions tierces du workflow sont épinglées au SHA. Contrat d'input cassé : auditer
et coordonner les callers, sans migration implicite vers @v1. Un push documentaire sur main
publie aussi une release avec les callers actuels : aucune exclusion de documentation n'existe.

## Cache et sécurité

Setup-gradle gère déjà cache Gradle ; setup-java n'ajoute pas un deuxième cache. La clé facultative
GRADLE_ENCRYPTION_KEY active la persistance du configuration cache et arrive via secrets: inherit.
La clé doit être accessible au caller. GitHub Free n'autorise pas les secrets d'organisation pour
dépôts privés ; secret local possible. Sans clé/fork/Dependabot, build continue sans cache de
configuration persistant. Chaque nouvelle valeur de version peut invalider ce cache.

Contents write requis pour release ; ne pas réclamer packages write devenu inutile. Ne pas logger
secrets/credentials, ni intégrer une clé en YAML, ni créer des branches/releases juste pour tester
sans autorisation. [Secrets GitHub](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets).

## Validation d'une modification

Vérifier inputs/secrets/outputs, expressions GitHub, YAML et script shell, ainsi que chemins et
permissions des callers affectés. Gradle reste validé par leur build. Une validation YAML locale
n'est pas une exécution GitHub Actions. Une modification documentaire ne nécessite pas de nouvelles
compilations/release manuelles. Vérifier que le ZIP pack contient à sa racine uniquement pack.mcmeta
et assets/ ; les guides et instructions du dépôt ne vont pas dans les assets serveur.
