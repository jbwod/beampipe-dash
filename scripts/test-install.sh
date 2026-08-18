#!/bin/sh
# Dry-run checks for scripts/install.sh. No Docker, no network.
set -eu

root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
install="$root/scripts/install.sh"
[ -f "$install" ] || {
  echo "missing $install" >&2
  exit 1
}

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

core=$tmp/beampipe
dash=$tmp/beampipe-dash
mkdir -p "$core" "$dash"
printf 'name: beampipe\n' >"$core/docker-compose.yml"
cat >"$core/installation.json" <<'EOF'
{
  "schema_version": 1,
  "beampipe_version": "0.1.3",
  "runtime": "docker",
  "database_mode": "compose",
  "home": "HOME_PLACEHOLDER",
  "environment_file": "ENV_PLACEHOLDER",
  "config_file": "CONFIG_PLACEHOLDER",
  "credential_root": "CRED_PLACEHOLDER",
  "operator_bundle_version": "0.1.3",
  "compose_project": "beampipe"
}
EOF
python3 - "$core" <<'PY'
from pathlib import Path
import json, sys
home = Path(sys.argv[1])
path = home / "installation.json"
data = json.loads(path.read_text())
data["home"] = str(home)
data["environment_file"] = str(home / ".env")
data["config_file"] = str(home / "beampipe.yaml")
data["credential_root"] = str(home / "credentials/ssh")
path.write_text(json.dumps(data, indent=2) + "\n")
PY
printf 'BEAMPIPE_API_PORT=18080\n' >"$core/.env"
chmod 600 "$core/.env"

cp "$root/compose.yaml" "$dash/compose.yaml"
cp "$root/compose.beampipe-local.yml" "$dash/compose.beampipe-local.yml"
cp "$root/.env.example" "$dash/.env.example"
printf 'FROM scratch\n' >"$dash/Dockerfile"
mkdir -p "$dash/scripts"
cp "$install" "$dash/scripts/install.sh"

sh "$dash/scripts/install.sh" --core-home "$core" --dash-dir "$dash" --dash-port 3000 --no-start --yes

overlay=$dash/compose.beampipe-local.yml
grep -q 'name: beampipe_default' "$overlay"
grep -q 'BEAMPIPE_API_URL: http://api:8080' "$overlay"
grep -q '127.0.0.1:3000:3000' "$overlay"
grep -q 'BEAMPIPE_API_URL=http://api:8080' "$dash/.env"
grep -q 'BEAMPIPE_DASH_PORT=3000' "$dash/.env"

# Host Core: no compose file, installation runtime host.
host=$tmp/host-core
mkdir -p "$host" "$tmp/dash-host"
printf 'FROM scratch\n' >"$tmp/dash-host/Dockerfile"
cp "$root/compose.yaml" "$tmp/dash-host/compose.yaml"
cp "$root/.env.example" "$tmp/dash-host/.env.example"
mkdir -p "$tmp/dash-host/scripts"
cp "$install" "$tmp/dash-host/scripts/install.sh"
cat >"$host/installation.json" <<EOF
{
  "schema_version": 1,
  "runtime": "host",
  "database_mode": "existing",
  "home": "$host",
  "environment_file": "$host/.env",
  "config_file": "$host/beampipe.yaml",
  "credential_root": "$host/credentials/ssh",
  "operator_bundle_version": "0.1.3",
  "compose_project": "host-core",
  "beampipe_version": "0.1.3"
}
EOF
printf 'BEAMPIPE_API_PORT=18080\n' >"$host/.env"

sh "$tmp/dash-host/scripts/install.sh" --core-home "$host" --dash-dir "$tmp/dash-host" --no-start --yes
grep -q 'BEAMPIPE_API_URL=http://host.docker.internal:18080' "$tmp/dash-host/.env"

# Unknown --core-home must fail.
if sh "$install" --core-home "$tmp/missing-core" --dash-dir "$dash" --no-start --yes; then
  echo "expected missing core home to fail" >&2
  exit 1
fi

echo "install.sh dry-run checks passed"
