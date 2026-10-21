#!/usr/bin/env bash
# Runs on the server, as the deploy user, after the workflow has copied the new code into place.
# Installs what the code needs, restarts the service, and checks that the API answers.
# There is no database, so there is nothing to migrate.
set -euo pipefail
cd /var/www/kuccps-api

venv/bin/pip install --quiet -r requirements.txt

sudo systemctl restart kuccps-api
sleep 2
systemctl is-active --quiet kuccps-api && echo "kuccps-api is running"

# The API must answer, and the catalogue (catalogue/data/degrees.json) must have arrived with the code.
curl -fsS --max-time 10 http://127.0.0.1:8013/api/meta/ -H 'Host: kuccps.epicbizintel.com' -H 'X-Forwarded-Proto: https' > /dev/null \
  && echo "the API answers on 127.0.0.1:8013"
