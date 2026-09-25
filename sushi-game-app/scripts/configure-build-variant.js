#!/usr/bin/env node
/**
 * Esclude gli strumenti di sviluppo (expo-dev-client, dev launcher e dev menu) dalle build
 * non di sviluppo. Senza questa esclusione le loro dipendenze native (es. Google ML Kit, tooling
 * Compose) finirebbero anche nell'app pubblicata sul Play Store.
 *
 * L'autolinking di Expo legge le esclusioni solo da package.json: lo script le aggiunge in base a
 * APP_VARIANT prima dell'installazione. Viene eseguito automaticamente da EAS
 * (hook "eas-build-pre-install") e va lanciato a mano prima di una build locale di rilascio:
 *   APP_VARIANT=production node scripts/configure-build-variant.js
 */
const fs = require('fs');
const path = require('path');

const DEV_ONLY_MODULES = ['expo-dev-client', 'expo-dev-launcher', 'expo-dev-menu', 'expo-dev-menu-interface'];

// Restituisce una copia di package.json con le esclusioni adatte alla variante
function applyVariant(pkg, variant) {
  if (variant === 'development') return pkg;
  const autolinking = pkg.expo?.autolinking ?? {};
  const exclude = [...new Set([...(autolinking.exclude ?? []), ...DEV_ONLY_MODULES])];
  return { ...pkg, expo: { ...pkg.expo, autolinking: { ...autolinking, exclude } } };
}

module.exports = { applyVariant, DEV_ONLY_MODULES };

if (require.main === module) {
  const variant = process.env.APP_VARIANT || 'production';
  const packageJsonPath = path.join(__dirname, '..', 'package.json');
  const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const updated = applyVariant(pkg, variant);
  if (updated !== pkg) {
    fs.writeFileSync(packageJsonPath, `${JSON.stringify(updated, null, 2)}\n`);
    console.log(`[configure-build-variant] ${variant}: esclusi dall'autolinking ${DEV_ONLY_MODULES.join(', ')}`);
  } else {
    console.log('[configure-build-variant] development: strumenti di sviluppo inclusi');
  }
}
