FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000

WORKDIR /app

# Node.js is installed as a fallback for monorepo backends that are Node-based.
RUN apt-get update && apt-get install -y --no-install-recommends \
    nodejs \
    npm \
    && rm -rf /var/lib/apt/lists/*

COPY . /app

# Auto-detect backend runtime and install dependencies.
RUN if [ -f requirements.txt ]; then \
      pip install --no-cache-dir -r requirements.txt; \
    fi \
    && if [ -f package-lock.json ]; then \
      npm ci --omit=dev; \
    elif [ -f package.json ]; then \
      npm install --omit=dev; \
    fi

RUN cat <<'EOF' > /usr/local/bin/start-backend
#!/bin/sh
set -e

if [ -f requirements.txt ]; then
  exec uvicorn main:app --host 0.0.0.0 --port "${PORT:-8000}"
fi

if [ -f package.json ]; then
  if node -e "const p=require('./package.json'); process.exit((p.scripts&&p.scripts.start)?0:1)"; then
    exec npm start
  fi
  if [ -f server.js ]; then
    exec node server.js
  fi
  echo "Node backend detected, but missing start script/server.js"
  exit 1
fi

echo "No Python or Node backend detected in /app"
exit 1
EOF

RUN chmod +x /usr/local/bin/start-backend

EXPOSE 8000

CMD ["start-backend"]
