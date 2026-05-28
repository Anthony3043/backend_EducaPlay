#!/bin/bash
# Script de configuração da VM Oracle Cloud (Ubuntu 22.04 ARM)
# Execute com: sudo bash setup.sh

set -e

echo "=== Atualizando pacotes ==="
apt-get update && apt-get upgrade -y

echo "=== Instalando Node.js 20 ==="
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

echo "=== Instalando PostgreSQL 15 ==="
apt-get install -y postgresql postgresql-contrib

echo "=== Configurando PostgreSQL ==="
sudo -u postgres psql -c "CREATE USER educaplay WITH PASSWORD 'TROQUE_ESTA_SENHA';"
sudo -u postgres psql -c "CREATE DATABASE educaplay_db OWNER educaplay;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE educaplay_db TO educaplay;"

echo "=== Instalando PM2 e Nginx ==="
npm install -g pm2
apt-get install -y nginx

echo "=== Configurando firewall ==="
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw allow 3000
ufw --force enable

echo "=== Criando diretório da aplicação ==="
mkdir -p /opt/educaplay
chown ubuntu:ubuntu /opt/educaplay

echo ""
echo "=== SETUP CONCLUÍDO ==="
echo "Próximo passo: copie o projeto para /opt/educaplay e execute deploy.sh"
