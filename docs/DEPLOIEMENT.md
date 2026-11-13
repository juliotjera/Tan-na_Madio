# Mise en ligne (Render + Neon)

Un seul service web sur Render (l’API sert aussi l’interface) et une base PostgreSQL + PostGIS sur Neon, comme pour Tantsaha Connect. Comptez une quinzaine de minutes.

## 1. Base de données sur Neon

1. Sur [console.neon.tech](https://console.neon.tech), créez un projet **tanana-madio** (région la plus proche : Frankfurt).
2. Dans **SQL Editor**, lancez :
   ```sql
   CREATE EXTENSION IF NOT EXISTS postgis;
   CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
   ```
3. Dans **Connection details**, copiez l’adresse de connexion (elle commence par `postgresql://` et finit par `?sslmode=require`). Gardez-la pour l’étape 2, sans la partager.

## 2. Service web sur Render

1. Sur [dashboard.render.com](https://dashboard.render.com) : **New → Blueprint**, puis choisissez le dépôt `juliotjera/Tan-na_Madio`. Render lit [`render.yaml`](../render.yaml).
2. Render demande la valeur de **`DATABASE_URL`** : collez l’adresse copiée chez Neon.
3. Validez. Les autres réglages sont déjà dans `render.yaml` :
   - `JWT_SECRET` et `JWT_REFRESH_SECRET` générés par Render ;
   - `PHOTOS_STOCKAGE=base` : photos gardées dans PostgreSQL (le disque gratuit de Render est effacé à chaque redémarrage) ;
   - `SEED_DEMO=true` : au premier démarrage, la base vide reçoit les données de démonstration (comptes, vraies rues d’Antananarivo, signalements avec photos) ;
   - `CORS_ORIGINS=https://tanana-madio.onrender.com`.
4. Le premier déploiement dure quelques minutes (installation, compilation, création du schéma et des données). Vérifiez ensuite `https://tanana-madio.onrender.com/api/sante` : la réponse doit contenir `"statut":"ok"`.

Si Render attribue une autre adresse (nom déjà pris), mettez-la dans `CORS_ORIGINS`.

## 3. Après la mise en ligne

- Chaque envoi sur la branche `main` redéploie le site.
- Comptes de démonstration : voir le [README](../README.md#démarrage-rapide).
- Les notifications push fonctionnent sur la version en ligne (HTTPS) : activez-les dans **Mon compte** depuis un téléphone pour les essayer.
- Le service gratuit s’endort après 15 minutes sans visite : la première ouverture suivante prend environ une minute.
- Pour un usage réel (hors démonstration), retirez `SEED_DEMO` et créez un administrateur avec `npm run admin:create --prefix backend`.
