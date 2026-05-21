# pandoc-render — proposal PDF rendering sidecar
#
# Used by n8n workflow 07-proposal-generator. Accepts JSON over HTTP and
# returns the rendered PDF (or markdown if requested).
#
# Uses pandoc/extra which bundles pandoc + a full TeX Live + Eisvogel
# template + common LaTeX packages. Smaller than building Alpine TeX Live
# from scratch and battle-tested.
#
# Image size: ~1.2 GB. RAM idle: ~30 MB. Good fit.

FROM pandoc/extra:3.1.13.0-alpine

USER root

# Node 20 + Express for the HTTP wrapper.
# ttf-dejavu: fonts referenced by our pandoc invocation (DejaVu Sans/Mono).
RUN apk add --no-cache nodejs npm tini ttf-dejavu

WORKDIR /app

COPY package.json server.js ./
RUN npm install --omit=dev --no-audit --no-fund

# Templates + prompts + skus.yml mounted read-only at /data at runtime
# Output PDFs go to /tmp (ephemeral — n8n streams them straight to Documenso)

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q -O- http://127.0.0.1:3000/health || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "/app/server.js"]
