# Déploiement autonome sur Vercel

Le frontend et l'API sont déployés dans le même projet Vercel. La fonction serverless [api/[...path].js](api/[...path].js) reçoit les requêtes `/api/*`; aucune variable `BACKEND_URL` et aucun service Render ne sont nécessaires.

## Réglages Vercel

Dans **Settings → General → Root Directory**, laisser la racine du dépôt (`.`) : ne pas choisir `frontend`. La fonction est dans `api/[...path].js` à la racine ; si `frontend` est défini comme répertoire racine, Vercel publie le site mais n'embarque pas l'API.

Dans **Settings → Environment Variables**, créer `SESSION_SECRET` pour **Production**, **Preview** et **Development**. Utiliser une valeur aléatoire longue, par exemple la sortie de `openssl rand -base64 32`. Ne jamais la placer dans Git.

Le fichier `vercel.json` contient déjà les commandes de build correctes : il installe les dépendances du frontend, dont TypeScript, puis publie `frontend/dist`. Ne pas définir de commandes différentes dans le tableau de bord.

Pousser les fichiers sur `main`, puis choisir **Redeploy**. L'URL suivante doit répondre après le déploiement :

```
https://VOTRE-PROJET.vercel.app/api/health
```

Elle renvoie `{ "status": "up", "runtime": "vercel-serverless" }`. Les ingrédients, recommandations, création de compte, connexion et sauvegarde de recettes passent tous par cette API Vercel.

## Persistance

Les fonctions Vercel sont sans état entre les démarrages. Cette version conserve donc les comptes et recettes en mémoire pendant l'instance active, ce qui convient à une démonstration déployée. Les commandes, tableaux de bord et données administratives du serveur Spring Boot exigent une base durable ; ils ne peuvent pas être rendus fiables sur Vercel sans connecter un stockage persistant (par exemple Vercel Postgres ou un autre PostgreSQL).

Références : [fonctions Vercel](https://vercel.com/docs/functions), [configuration Vercel](https://vercel.com/docs/project-configuration/vercel-json).
