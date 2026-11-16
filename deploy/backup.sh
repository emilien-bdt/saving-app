#!/bin/sh
# Sauvegarde quotidienne de la base (à lancer depuis le dossier du projet sur le serveur).
# cron : 0 3 * * * cd /chemin/vers/save && ./deploy/backup.sh >> backups/backup.log 2>&1
set -eu
mkdir -p backups
docker compose -f docker-compose.prod.yml exec -T save-db \
  pg_dump -U save -d save -Fc > "backups/save-$(date +%F).dump"
# Garde 30 jours
find backups -name 'save-*.dump' -mtime +30 -delete
