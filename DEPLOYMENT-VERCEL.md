# Déploiement complet : Vercel + Render + PostgreSQL

Vercel sert l'application React. L'API Spring Boot et PostgreSQL sont créés par le Blueprint `render.yaml`. Cette séparation est nécessaire : une build Vercel ne peut pas exécuter durablement Spring Boot, PostgreSQL ou les sessions de l'application.

## 1. Créer l'API et la base de données sur Render

1. Sur [Render](https://dashboard.render.com/), choisir **New +** puis **Blueprint** et sélectionner le dépôt GitHub `Coffee-Shop`.
2. Render détecte `render.yaml` et affiche `velora-api` ainsi que `velora-db`. Vérifier le prix affiché, puis appliquer le Blueprint.
3. Pour `ADMIN_EMAIL`, saisir l'adresse qui doit recevoir le rôle administrateur. `ADMIN_PASSWORD` est généré par Render : le conserver dans le gestionnaire de secrets.
4. Attendre que le service soit actif, puis ouvrir `https://VOTRE-SERVICE.onrender.com/api/health`. La réponse doit être `{"status":"ok"}`.

Le service utilise automatiquement le port attribué par Render, les identifiants PostgreSQL du Blueprint et des cookies sécurisés. Ne renseigner aucune valeur de base de données dans Vercel.

## 2. Connecter Vercel à l'API

Dans le projet Vercel, aller dans **Settings → Environment Variables**, créer la variable suivante pour **Production**, **Preview** et **Development** :

| Nom | Valeur |
| --- | --- |
| `BACKEND_URL` | l'origine HTTPS Render, par exemple `https://velora-api.onrender.com` |

La valeur doit être uniquement l'origine HTTPS : sans `/api`, chemin, identifiants, paramètre ou `localhost`.

Le fichier `vercel.mjs` refuse volontairement une build sans cette variable afin qu'un site public ne puisse plus afficher une interface fonctionnelle avec une API absente. Il installe TypeScript et Vite dans `frontend`, construit `frontend/dist`, route `/api/*` vers Render et conserve les routes React (`/lab`, `/passport`, `/staff`, etc.). Les réponses API ne sont pas mises en cache.

Lancer ensuite **Redeploy** dans Vercel en désactivant le cache une fois. Il n'est pas nécessaire de renseigner manuellement les commandes de build dans le tableau de bord : elles sont versionnées dans `vercel.mjs`.

## 3. Vérifier la mise en ligne

Ouvrir le domaine Vercel, puis vérifier :

1. La page Coffee Lab charge les ingrédients.
2. La connexion administrateur fonctionne.
3. Une création de boisson et le suivi de commande fonctionnent.

Le navigateur reste toujours sur le domaine Vercel pour `/api`, ce qui conserve correctement les cookies de session, les jetons CSRF et les événements en temps réel. Si Render est indisponible, l'interface indique désormais clairement que le service API est indisponible ou non connecté.

Références : [Blueprints Render](https://render.com/docs/blueprint-spec), [configuration Vercel](https://vercel.com/docs/project-configuration/vercel-json), [réécritures Vercel](https://vercel.com/docs/routing/rewrites).
