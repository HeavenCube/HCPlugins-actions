# CI utile et coût des runners

## Quand lancer un build ?

Les filtres sont dans le workflow **consommateur**, avant l'appel à HCPlugins-actions@main.
GitHub ne crée pas de run pour un push/une PR dont aucun fichier ne correspond aux chemins.
Un workflow réutilisable ne peut pas imposer ces filtres à ses consommateurs.

| Changement | Exécution automatique |
| --- | --- |
| README, docs/, AGENTS.md, CLAUDE.md, GEMINI.md | Aucune, sans modification d'un chemin construit |
| Licence racine, .github/dependabot.yml, modèles de PR | Aucune |
| Source Java, tests ou ressources sous un dossier src/ | Build Gradle et tests |
| Script Gradle, gradle.properties, wrapper ou catalogue sous gradle/ | Build Gradle et tests |
| Workflow/action locale | Validation par le build concerné |
| Assets du pack, pack.mcmeta ou outils du pack | Validation du pack ; release uniquement sur main |
| PR en brouillon | Aucun runner |
| PR passée « prête pour revue » | Validation si son diff contient un chemin construit |
| Lancement manuel workflow_dispatch | Exécution volontaire, sans filtre de chemins ni marqueur de skip ; pack sur main uniquement |

Les fichiers redistribués sous src/ ou assets/ restent des entrées de build, même s'ils
contiennent du texte : changer une configuration embarquée, une texture ou une notice
tierce incluse dans le pack doit être validé. Ajouter un nouveau dossier de code/configuration
consommé par le build exige de compléter les filtres du caller.

## Marqueurs de commit

**Préférer [skip ci]** dans un commit exclusivement documentaire ou administratif :

~~~text
docs: clarify installation [skip ci]
~~~

GitHub reconnaît ce marqueur nativement pour push/pull_request et ne démarre pas le workflow.
[ci skip], [no ci], [skip actions] et [actions skip] sont aussi reconnus.
Source : [GitHub — skipping workflow runs](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/skip-workflow-runs).

**[ci-skip] est un alias HeavenCube**, pas un marqueur natif GitHub :

~~~text
docs: clarify installation [ci-skip]
~~~

- Push : le workflow partagé lit le message du dernier commit du push.
- PR : placer [ci-skip] dans le **titre de la PR**. Son payload ne contient pas le message
  du commit HEAD ; un [ci-skip] seulement dans ce commit ne suffit pas pour une PR.
- Le run peut apparaître « skipped », mais le job est ignoré avant allocation du runner.
- Un lancement manuel sur main reste possible malgré un marqueur.
- Pour une PR, retirer l'alias du titre puis lancer une nouvelle synchronisation/réouverture ;
  une simple édition du titre n'est pas un déclencheur configuré.

Ne pas utiliser ces marqueurs pour du Java, des tests, des ressources serveur/client,
des dépendances ou une modification effective de build. Un changement « petit » peut
modifier le comportement. Si un push contient plusieurs commits, ne pas ajouter un
marqueur à son dernier commit pour masquer des modifications de code antérieures.

Les filtres de PR évaluent le diff de **toute la PR**. Un commit documentaire ajouté
après un commit de code peut donc encore lancer une validation : employer [skip ci]
dans ce commit documentaire. Les fichiers d'une PR exclusivement documentaire
ne déclenchent pas le workflow.

Si la protection de branche exige un check filtré/ignoré, GitHub peut le laisser pending.
Ne pas imposer un check de build aux PR documentaires sans traiter ce cas dans les règles.
Les filtres GitHub ont aussi des limites de diff : leur comportement n'est pas une garantie
de zéro run pour les pushes exceptionnellement volumineux.

## Travail conservé et travail supprimé

- Sept plugins : un seul job Namespace par validation nécessaire.
- PR : build/tests conservés, aucun upload d'artifact Actions ni release.
- Ancienne exécution d'une même PR annulée dès qu'une nouvelle validation démarre.
- Main : pas d'annulation pendant un build/release ; verrou par dépôt/ref conservé.
- PR : checkout peu profond ; main garde l'historique nécessaire au changelog.
- Pack : validation et publication dans **le même job**, via validation-command.
  Une validation échouée bloque ZIP et release. Une PR ne résout aucun numéro,
  ne crée aucun ZIP de release et ne publie rien.
- Aucun job supplémentaire « déterminer si nécessaire » : décisions par filtres GitHub
  et expressions de job, avant le runner.
- Aucun déclenchement périodique de build, aucun rebuild global après un simple changement
  documentaire du Core ou des Actions. Dependabot peut proposer des mises à jour ; les
  modifications réelles de dépendances/workflows restent validées.

Le JAR de release reste à nom fixe ; sa version interne, le titre AAAA.MM.JJ-bN et
les tags vN ne changent pas. Les artifacts des builds main/manuels restent disponibles.

## Cache et réglages Namespace

Le runner reste namespace-profile-noltox-fr. Setup-gradle conserve son cache de dépendances
et de compilation ; GRADLE_ENCRYPTION_KEY reste facultative pour persister le cache de
configuration. Aucun deuxième cache du même Gradle User Home n'est ajouté.

Namespace propose [des volumes de cache](https://namespace.so/docs/solutions/github-actions/caching).
Leur configuration et le dimensionnement du profil relèvent du compte Namespace : comparer
durée/coût mesurés avant de changer CPU, mémoire, image ou stockage. Les workflows ne
modifient pas ces paramètres et aucune économie chiffrée n'est supposée.

## Modifier et publier les workflows

1. Inspecter le caller et le workflow partagé ; préserver tests, permissions, versioning
   et sérialisation des releases.
2. Vérifier YAML/expressions avec actionlint, en déclarant le label Namespace comme runner
   connu, puis git diff --check.
3. Vérifier les cas : documentation seule, Java/test/YAML/TOML, workflow, pack, PR en
   brouillon/prête, [skip ci], alias, PR concurrente, validation échouée et lancement manuel.
4. Ne pas lancer une CI payante pour vérifier seulement la documentation.
5. Publier HCPlugins-actions **avant** HCPack-CustomAssets lorsque validation-command est
   introduit : le caller @main ne doit pas utiliser un input encore absent du workflow distant.
6. Un changement de runner n'est confirmé qu'après une exécution GitHub sur le profil réel.

Les templates de docs/consumer-template.md portent les mêmes filtres pour les futurs plugins.
