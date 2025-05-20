#!/usr/bin/env node

const { spawnSync } = require('child_process');
const path = require('path');

// Запуск ts-node с дополнительными опциями для поддержки tsconfig.json и путей
const result = spawnSync('npx', [
  'ts-node',
  '-r', 'tsconfig-paths/register', // Добавляем поддержку разрешения алиасов путей из tsconfig.json
  path.resolve(__dirname, 'updateKinescopeDurations.ts')
], {
  stdio: 'inherit',
  env: {
    ...process.env,
    TS_NODE_PROJECT: path.resolve(__dirname, '../tsconfig.json') // Путь к tsconfig.json
  }
});

if (result.error) {
  console.error('Ошибка при запуске скрипта:', result.error);
  process.exit(1);
}

process.exit(result.status || 0); 