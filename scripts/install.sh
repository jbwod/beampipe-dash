#!/bin/sh
# Configure Beampipe Dash against a Core install and optionally start it.
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/jbwod/beampipe-dash/main/scripts/install.sh | sh
#   ./scripts/install.sh
#   ./scripts/install.sh --core-home ~/beampipe --no-start
#   ./scripts/install.sh --core-home ~/beampipe --dash-dir ~/beampipe-dash
set -eu

DASH_REPO="${BEAMPIPE_DASH_REPO:-https://github.com/jbwod/beampipe-dash.git}"
OVERRIDE_FILE="compose.beampipe-local.yml"
DEFAULT_DASH_PORT=3000
DEFAULT_API_PORT=18080

bpd_usage() {
  cat <<'EOF'
Usage: install.sh [options]

  --core-home DIR   Core install home (default: BEAMPIPE_HOME, then ~/beampipe)
  --dash-dir DIR    Dash checkout (default: BEAMPIPE_DASH_HOME, then this repo, then ~/beampipe-dash)
  --dash-port PORT  Host port for the UI (default: BEAMPIPE_DASH_PORT or 3000)
  --no-start        Write overlay and .env only; do not start containers
  --yes             Non-interactive (reserved; discovery does not prompt)
  -h, --help        Show this help

Discovers Core from --core-home, ~/beampipe/installation.json, Compose project
names, then http://127.0.0.1:18080 and :8080 health probes. Does not print
Core .env secrets.
EOF
}

bpd_die() {
  echo "Error: $*" >&2
  exit 1
}

bpd_is_checkout() {
  [ -f "$1/compose.yaml" ] && [ -f "$1/Dockerfile" ]
}

bpd_installer_checkout() {
  if [ -n "${BPD_SELF:-}" ] && [ -f "$BPD_SELF" ]; then
    dir=$(CDPATH= cd -- "$(dirname -- "$BPD_SELF")/.." && pwd)
    if bpd_is_checkout "$dir"; then
      printf '%s\n' "$dir"
      return 0
    fi
  fi
  return 1
}

bpd_compose_project_name() {
  python3 -c '
import sys
raw = sys.argv[1]
normalized = "".join(
    ch.lower() if ch.isalnum() or ch in "-_" else "-"
    for ch in raw
)
trimmed = normalized.strip("-_")
print(trimmed or "beampipe")
' "$1"
}

bpd_json_field() {
  python3 -c '
import json, sys
path, key = sys.argv[1], sys.argv[2]
with open(path, encoding="utf-8") as handle:
    data = json.load(handle)
value = data.get(key, "")
if value is None:
    value = ""
print(value)
' "$1" "$2"
}

bpd_env_value() {
  file=$1
  key=$2
  [ -f "$file" ] || return 0
  python3 -c '
import sys
path, key = sys.argv[1], sys.argv[2]
prefix = key + "="
with open(path, encoding="utf-8") as handle:
    for line in handle:
        if line.startswith(prefix):
            print(line[len(prefix):].rstrip("\r\n"), end="")
            break
' "$file" "$key"
}

bpd_set_env_value() {
  file=$1
  key=$2
  value=$3
  python3 -c '
import os, sys
path, key, value = sys.argv[1], sys.argv[2], sys.argv[3]
lines = []
if os.path.isfile(path):
    with open(path, encoding="utf-8") as handle:
        lines = handle.read().splitlines()
found = False
out = []
prefix = key + "="
for line in lines:
    if line.startswith(prefix):
        out.append(prefix + value)
        found = True
    else:
        out.append(line)
if not found:
    out.append(prefix + value)
text = "\n".join(out) + "\n"
os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
with open(path, "w", encoding="utf-8") as handle:
    handle.write(text)
' "$file" "$key" "$value"
}

bpd_port_in_use() {
  python3 -c '
import socket, sys
port = int(sys.argv[1])
sock = socket.socket()
sock.settimeout(0.2)
try:
    sock.connect(("127.0.0.1", port))
except OSError:
    sys.exit(1)
finally:
    sock.close()
sys.exit(0)
' "$1"
}

bpd_health_ok() {
  url=$1
  command -v curl >/dev/null 2>&1 || return 1
  curl -fsS -o /dev/null --connect-timeout 1 --max-time 2 "$url"
}

bpd_docker_project_running() {
  project=$1
  command -v docker >/dev/null 2>&1 || return 1
  ids=$(docker ps --filter "label=com.docker.compose.project=${project}" --filter "label=com.docker.compose.service=api" --format '{{.ID}}' 2>/dev/null || true)
  [ -n "$ids" ]
}

bpd_network_exists() {
  command -v docker >/dev/null 2>&1 || return 1
  docker network inspect "$1" >/dev/null 2>&1
}

bpd_load_core_from_home() {
  home=$1
  [ -n "$home" ] || return 1
  case "$home" in
    ~) home=$HOME ;;
    ~/*) home=$HOME/${home#~/} ;;
  esac
  [ -d "$home" ] || return 1
  BPD_CORE_HOME=$home
  BPD_CORE_ENV=$home/.env
  BPD_CORE_RUNTIME=
  BPD_CORE_PROJECT=
  if [ -f "$home/installation.json" ]; then
    BPD_CORE_PROJECT=$(bpd_json_field "$home/installation.json" compose_project || true)
    BPD_CORE_RUNTIME=$(bpd_json_field "$home/installation.json" runtime || true)
    env_file=$(bpd_json_field "$home/installation.json" environment_file || true)
    if [ -n "$env_file" ] && [ -f "$env_file" ]; then
      BPD_CORE_ENV=$env_file
    fi
  fi
  if [ -z "$BPD_CORE_PROJECT" ]; then
    BPD_CORE_PROJECT=$(bpd_compose_project_name "$(basename -- "$home")")
  fi
  if [ -z "$BPD_CORE_RUNTIME" ]; then
    if [ -f "$home/docker-compose.yml" ]; then
      BPD_CORE_RUNTIME=docker
    else
      BPD_CORE_RUNTIME=host
    fi
  fi
  port=$(bpd_env_value "$BPD_CORE_ENV" BEAMPIPE_API_PORT || true)
  if [ -z "$port" ]; then
    port=$DEFAULT_API_PORT
  fi
  BPD_CORE_API_PORT=$port
  BPD_CORE_NETWORK=${BPD_CORE_PROJECT}_default
  return 0
}

bpd_discover_core() {
  if [ -n "${BPD_CORE_HOME_FLAG:-}" ]; then
    bpd_load_core_from_home "$BPD_CORE_HOME_FLAG" || bpd_die "Core home not found: $BPD_CORE_HOME_FLAG"
    return 0
  fi
  if [ -n "${BEAMPIPE_HOME:-}" ]; then
    if bpd_load_core_from_home "$BEAMPIPE_HOME"; then
      return 0
    fi
  fi
  if [ -f "$HOME/beampipe/installation.json" ]; then
    bpd_load_core_from_home "$HOME/beampipe" || true
    if [ -n "${BPD_CORE_HOME:-}" ]; then
      return 0
    fi
  fi
  for project in beampipe beampipe-core-v2; do
    if bpd_docker_project_running "$project"; then
      if [ "$project" = beampipe ]; then
        guess=$HOME/beampipe
      else
        guess=$HOME/beampipe-core-v2
      fi
      if bpd_load_core_from_home "$guess"; then
        return 0
      fi
      BPD_CORE_HOME=$guess
      BPD_CORE_PROJECT=$project
      BPD_CORE_RUNTIME=docker
      BPD_CORE_API_PORT=$DEFAULT_API_PORT
      BPD_CORE_NETWORK=${project}_default
      BPD_CORE_ENV=
      return 0
    fi
  done
  if bpd_health_ok "http://127.0.0.1:${DEFAULT_API_PORT}/api/v2/health"; then
    BPD_CORE_HOME=
    BPD_CORE_RUNTIME=host
    BPD_CORE_API_PORT=$DEFAULT_API_PORT
    BPD_CORE_PROJECT=
    BPD_CORE_NETWORK=
    BPD_CORE_ENV=
    return 0
  fi
  if bpd_health_ok "http://127.0.0.1:8080/api/v2/health"; then
    BPD_CORE_HOME=
    BPD_CORE_RUNTIME=host
    BPD_CORE_API_PORT=8080
    BPD_CORE_PROJECT=
    BPD_CORE_NETWORK=
    BPD_CORE_ENV=
    return 0
  fi
  bpd_die "could not find Beampipe Core. Pass --core-home, or start Core (beampipe start) and retry"
}

bpd_write_overlay() {
  dest=$1
  network=$2
  port=$3
  cat >"$dest" <<EOF
# Generated by scripts/install.sh / beampipe setup --dashboard.
# Join Core's Compose network. Operator installs usually use beampipe_default;
# a git checkout compose project is often beampipe-core-v2_default.
services:
  dashboard:
    environment:
      BEAMPIPE_API_URL: http://api:8080
    ports: !override
      - "127.0.0.1:${port}:3000"
    networks:
      - default
      - beampipe-core

networks:
  beampipe-core:
    external: true
    name: ${network}
EOF
}

bpd_ensure_env() {
  dash_dir=$1
  env_path=$dash_dir/.env
  example=$dash_dir/.env.example
  if [ ! -f "$env_path" ] && [ -f "$example" ]; then
    cp "$example" "$env_path"
    echo "Created Dash .env from .env.example"
  fi
  if [ ! -f "$env_path" ]; then
    : >"$env_path"
  fi
  chmod 600 "$env_path" 2>/dev/null || true
}

bpd_configure() {
  dash_dir=$1
  bpd_ensure_env "$dash_dir"
  env_path=$dash_dir/.env
  if [ "${BPD_CORE_RUNTIME}" = docker ] && [ -n "${BPD_CORE_NETWORK:-}" ]; then
    bpd_write_overlay "$dash_dir/$OVERRIDE_FILE" "$BPD_CORE_NETWORK" "$BPD_DASH_PORT"
    bpd_set_env_value "$env_path" BEAMPIPE_API_URL "http://api:8080"
    echo "Wrote $dash_dir/$OVERRIDE_FILE (network ${BPD_CORE_NETWORK})"
  else
    bpd_set_env_value "$env_path" BEAMPIPE_API_URL "http://host.docker.internal:${BPD_CORE_API_PORT}"
    echo "Host Core API on 127.0.0.1:${BPD_CORE_API_PORT}; Dash Compose will use host.docker.internal"
  fi
  bpd_set_env_value "$env_path" BEAMPIPE_DASH_PORT "$BPD_DASH_PORT"
}

bpd_require_compose() {
  command -v docker >/dev/null 2>&1 || bpd_die "Docker Compose v2 is required"
  docker compose version >/dev/null 2>&1 || bpd_die "Docker Compose v2 is required"
}

bpd_start() {
  dash_dir=$1
  bpd_require_compose
  if bpd_port_in_use "$BPD_DASH_PORT"; then
    bpd_die "Dash port already in use: 127.0.0.1:${BPD_DASH_PORT}. Stop the other process or pass --dash-port"
  fi
  CDPATH= cd -- "$dash_dir"
  if [ "${BPD_CORE_RUNTIME}" = docker ] && [ -n "${BPD_CORE_NETWORK:-}" ]; then
    if ! bpd_network_exists "$BPD_CORE_NETWORK"; then
      bpd_die "Core Compose network ${BPD_CORE_NETWORK} is missing. Start Core first: beampipe start"
    fi
    echo "  docker compose -f compose.yaml -f ${OVERRIDE_FILE} up --build -d --wait"
    docker compose -f compose.yaml -f "$OVERRIDE_FILE" up --build -d --wait
  else
    echo "  docker compose -f compose.yaml up --build -d --wait"
    docker compose -f compose.yaml up --build -d --wait
  fi
  echo "Dash is up at http://127.0.0.1:${BPD_DASH_PORT}"
}

bpd_ensure_checkout() {
  dash_dir=$1
  if bpd_is_checkout "$dash_dir"; then
    return 0
  fi
  if [ -e "$dash_dir" ]; then
    bpd_die "$dash_dir exists but is not a Beampipe Dash checkout (need compose.yaml and Dockerfile)"
  fi
  command -v git >/dev/null 2>&1 || bpd_die "git is required to clone Beampipe Dash"
  echo "Cloning Beampipe Dash into $dash_dir"
  git clone --depth 1 "$DASH_REPO" "$dash_dir"
}

bpd_parse_args() {
  BPD_START=1
  BPD_YES=0
  BPD_CORE_HOME_FLAG=
  BPD_DASH_DIR_FLAG=
  BPD_DASH_PORT=${BEAMPIPE_DASH_PORT:-$DEFAULT_DASH_PORT}
  while [ $# -gt 0 ]; do
    case "$1" in
      --core-home)
        [ $# -ge 2 ] || bpd_die "--core-home needs a directory"
        BPD_CORE_HOME_FLAG=$2
        shift 2
        ;;
      --dash-dir)
        [ $# -ge 2 ] || bpd_die "--dash-dir needs a directory"
        BPD_DASH_DIR_FLAG=$2
        shift 2
        ;;
      --dash-port)
        [ $# -ge 2 ] || bpd_die "--dash-port needs a port"
        BPD_DASH_PORT=$2
        shift 2
        ;;
      --no-start)
        BPD_START=0
        shift
        ;;
      --yes)
        BPD_YES=1
        shift
        ;;
      -h|--help)
        bpd_usage
        exit 0
        ;;
      *)
        bpd_die "unknown argument: $1"
        ;;
    esac
  done
  case "$BPD_DASH_PORT" in
    *[!0-9]*|'') bpd_die "--dash-port must be an integer" ;;
  esac
}

main() {
  command -v python3 >/dev/null 2>&1 || bpd_die "python3 is required"
  bpd_parse_args "$@"

  if [ -n "${BPD_DASH_DIR_FLAG:-}" ]; then
    dash_dir=$BPD_DASH_DIR_FLAG
    case "$dash_dir" in
      ~) dash_dir=$HOME ;;
      ~/*) dash_dir=$HOME/${dash_dir#~/} ;;
    esac
  elif [ -n "${BEAMPIPE_DASH_HOME:-}" ]; then
    dash_dir=$BEAMPIPE_DASH_HOME
  elif checkout=$(bpd_installer_checkout); then
    dash_dir=$checkout
  else
    dash_dir=$HOME/beampipe-dash
  fi

  bpd_ensure_checkout "$dash_dir"
  dash_dir=$(CDPATH= cd -- "$dash_dir" && pwd)

  bpd_discover_core
  echo "Core runtime=${BPD_CORE_RUNTIME} api_port=${BPD_CORE_API_PORT}"
  if [ -n "${BPD_CORE_HOME:-}" ]; then
    echo "Core home=${BPD_CORE_HOME}"
  fi
  if [ "${BPD_CORE_RUNTIME}" = docker ] && [ -n "${BPD_CORE_NETWORK:-}" ]; then
    echo "Core network=${BPD_CORE_NETWORK}"
  fi
  echo "Dash home=${dash_dir}"
  echo "Dash port=${BPD_DASH_PORT}"

  bpd_configure "$dash_dir"
  if [ "$BPD_START" -eq 1 ]; then
    bpd_start "$dash_dir"
  else
    echo "Wrote Dash files (not started). Start with:"
    echo "  sh ${dash_dir}/scripts/install.sh --core-home ${BPD_CORE_HOME:-\$BEAMPIPE_HOME} --dash-dir ${dash_dir}"
  fi
}

BPD_SELF=$0
if [ "${BPD_INSTALL_LIB:-}" = "1" ]; then
  return 0 2>/dev/null || exit 0
fi

main "$@"
