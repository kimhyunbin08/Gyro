#!/usr/bin/env bash
set -euo pipefail

: "${COPILOT_GITHUB_TOKEN:?Set the COPILOT_GITHUB_TOKEN Actions secret}"
: "${COPILOT_MODEL:?Set the COPILOT_MODEL Actions variable}"
: "${API_APP:?API_APP is required}"
: "${RESOURCE_GROUP:?RESOURCE_GROUP is required}"

if [[ "$COPILOT_GITHUB_TOKEN" != github_pat_* ]]; then
  echo "::error::COPILOT_GITHUB_TOKEN must be a fine-grained PAT with Copilot Requests permission."
  exit 1
fi

az containerapp secret set --name "$API_APP" --resource-group "$RESOURCE_GROUP" \
  --secrets "copilot-github-token=$COPILOT_GITHUB_TOKEN" \
  --only-show-errors --output none

az containerapp update --name "$API_APP" --resource-group "$RESOURCE_GROUP" \
  --set-env-vars \
    NODE_ENV=production \
    GYRO_ASSISTANT_PROVIDER=copilot \
    "COPILOT_MODEL=$COPILOT_MODEL" \
    COPILOT_GITHUB_TOKEN=secretref:copilot-github-token \
  --only-show-errors --output none
