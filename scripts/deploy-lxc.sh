#!/usr/bin/env bash
# ==============================================================================
# 🏈 Fantasy Sports Manager - LXC Native Deployment Script (Systemd)
# Compatible with: Debian 12 (Bookworm), Ubuntu 22.04 / 24.04 LTS (Proxmox / LXD)
# ==============================================================================

set -euo pipefail

# Text styling
BOLD='\033[1m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${CYAN}${BOLD}"
echo "=================================================================="
echo "  🏈 Fantasy Sports Manager - Native LXC Deployment Setup        "
echo "  Embedded Kùzu Graph Engine + FastAPI Systemd Daemon             "
echo "=================================================================="
echo -e "${NC}"

# 1. Check Root Privileges
if [ "$(id -u)" -ne 0 ]; then
    echo -e "${RED}[ERROR] This deployment script must be run as root (or via sudo).${NC}"
    exit 1
fi

# 2. Determine Installation Directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

if [ -f "${REPO_ROOT}/requirements.txt" ] && [ -f "${REPO_ROOT}/main.py" ]; then
    INSTALL_DIR="${REPO_ROOT}"
    echo -e "${GREEN}✓ Detected existing repository directory:${NC} ${INSTALL_DIR}"
else
    INSTALL_DIR="/opt/fantasy-sports-manager"
    echo -e "${CYAN}• Target installation directory:${NC} ${INSTALL_DIR}"
    mkdir -p "${INSTALL_DIR}"
fi

# 3. Detect Container Local IP Address
LOCAL_IP=$(ip -4 addr show scope global | grep -oP '(?<=inet\s)\d+(\.\d+){3}' | head -n1 || hostname -I | awk '{print $1}')
if [ -z "${LOCAL_IP}" ]; then
    LOCAL_IP="127.0.0.1"
fi
echo -e "${GREEN}✓ Detected LXC Container IP:${NC} ${LOCAL_IP}"

# 4. Install System Dependencies
echo -e "\n${CYAN}[1/6] Installing system prerequisites (Python 3, build tools, git)...${NC}"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq --no-install-recommends \
    python3 \
    python3-venv \
    python3-pip \
    git \
    build-essential \
    curl \
    ca-certificates

# 5. Create / Update Virtual Environment
echo -e "\n${CYAN}[2/6] Setting up isolated Python virtual environment...${NC}"
VENV_DIR="${INSTALL_DIR}/venv"
if [ ! -d "${VENV_DIR}" ]; then
    python3 -m venv "${VENV_DIR}"
fi

# 6. Install Python Requirements
echo -e "\n${CYAN}[3/6] Installing Python packages (FastAPI, Kùzu Graph DB, Uvicorn)...${NC}"
"${VENV_DIR}/bin/pip" install --upgrade pip setuptools wheel -q
"${VENV_DIR}/bin/pip" install -r "${INSTALL_DIR}/requirements.txt" -q

# 7. Setup Persistent Data Directory
echo -e "\n${CYAN}[4/6] Initializing persistent data directory...${NC}"
mkdir -p "${INSTALL_DIR}/data"
chmod 755 "${INSTALL_DIR}/data"

# 8. Configure .env File
echo -e "\n${CYAN}[5/6] Configuring environment settings (.env)...${NC}"
ENV_FILE="${INSTALL_DIR}/.env"

if [ ! -f "${ENV_FILE}" ]; then
    if [ -f "${INSTALL_DIR}/.env.example" ]; then
        cp "${INSTALL_DIR}/.env.example" "${ENV_FILE}"
    else
        cat <<EOF > "${ENV_FILE}"
PORT=5000
DB_ENGINE=kuzu
KUZU_DB_PATH=${INSTALL_DIR}/data/fantasy_graph.kuzu
YAHOO_CLIENT_ID=
YAHOO_CLIENT_SECRET=
YAHOO_REDIRECT_URI=http://${LOCAL_IP}:5000/api/auth/callback
EOF
    fi
fi

# Update or ensure default configuration
if grep -q "localhost:5000" "${ENV_FILE}"; then
    sed -i "s|http://localhost:5000/api/auth/callback|http://${LOCAL_IP}:5000/api/auth/callback|g" "${ENV_FILE}"
fi

# 9. Create Systemd Service Unit
echo -e "\n${CYAN}[6/6] Registering systemd service (fantasy-manager.service)...${NC}"
SERVICE_FILE="/etc/systemd/system/fantasy-manager.service"

cat <<EOF > "${SERVICE_FILE}"
[Unit]
Description=Fantasy Sports Manager (AI & Graph DB Daemon)
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=${INSTALL_DIR}
EnvironmentFile=${ENV_FILE}
ExecStart=${VENV_DIR}/bin/python main.py
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal
LimitNOFILE=65535

[Install]
WantedBy=multi-user.target
EOF

# Reload and Enable Service
systemctl daemon-reload
systemctl enable fantasy-manager.service
systemctl restart fantasy-manager.service

# 10. Healthcheck Service Verification
echo -e "\n${CYAN}• Verifying daemon startup...${NC}"
for i in {1..10}; do
    if curl -s -f "http://127.0.0.1:5000/" > /dev/null 2>&1; then
        break
    fi
    sleep 1
done

echo -e "\n${GREEN}${BOLD}=================================================================="
echo "  🎉 DEPLOYMENT SUCCESSFUL! Fantasy Sports Manager is Online!   "
echo "==================================================================${NC}"
echo ""
echo -e "  🌐 ${BOLD}Web Dashboard URL:${NC}       ${CYAN}http://${LOCAL_IP}:5000${NC}"
echo -e "  🔑 ${BOLD}Yahoo Redirect URI:${NC}      ${YELLOW}http://${LOCAL_IP}:5000/api/auth/callback${NC}"
echo -e "  📁 ${BOLD}Install Directory:${NC}       ${INSTALL_DIR}"
echo -e "  💾 ${BOLD}Graph Database Path:${NC}     ${INSTALL_DIR}/data/fantasy_graph.kuzu"
echo ""
echo -e "${BOLD}Helpful Management Commands:${NC}"
echo -e "  • Check service status:   ${CYAN}systemctl status fantasy-manager${NC}"
echo -e "  • Follow live logs:       ${CYAN}journalctl -u fantasy-manager -f${NC}"
echo -e "  • Restart application:    ${CYAN}systemctl restart fantasy-manager${NC}"
echo -e "  • Stop application:       ${CYAN}systemctl stop fantasy-manager${NC}"
echo -e "  • Edit environment:       ${CYAN}nano ${ENV_FILE}${NC}"
echo ""
echo -e "${YELLOW}👉 Next Step: Open http://${LOCAL_IP}:5000 in your browser and visit the Setup tab!${NC}"
echo ""
