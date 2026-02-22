#!/bin/bash

# Anonym X - Deployment Script
# Usage: ./deploy.sh [command]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[INFO]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# Check requirements
check_requirements() {
    log "Checking requirements..."
    command -v docker >/dev/null 2>&1 || error "Docker is not installed"
    command -v docker-compose >/dev/null 2>&1 || command -v docker compose >/dev/null 2>&1 || error "Docker Compose is not installed"
    log "Requirements OK"
}

# Setup environment
setup_env() {
    if [ ! -f .env ]; then
        log "Creating .env file from example..."
        cp .env.example .env
        warn "Please edit .env file with your settings"
    fi
}

# Build containers
build() {
    log "Building containers..."
    docker-compose build --no-cache
    log "Build complete"
}

# Start services
start() {
    log "Starting services..."
    docker-compose up -d
    log "Services started"
    log "Backend API: http://localhost:8001"
    log "Admin Panel: http://localhost/admin"
}

# Stop services
stop() {
    log "Stopping services..."
    docker-compose down
    log "Services stopped"
}

# Restart services
restart() {
    stop
    start
}

# View logs
logs() {
    docker-compose logs -f "${1:-}"
}

# Backup database
backup() {
    log "Creating database backup..."
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_FILE="backups/mongodb_backup_${TIMESTAMP}.gz"
    mkdir -p backups
    
    docker-compose exec -T mongodb mongodump --archive --gzip --db anonym_x > "$BACKUP_FILE"
    
    log "Backup created: $BACKUP_FILE"
}

# Restore database
restore() {
    if [ -z "$1" ]; then
        error "Usage: ./deploy.sh restore <backup_file>"
    fi
    
    if [ ! -f "$1" ]; then
        error "Backup file not found: $1"
    fi
    
    warn "This will overwrite the current database. Continue? (y/N)"
    read -r confirm
    if [ "$confirm" != "y" ]; then
        log "Restore cancelled"
        exit 0
    fi
    
    log "Restoring database from $1..."
    docker-compose exec -T mongodb mongorestore --archive --gzip --drop < "$1"
    log "Restore complete"
}

# Update application
update() {
    log "Pulling latest changes..."
    git pull origin main 2>/dev/null || warn "Not a git repository"
    
    build
    restart
    log "Update complete"
}

# Show status
status() {
    log "Service status:"
    docker-compose ps
}

# SSL certificate setup with Let's Encrypt
setup_ssl() {
    if [ -z "$DOMAIN" ]; then
        source .env 2>/dev/null || true
    fi
    
    if [ -z "$DOMAIN" ]; then
        error "DOMAIN not set. Edit .env file first."
    fi
    
    log "Setting up SSL for $DOMAIN..."
    
    mkdir -p nginx/ssl
    
    # Use certbot
    docker run -it --rm \
        -v "$(pwd)/nginx/ssl:/etc/letsencrypt" \
        -v "$(pwd)/nginx/www:/var/www/certbot" \
        -p 80:80 \
        certbot/certbot certonly \
        --standalone \
        -d "$DOMAIN" \
        --email "${LETSENCRYPT_EMAIL:-admin@$DOMAIN}" \
        --agree-tos \
        --non-interactive
    
    log "SSL certificate installed"
    warn "Don't forget to uncomment HTTPS server block in nginx/nginx.conf"
}

# Help
show_help() {
    echo "Anonym X Deployment Script"
    echo ""
    echo "Usage: ./deploy.sh [command]"
    echo ""
    echo "Commands:"
    echo "  setup     - Initial setup (create .env)"
    echo "  build     - Build Docker containers"
    echo "  start     - Start all services"
    echo "  stop      - Stop all services"
    echo "  restart   - Restart all services"
    echo "  logs      - View logs (optional: service name)"
    echo "  status    - Show service status"
    echo "  backup    - Create database backup"
    echo "  restore   - Restore database from backup"
    echo "  update    - Pull and rebuild"
    echo "  ssl       - Setup Let's Encrypt SSL"
    echo "  help      - Show this help"
}

# Main
case "${1:-help}" in
    setup)      check_requirements; setup_env ;;
    build)      check_requirements; build ;;
    start)      check_requirements; start ;;
    stop)       stop ;;
    restart)    restart ;;
    logs)       logs "$2" ;;
    status)     status ;;
    backup)     backup ;;
    restore)    restore "$2" ;;
    update)     update ;;
    ssl)        setup_ssl ;;
    help|*)     show_help ;;
esac
