#!/bin/bash
# Script de deploy/atualização do backend
# Execute em /opt/educaplay após atualizar o código

set -e

echo "=== Instalando dependências ==="
npm install --production

echo "=== Aplicando schema do banco ==="
npx prisma@5.22.0 db push

echo "=== Reiniciando com PM2 ==="
pm2 startOrRestart ecosystem.config.js --env production
pm2 save

echo "=== Deploy concluído ==="
pm2 status
