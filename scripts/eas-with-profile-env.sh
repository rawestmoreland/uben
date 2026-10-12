#!/usr/bin/env bash
# Run a command with the same environment an EAS build uses for a build profile.
#
# Usage: scripts/eas-with-profile-env.sh <build-profile> <command> [args...]
#
# `eas update` can load a server-side EAS environment (`--environment`) but has no
# `--build-profile` flag, so the profile's `env` block in eas.json (APP_ENV, ...) is
# never applied. app.config.js reads those variables, so an update would compute a
# different native fingerprint (runtime version) than the store builds, and no build
# would receive it. This wrapper reproduces the builder's precedence:
#   1. variables from the profile's EAS environment (`eas env:exec`)
#   2. the profile's `env` block, which wins on conflicts
set -euo pipefail

if [ "$#" -lt 2 ]; then
  echo "Usage: $0 <build-profile> <command> [args...]" >&2
  exit 2
fi

PROFILE="$1"
shift

ENVIRONMENT=$(jq -r --arg p "$PROFILE" '.build[$p].environment // empty' eas.json)
if [ -z "$ENVIRONMENT" ]; then
  echo "Build profile '$PROFILE' has no \"environment\" in eas.json" >&2
  exit 1
fi

PROFILE_EXPORTS=$(jq -r --arg p "$PROFILE" '.build[$p].env // {} | to_entries[] | "export \(.key)=\(.value | @sh);"' eas.json)
QUOTED_COMMAND=$(jq -rn '$ARGS.positional | map(@sh) | join(" ")' --args -- "$@")

# In --non-interactive mode `eas env:exec` is a pure passthrough, so --json output stays parseable.
exec eas env:exec "$ENVIRONMENT" "${PROFILE_EXPORTS} ${QUOTED_COMMAND}" --non-interactive
