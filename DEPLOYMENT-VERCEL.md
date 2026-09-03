# Déploiement du frontend sur Vercel

## Correction de `tsc: command not found`

Le dépôt possède deux `package.json`. Celui de la racine ne contient pas les dépendances du frontend : il délègue seulement ses commandes à `frontend`. Une installation npm à la racine n'installe donc ni TypeScript ni Vite dans le frontend.

Le fichier `vercel.json` à la racine corrige cette configuration :

| Réglage | Valeur |
| --- | --- |
| Root Directory, dans les paramètres Vercel | Racine du dépôt (`./`), pas `frontend` |
| Framework Preset | Other |
| Install Command | `npm ci --prefix frontend --include=dev` |
| Build Command | `npm run build` |
| Output Directory | `frontend/dist` |

Les commandes et le dossier de sortie sont définis dans le fichier versionné. `--include=dev` installe les outils de compilation, même si l'environnement omet habituellement les dépendances de développement. Le fichier `frontend/package-lock.json` doit rester versionné.

Pousser `vercel.json` sur la branche utilisée par Vercel, puis relancer le déploiement. Pour le premier essai après correction, ne pas réutiliser le cache de build.

Les réécritures permettent d'ouvrir directement les routes React, par exemple `/lab`, `/passport` ou `/craft/<id>`. Les requêtes `/api/*` ne sont volontairement pas réécrites vers le HTML.

## Relier le backend Spring Boot

Cette configuration déploie le frontend. Elle n'exécute pas le JAR Spring Boot, PostgreSQL, Docker Compose, ni le proxy de développement Vite.

Déployer le backend sur un hébergement Java/Docker et configurer PostgreSQL, les identifiants administrateur, HTTPS et `COOKIE_SECURE=true`. Une fois son URL HTTPS réelle connue, ajouter **avant les autres réécritures** :

```json
{
  "source": "/api/:path*",
  "destination": "https://VOTRE-HOTE-BACKEND/api/:path*"
}
```

Remplacer l'hôte d'exemple par l'URL effective. Ne pas utiliser `localhost` ou `127.0.0.1`, qui ne désignent pas votre ordinateur depuis Vercel.

Le frontend conserve ainsi ses URLs relatives `/api`, y compris pour les sessions, les jetons CSRF et les événements SSE. Le backend ne doit pas fixer un domaine de cookie différent du domaine public du frontend. Vérifier connexion, commandes et reconnexion SSE à travers le proxy avant mise en service. Ne pas mettre en cache les routes d'authentification ou les données client.

Sans cette liaison, les pages publiques peuvent s'afficher mais les comptes, les ingrédients, les commandes et les tableaux de bord ne sont pas opérationnels.

Références : [configuration Vercel](https://vercel.com/docs/project-configuration/vercel-json), [Vite sur Vercel](https://vercel.com/docs/frameworks/frontend/vite), [réécritures](https://vercel.com/docs/routing/rewrites).
