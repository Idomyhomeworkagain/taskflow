#!/bin/sh
set -e

echo "[entrypoint] applying migrations..."
npx prisma migrate deploy || echo "[entrypoint] migrate deploy failed — maybe no migrations yet, continuing..."

echo "[entrypoint] seeding (idempotent)..."
node prisma/seed.js || echo "[entrypoint] seed failed, continuing..."

echo "[entrypoint] starting app..."
exec "$@"