import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'top.momia.mywallet',
  appName: 'MyWallet',
  webDir: 'dist',
  server: {
    // A secure local origin matching production keeps WebAuthn and secure-cookie
    // semantics intact while the frontend itself stays bundled in the APK.
    hostname: 'mywallet.momia.top',
    androidScheme: 'https',
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
    backgroundColor: '#fff8f1',
  },
};

export default config;
