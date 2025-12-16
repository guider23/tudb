#!/bin/sh
if [ "$APP_TYPE" = "frontend" ]; then
  cd admin-dashboard && node server.js
else
  node dist/backend/src/index.js
fi
