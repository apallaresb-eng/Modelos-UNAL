#!/bin/bash
# Hook SessionStart: deja listas las dependencias en cada sesión (sobre todo en la nube).
set -euo pipefail
cd "${CLAUDE_PROJECT_DIR:-$(dirname "$0")/..}"

if [ ! -d node_modules ] || [ package.json -nt node_modules ]; then
  npm install --no-audit --no-fund --loglevel=error >/dev/null 2>&1 || echo "Aviso: npm install falló; corre 'npm install' a mano." >&2
fi

echo "Modelos-UNAL listo. Recuerda: antes de cada simulación, busca skills del tema con find-skills (ver CLAUDE.md)."
