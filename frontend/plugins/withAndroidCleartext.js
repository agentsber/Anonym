const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withAndroidCleartext(config) {
  return withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults;
    
    // Add usesCleartextTraffic to application
    const application = androidManifest.manifest.application[0];
    application.$['android:usesCleartextTraffic'] = 'true';
    
    return config;
  });
};
