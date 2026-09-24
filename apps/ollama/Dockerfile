# The clinical-assist model service.
#
# The upstream image plus this repo's entrypoint, which pulls the model on
# first boot and skips the pull when the volume already holds it — the same
# script docker-compose.yml uses, so local and deployed behave identically.
FROM ollama/ollama:latest

COPY docker/ollama-entrypoint.sh /entrypoint.sh

ENTRYPOINT ["/bin/sh", "/entrypoint.sh"]
