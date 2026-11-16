# Déploiement — save.emilienbourdet.fr

Serveur : Docker, nginx + certbot dans leurs propres conteneurs.
Save = 3 services (`docker-compose.prod.yml`) : `save-db` (Postgres 17), `save-migrate` (applique les migrations puis s'arrête), `save-app` (Next.js, joint au réseau de nginx, jamais publié sur un port de l'hôte).

## 1. DNS
Enregistrement `A` (ou `CNAME`) `save.emilienbourdet.fr` → IP du serveur.

## 2. Sur le Mac : export de la base locale
```bash
npm run db:up
docker compose exec -T db pg_dump -U save -d save -Fc > save.dump
```
Puis copier sur le serveur le zip du projet et `save.dump`.

## 3. Sur le serveur : configuration
```bash
unzip save-deploy.zip -d ~/ && cd ~/save
cp .env.production.example .env   # contient COMPOSE_FILE=docker-compose.prod.yml
docker network ls            # repérer le réseau du conteneur nginx → PROXY_NETWORK
openssl rand -hex 24         # → POSTGRES_PASSWORD
nano .env                    # + AUTH_PASSWORD_HASH / AUTH_SECRET (npm run auth:hash sur le Mac)
```

## 4. Restauration de la base, puis démarrage
L'ordre compte : restaurer **avant** le premier `up` complet (sinon les migrations créent des tables vides).
```bash
docker compose up -d save-db
docker compose exec -T save-db pg_restore -U save -d save --no-owner < ../save.dump
docker compose up -d --build
docker compose logs save-migrate   # « No pending migrations to apply »
```

## 5. nginx + certificat
1. Copier `deploy/nginx/save.emilienbourdet.fr.http-only.conf` dans le dossier de conf de nginx, recharger :
   `docker exec <nginx> nginx -t && docker exec <nginx> nginx -s reload`
2. Certificat (adapter à ta commande certbot habituelle), ex. :
   `docker compose run --rm certbot certonly --webroot -w /var/www/certbot -d save.emilienbourdet.fr`
3. Remplacer par `deploy/nginx/save.emilienbourdet.fr.conf`, puis `nginx -t` + reload.

Les chemins `/var/www/certbot` et `/etc/letsencrypt` doivent être ceux montés dans tes conteneurs nginx/certbot (cf. tes autres vhosts).

## Mise à jour
Nouveau zip → remplacer les fichiers (garder `.env`), puis :
```bash
docker compose up -d --build
```
Les nouvelles migrations s'appliquent automatiquement (`save-migrate`).

## Sauvegardes
`deploy/backup.sh` → `backups/save-AAAA-MM-JJ.dump` (30 jours). Cron :
```
0 3 * * * cd /chemin/vers/save && ./deploy/backup.sh >> backups/backup.log 2>&1
```
Restaurer : `pg_restore -U save -d save --clean --if-exists --no-owner < backups/save-….dump` (via `exec -T save-db`).
