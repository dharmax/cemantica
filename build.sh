#!/usr/bin/env bash
echo creating log directories
mkdir -p logs/whisperation/test
mkdir -p logs/whisperation/production
echo Building back-end
node_modules/typescript/bin/tsc --build tsconfig.json
echo Building front-end ...
npm install --prefix fe
npm install --dev --prefix fe
cd fe
node_modules/parcel-bundler/bin/cli.js build *.html

