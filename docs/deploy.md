# Deploying KUCCPS

The app runs at **https://kuccps.epicbizintel.com** on the same VPS as `gnc`, `jobs` and the other projects, in the same way as `jobs`: nginx serves the built web app and passes `/api/` to a gunicorn service on a local port. There is **no database**: the API stores nothing, the degree catalogue is a JSON file shipped with the code, and the KMTC and TVET data is part of the code.

## How a change goes live

Every push to `main` is tested on GitHub (`.github/workflows/`). If the tests pass:

- **Back end** (`backend.yml`, when anything in `backend/` changes): the code is copied to `/var/www/kuccps-api/` with `rsync` (tests and the dev-only requirements are left behind), then `backend/deploy/release.sh` installs `requirements.txt`, restarts the service and checks that the API answers on `127.0.0.1:8013`.
- **Front end** (`frontend.yml`, when anything in `frontend/` changes): the site is built on GitHub and copied to `/var/www/kuccps/dist/`. Nothing is built on the server. The site calls `/api` on its own address, so no API address is compiled in.

The server holds no GitHub token. GitHub holds four secrets that let it log in to the server as the `deploy` user: `DEPLOY_KEY`, `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_KNOWN_HOSTS`.

## What is on the server

| Thing | Where |
|---|---|
| Back end code and its Python environment | `/var/www/kuccps-api/` (owned by `deploy`) |
| Built web app | `/var/www/kuccps/dist/` |
| Secrets file (`SECRET_KEY`, `ALLOWED_HOSTS`), mode 600 | `/etc/kuccps-api.env` |
| Service (gunicorn, 3 workers, `127.0.0.1:8013`) | `/etc/systemd/system/kuccps-api.service` (copy in `backend/deploy/`) |
| Permission for `deploy` to restart only that service | `/etc/sudoers.d/kuccps-api` |
| nginx site | `/etc/nginx/sites-available/kuccps` (copy in `backend/deploy/nginx-kuccps.conf`; certbot added the HTTPS part) |
| HTTPS certificate | `/etc/letsencrypt/live/kuccps.epicbizintel.com/`, **expires 2027-01-19**, renews itself |

The port (8013) and the name were checked free on 2026-10-21. The secrets file holds only two values; anything else the app reads from the environment is optional (`DEBUG` must stay unset on the server).

## Set-up log (2026-10-21)

Run by the owner on the VPS, one command at a time:

1. DNS: `A` record, name `kuccps`, value `145.79.7.171`, **DNS only** (no Cloudflare proxy, which breaks certificate renewal). Checked with `nslookup`.
2. A new deploy key pair, authorised for `deploy` with `restrict`, tested (`ok`), its private half stored as the GitHub secret `DEPLOY_KEY`, then the key files `shred`-ed. The other three secrets added. (A key per repository, so one can be revoked without touching the others. The `gnc` key could not be reused: its private half is only in GitHub, which does not show secrets back.)
3. Folders `/var/www/kuccps-api` and `/var/www/kuccps/dist`, owned by `deploy`; Python 3.12.3 environment in `/var/www/kuccps-api/venv`.
4. `/etc/kuccps-api.env` with a generated `SECRET_KEY` (never shown or typed) and `ALLOWED_HOSTS=kuccps.epicbizintel.com`.
5. The service file, `systemctl daemon-reload` and `enable` (not started: the code was not there yet).
6. `/etc/sudoers.d/kuccps-api`, checked with `visudo -c`.
7. The nginx site, `nginx -t`, reload, then `certbot --nginx -d kuccps.epicbizintel.com` (issued; HTTP redirects to HTTPS).

## Checking it

From any computer:

```
curl -s https://kuccps.epicbizintel.com/api/meta/ | head -c 200
```

should print JSON starting `{"subjects":[`. On the server:

```
systemctl status kuccps-api --no-pager | head -8
journalctl -u kuccps-api -n 30 --no-pager
```

## Limits and things to know

- **Rate limit:** 60 requests a minute per visitor, counted by the address nginx records (`NUM_PROXIES = 1`). The count is kept per gunicorn worker, so the real allowance is a little higher. A class analysis is one request.
- **Updating the data:** the degree catalogue is rebuilt on a laptop (`manage.py build_catalogue`) and committed; the KMTC and TVET data is edited in `backend/catalogue/colleges_data.py` and `colleges_tvet.py`. Either goes live by pushing.
- **Rolling back:** revert the commit on `main` and push; the workflows redeploy the earlier code. There is no database, so nothing else needs undoing.
- **A new key:** if the deploy key is ever lost or leaked, make a new pair as in step 2, replace `DEPLOY_KEY`, and remove the old line from `/home/deploy/.ssh/authorized_keys` (the line ending `kuccps-deploy`).
- **Not set up:** monitoring or alerts, log rotation beyond the system's own, and a staging copy.
