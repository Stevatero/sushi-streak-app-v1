/**
 * Config plugin: rimuove dal manifest Android i servizi in foreground di expo-audio
 * (controlli nella schermata di blocco e registrazione) e i relativi permessi.
 *
 * L'app riproduce solo brevi effetti sonori in primo piano e non usa setActiveForLockScreen né la
 * registrazione: dichiarare servizi "mediaPlayback"/"microphone" richiederebbe inoltre una
 * dichiarazione dedicata nella Play Console. Se in futuro servissero, rimuovere questo plugin.
 */
const { withAndroidManifest } = require('expo/config-plugins');

const SERVICES = [
  'expo.modules.audio.service.AudioControlsService',
  'expo.modules.audio.service.AudioRecordingService',
];

module.exports = function withoutUnusedAudioServices(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;
    manifest.$ = manifest.$ || {};
    manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';

    const application = manifest.application?.[0];
    if (!application) return cfg;
    application.service = (application.service || []).filter((s) => !SERVICES.includes(s.$?.['android:name']));
    for (const name of SERVICES) {
      application.service.push({ $: { 'android:name': name, 'tools:node': 'remove' } });
    }
    return cfg;
  });
};
