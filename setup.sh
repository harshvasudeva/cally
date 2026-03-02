#!/usr/bin/env bash
set -euo pipefail

# ============================================================================
# Cally — One-Command Self-Hosted Deployment Script
# Supports: Ubuntu 20.04+, Debian 11+, RHEL/CentOS 8+, Fedora 36+
# Usage: curl -sSL https://raw.githubusercontent.com/yourrepo/cally/main/setup.sh | bash
#   or:  bash setup.sh
# ============================================================================

CALLY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CALLY_USER="${SUDO_USER:-$(whoami)}"
NODE_VERSION="20"
CALLY_PORT=3000
ENV_FILE="$CALLY_DIR/.env"
SSL_DIR="$CALLY_DIR/ssl"
BACKUP_DIR="$CALLY_DIR/backups"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

print_banner() {
    echo -e "${CYAN}"
    echo "  ╔═══════════════════════════════════════════════╗"
    echo "  ║             🗓️  Cally Setup Script             ║"
    echo "  ║     Self-Hosted Calendar & Scheduling         ║"
    echo "  ╚═══════════════════════════════════════════════╝"
    echo -e "${NC}"
}

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_step() { echo -e "\n${BLUE}${BOLD}▸ $1${NC}"; }

# ============================================================================
# 1. Detect OS
# ============================================================================
detect_os() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS_ID="$ID"
        OS_VERSION="$VERSION_ID"
    elif [ -f /etc/redhat-release ]; then
        OS_ID="rhel"
        OS_VERSION=$(cat /etc/redhat-release | grep -oP '\d+' | head -1)
    else
        log_error "Unsupported operating system."
        exit 1
    fi
    log_info "Detected OS: $OS_ID $OS_VERSION"
}

# ============================================================================
# 2. Install Node.js (via NodeSource)
# ============================================================================
install_node() {
    if command -v node &>/dev/null; then
        local current_version=$(node -v | grep -oP '\d+' | head -1)
        if [ "$current_version" -ge "$NODE_VERSION" ]; then
            log_info "Node.js v$(node -v) already installed, skipping."
            return
        fi
    fi

    log_step "Installing Node.js $NODE_VERSION LTS..."

    case "$OS_ID" in
        ubuntu|debian)
            curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | sudo -E bash -
            sudo apt-get install -y nodejs
            ;;
        rhel|centos|fedora|rocky|almalinux)
            curl -fsSL https://rpm.nodesource.com/setup_${NODE_VERSION}.x | sudo -E bash -
            sudo yum install -y nodejs || sudo dnf install -y nodejs
            ;;
        *)
            log_error "Cannot auto-install Node.js on $OS_ID. Please install Node.js $NODE_VERSION+ manually."
            exit 1
            ;;
    esac

    log_info "Node.js $(node -v) installed successfully."
}

# ============================================================================
# 3. Install system dependencies
# ============================================================================
install_deps() {
    log_step "Installing system dependencies..."

    case "$OS_ID" in
        ubuntu|debian)
            sudo apt-get update -qq
            sudo apt-get install -y curl git build-essential openssl
            ;;
        rhel|centos|fedora|rocky|almalinux)
            sudo yum install -y curl git gcc-c++ make openssl || sudo dnf install -y curl git gcc-c++ make openssl
            ;;
    esac
}

# ============================================================================
# 4. Install Caddy (reverse proxy with auto-SSL)
# ============================================================================
install_caddy() {
    if command -v caddy &>/dev/null; then
        log_info "Caddy already installed, skipping."
        return
    fi

    log_step "Installing Caddy web server..."

    case "$OS_ID" in
        ubuntu|debian)
            sudo apt-get install -y debian-keyring debian-archive-keyring apt-transport-https
            curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg 2>/dev/null || true
            curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list > /dev/null
            sudo apt-get update -qq
            sudo apt-get install -y caddy
            ;;
        rhel|centos|fedora|rocky|almalinux)
            sudo dnf install -y 'dnf-command(copr)' 2>/dev/null || true
            sudo dnf copr enable @caddy/caddy -y 2>/dev/null || true
            sudo dnf install -y caddy || sudo yum install -y caddy
            ;;
    esac

    log_info "Caddy installed successfully."
}

# ============================================================================
# 5. Generate secrets
# ============================================================================
generate_secret() {
    openssl rand -base64 32 | tr -d '/+=' | head -c 44
}

# ============================================================================
# 6. Interactive FQDN setup
# ============================================================================
ask_fqdn() {
    echo ""
    echo -e "${CYAN}${BOLD}Domain Configuration${NC}"
    echo -e "Enter your Fully Qualified Domain Name (e.g., cal.example.com)"
    echo -e "Leave blank to use localhost (you can set this later from Admin Settings)"
    echo ""
    read -rp "FQDN [localhost]: " FQDN
    FQDN="${FQDN:-localhost}"

    if [ "$FQDN" = "localhost" ]; then
        SITE_URL="http://localhost:$CALLY_PORT"
        USE_SSL=false
        log_info "Running on localhost — no SSL configured."
    else
        SITE_URL="https://$FQDN"
        USE_SSL=true
        echo ""
        echo -e "${CYAN}SSL Configuration:${NC}"
        echo "  1) Auto (Let's Encrypt via Caddy) — recommended"
        echo "  2) Custom certificate (provide cert + key files)"
        echo "  3) No SSL (HTTP only — not recommended for production)"
        echo ""
        read -rp "Choose [1]: " SSL_CHOICE
        SSL_CHOICE="${SSL_CHOICE:-1}"

        case "$SSL_CHOICE" in
            2)
                echo ""
                read -rp "Path to SSL certificate (.crt/.pem): " SSL_CERT_PATH
                read -rp "Path to SSL private key (.key): " SSL_KEY_PATH
                if [ ! -f "$SSL_CERT_PATH" ] || [ ! -f "$SSL_KEY_PATH" ]; then
                    log_error "Certificate or key file not found."
                    exit 1
                fi
                mkdir -p "$SSL_DIR"
                cp "$SSL_CERT_PATH" "$SSL_DIR/cert.pem"
                cp "$SSL_KEY_PATH" "$SSL_DIR/key.pem"
                chmod 600 "$SSL_DIR/key.pem"
                chmod 644 "$SSL_DIR/cert.pem"
                SSL_MODE="custom"
                ;;
            3)
                SITE_URL="http://$FQDN"
                USE_SSL=false
                SSL_MODE="none"
                ;;
            *)
                SSL_MODE="auto"
                ;;
        esac
    fi
}

# ============================================================================
# 7. Create .env file
# ============================================================================
create_env() {
    log_step "Creating environment configuration..."

    if [ -f "$ENV_FILE" ]; then
        log_warn ".env file already exists. Backing up to .env.bak"
        cp "$ENV_FILE" "$ENV_FILE.bak"
    fi

    local SECRET=$(generate_secret)

    cat > "$ENV_FILE" <<EOF
# ============================================================================
# Cally Configuration — Generated by setup.sh on $(date -u +"%Y-%m-%d %H:%M:%S UTC")
# ============================================================================

# Core
NODE_ENV=production
PORT=$CALLY_PORT
NEXTAUTH_URL=$SITE_URL
NEXTAUTH_SECRET=$SECRET

# Domain
CALLY_FQDN=$FQDN

# Database (SQLite default — no config needed)
# DATABASE_URL=file:./prisma/cally.db

# OAuth Providers (optional — configure from Admin Settings or here)
# GOOGLE_CLIENT_ID=
# GOOGLE_CLIENT_SECRET=
# DISCORD_CLIENT_ID=
# DISCORD_CLIENT_SECRET=
# TWITTER_CLIENT_ID=
# TWITTER_CLIENT_SECRET=

# SMTP Email (optional — configure from Admin Settings)
# SMTP_HOST=
# SMTP_PORT=587
# SMTP_USER=
# SMTP_PASS=
# EMAIL_FROM=noreply@${FQDN}

# Discord Bot (optional)
# DISCORD_BOT_TOKEN=
# DISCORD_APPLICATION_ID=

# Registration
ENABLE_REGISTRATION=true
EOF

    chmod 600 "$ENV_FILE"
    log_info "Environment file created at $ENV_FILE"
}

# ============================================================================
# 8. Configure Caddy reverse proxy
# ============================================================================
configure_caddy() {
    if [ "$FQDN" = "localhost" ]; then
        log_info "Skipping Caddy config for localhost."
        return
    fi

    log_step "Configuring Caddy reverse proxy..."

    local CADDYFILE="/etc/caddy/Caddyfile"

    if [ "${SSL_MODE:-auto}" = "custom" ]; then
        sudo tee "$CADDYFILE" > /dev/null <<EOF
$FQDN {
    tls $SSL_DIR/cert.pem $SSL_DIR/key.pem

    reverse_proxy localhost:$CALLY_PORT {
        header_up X-Real-IP {remote_host}
        header_up X-Forwarded-For {remote_host}
        header_up X-Forwarded-Proto {scheme}
    }

    encode gzip zstd

    # Security headers (Caddy layer — Cally adds its own too)
    header {
        X-Robots-Tag "noindex, nofollow"
        -Server
    }

    log {
        output file /var/log/caddy/cally-access.log {
            roll_size 10mb
            roll_keep 5
        }
    }
}
EOF
    elif [ "${SSL_MODE:-auto}" = "none" ]; then
        sudo tee "$CADDYFILE" > /dev/null <<EOF
http://$FQDN {
    reverse_proxy localhost:$CALLY_PORT {
        header_up X-Real-IP {remote_host}
        header_up X-Forwarded-For {remote_host}
        header_up X-Forwarded-Proto {scheme}
    }

    encode gzip zstd

    header {
        -Server
    }

    log {
        output file /var/log/caddy/cally-access.log {
            roll_size 10mb
            roll_keep 5
        }
    }
}
EOF
    else
        # Auto SSL via Let's Encrypt
        sudo tee "$CADDYFILE" > /dev/null <<EOF
$FQDN {
    reverse_proxy localhost:$CALLY_PORT {
        header_up X-Real-IP {remote_host}
        header_up X-Forwarded-For {remote_host}
        header_up X-Forwarded-Proto {scheme}
    }

    encode gzip zstd

    header {
        X-Robots-Tag "noindex, nofollow"
        -Server
    }

    log {
        output file /var/log/caddy/cally-access.log {
            roll_size 10mb
            roll_keep 5
        }
    }
}
EOF
    fi

    sudo mkdir -p /var/log/caddy
    sudo systemctl enable caddy
    sudo systemctl restart caddy
    log_info "Caddy configured for $FQDN"
}

# ============================================================================
# 9. Create systemd service files
# ============================================================================
create_systemd_services() {
    log_step "Creating systemd service files..."

    # Main Cally service
    sudo tee /etc/systemd/system/cally.service > /dev/null <<EOF
[Unit]
Description=Cally - Self-Hosted Calendar & Scheduling
Documentation=https://github.com/yourrepo/cally
After=network.target
Wants=network-online.target

[Service]
Type=simple
User=$CALLY_USER
WorkingDirectory=$CALLY_DIR
ExecStart=$(which node) $CALLY_DIR/node_modules/.bin/next start -p $CALLY_PORT
Restart=always
RestartSec=5
StartLimitIntervalSec=60
StartLimitBurst=3

# Environment
EnvironmentFile=$ENV_FILE

# Security hardening
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=read-only
ReadWritePaths=$CALLY_DIR/prisma $CALLY_DIR/backups $CALLY_DIR/ssl $CALLY_DIR/.next
PrivateTmp=true
ProtectKernelTunables=true
ProtectKernelModules=true
ProtectControlGroups=true

# Resource limits
LimitNOFILE=65535
MemoryMax=512M

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=cally

[Install]
WantedBy=multi-user.target
EOF

    # Discord Bot service (optional)
    sudo tee /etc/systemd/system/cally-bot.service > /dev/null <<EOF
[Unit]
Description=Cally Discord Bot
After=network.target cally.service
ConditionPathExists=$CALLY_DIR/src/bot.ts

[Service]
Type=simple
User=$CALLY_USER
WorkingDirectory=$CALLY_DIR
ExecStart=$(which npx) tsx $CALLY_DIR/src/bot.ts
Restart=always
RestartSec=10

EnvironmentFile=$ENV_FILE

NoNewPrivileges=true
ProtectSystem=strict
ReadWritePaths=$CALLY_DIR/prisma
PrivateTmp=true

StandardOutput=journal
StandardError=journal
SyslogIdentifier=cally-bot

[Install]
WantedBy=multi-user.target
EOF

    sudo systemctl daemon-reload
    log_info "Systemd services created: cally.service, cally-bot.service"
}

# ============================================================================
# 10. Setup automated backups
# ============================================================================
setup_backups() {
    log_step "Setting up automated database backups..."

    mkdir -p "$BACKUP_DIR"

    cat > "$CALLY_DIR/backup.sh" <<'BACKUPEOF'
#!/usr/bin/env bash
# Cally Database Backup Script
CALLY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_DIR="$CALLY_DIR/backups"
DB_FILE="$CALLY_DIR/prisma/dev.db"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
MAX_BACKUPS=30

if [ ! -f "$DB_FILE" ]; then
    echo "[backup] Database file not found: $DB_FILE"
    exit 1
fi

mkdir -p "$BACKUP_DIR"

# Use sqlite3 .backup for safe copy if available, otherwise cp
if command -v sqlite3 &>/dev/null; then
    sqlite3 "$DB_FILE" ".backup '$BACKUP_DIR/cally_${TIMESTAMP}.db'"
else
    cp "$DB_FILE" "$BACKUP_DIR/cally_${TIMESTAMP}.db"
fi

# Compress
gzip "$BACKUP_DIR/cally_${TIMESTAMP}.db" 2>/dev/null || true

# Rotate: keep last N backups
ls -1t "$BACKUP_DIR"/cally_*.db.gz 2>/dev/null | tail -n +$((MAX_BACKUPS + 1)) | xargs -r rm -f

echo "[backup] Backup completed: cally_${TIMESTAMP}.db.gz"
BACKUPEOF

    chmod +x "$CALLY_DIR/backup.sh"

    # Add cron job for daily backups at 3 AM
    (crontab -l 2>/dev/null | grep -v "cally/backup.sh"; echo "0 3 * * * $CALLY_DIR/backup.sh >> $CALLY_DIR/backups/backup.log 2>&1") | crontab -

    log_info "Daily backup configured at 3:00 AM → $BACKUP_DIR/"
}

# ============================================================================
# 11. Install npm dependencies & build
# ============================================================================
build_app() {
    log_step "Installing dependencies..."
    cd "$CALLY_DIR"
    npm ci --production=false

    log_step "Generating Prisma client..."
    npx prisma generate

    log_step "Running database migrations..."
    npx prisma migrate deploy 2>/dev/null || npx prisma db push --accept-data-loss

    log_step "Building Next.js application..."
    npm run build

    log_info "Build completed successfully."
}

# ============================================================================
# 12. Start services
# ============================================================================
start_services() {
    log_step "Starting Cally..."

    sudo systemctl enable cally
    sudo systemctl start cally

    # Check if bot token is configured
    if grep -q "^DISCORD_BOT_TOKEN=" "$ENV_FILE" 2>/dev/null; then
        sudo systemctl enable cally-bot
        sudo systemctl start cally-bot
        log_info "Discord bot started."
    fi

    sleep 3

    if sudo systemctl is-active --quiet cally; then
        log_info "Cally is running!"
    else
        log_error "Cally failed to start. Check logs: journalctl -u cally -f"
        exit 1
    fi
}

# ============================================================================
# 13. Print summary
# ============================================================================
print_summary() {
    echo ""
    echo -e "${GREEN}${BOLD}════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}${BOLD}  ✅ Cally has been successfully deployed!${NC}"
    echo -e "${GREEN}${BOLD}════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "  ${CYAN}URL:${NC}         $SITE_URL"
    echo -e "  ${CYAN}Directory:${NC}   $CALLY_DIR"
    echo -e "  ${CYAN}Config:${NC}      $ENV_FILE"
    echo -e "  ${CYAN}Database:${NC}    $CALLY_DIR/prisma/dev.db"
    echo -e "  ${CYAN}Backups:${NC}     $BACKUP_DIR/ (daily at 3 AM)"
    echo ""
    echo -e "  ${YELLOW}Commands:${NC}"
    echo -e "    sudo systemctl status cally       # Check status"
    echo -e "    sudo systemctl restart cally       # Restart app"
    echo -e "    sudo journalctl -u cally -f        # View logs"
    echo -e "    sudo systemctl status cally-bot    # Bot status"
    echo -e "    $CALLY_DIR/backup.sh               # Manual backup"
    echo ""
    echo -e "  ${YELLOW}First Steps:${NC}"
    echo -e "    1. Open ${BOLD}$SITE_URL${NC} in your browser"
    echo -e "    2. The first user to register becomes Admin"
    echo -e "    3. Configure SMTP, OAuth, and FQDN from Admin → Settings"
    echo ""
    if [ "$FQDN" = "localhost" ]; then
        echo -e "  ${YELLOW}⚠  You're running on localhost.${NC}"
        echo -e "     Set your FQDN from Admin → Settings → Domain when ready."
    fi
    echo ""
}

# ============================================================================
# MAIN
# ============================================================================
main() {
    print_banner

    # Check not running as root directly (use sudo for specific commands)
    if [ "$(id -u)" -eq 0 ] && [ -z "${SUDO_USER:-}" ]; then
        log_warn "Running as root. Consider running as a regular user with sudo access."
    fi

    detect_os
    install_deps
    install_node
    install_caddy
    ask_fqdn
    create_env
    build_app
    create_systemd_services
    setup_backups
    configure_caddy
    start_services
    print_summary
}

main "$@"
