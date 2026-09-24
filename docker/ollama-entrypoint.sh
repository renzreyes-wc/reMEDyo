#!/bin/sh
# Start the model server, then pull the model once.
#
# The pull is deliberately *after* the server is serving: the api is not gated
# on this container, so the application is fully usable while a 2 GB download
# is still running. The assist surfaces report unavailable until it lands.
#
# The model lives in a named volume, so a second `docker compose up` finds the
# tag already present and skips the pull entirely.

set -e

ollama serve &
server_pid=$!

# Wait for the local server to answer before asking it to pull.
until ollama list >/dev/null 2>&1; do
  sleep 1
done

if ollama list | grep -q "^${OLLAMA_MODEL%%:*}"; then
  echo "[ollama] ${OLLAMA_MODEL} already present; skipping pull."
else
  echo "[ollama] pulling ${OLLAMA_MODEL} (first boot only)..."
  ollama pull "${OLLAMA_MODEL}"
fi

wait "$server_pid"
