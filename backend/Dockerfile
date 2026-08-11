# Production image (§8 deploy prep). Not referenced by backend/docker-compose.yml
# (that one is local-dev Postgres+Redis only) — built and run via
# ../docker-compose.prod.yml. See ../DEPLOY.md for the actual deploy steps;
# this file is prepared, not executed, as part of this task.
FROM python:3.12-slim-bookworm

# Python 3.12 pinned deliberately over whatever's on the dev machine — needs
# to be a version every pinned dependency (psycopg2-binary, Pillow,
# Playwright) has prebuilt wheels for, not the newest available interpreter.
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    DJANGO_SETTINGS_MODULE=config.settings_production

WORKDIR /app

# libpq5 — psycopg2-binary's runtime dependency (the wheel bundles its own
# libpq, but the *client* still needs libpq5's shared libs on some bases).
# curl — used by the Compose healthcheck below, and handy for debugging.
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install -r requirements.txt

# Playwright's own installer pulls in the exact Chromium build the pinned
# `playwright` package expects plus every apt package it needs to run
# headless — the documents app (PDF generation) is a hard dependency on
# this, not optional tooling.
RUN playwright install --with-deps chromium

COPY . .

# Runs as a non-root user — collectstatic/migrate happen at container start
# (see docker-compose.prod.yml's command), not at build time, since they
# need the real database/env to be available.
RUN useradd --create-home --uid 1000 vybe && chown -R vybe:vybe /app
USER vybe

EXPOSE 8000

CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "3", "--timeout", "60"]
