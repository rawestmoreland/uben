const IS_DEV = process.env.APP_ENV === 'development';
const IS_PREVIEW = process.env.APP_ENV === 'preview';

// Determine app variant suffix
const getAppVariant = () => {
  if (IS_DEV) return ' (Dev)';
  if (IS_PREVIEW) return ' (Preview)';
  return ''; // Production has no suffix
};

// Determine bundle identifier suffix
const getBundleSuffix = () => {
  if (IS_DEV) return '.dev';
  if (IS_PREVIEW) return '.preview';
  return ''; // Production: com.westmorelandcreative.uben
};

// Determine URL scheme suffix — each variant needs its own scheme so that
// scanning the `expo start` QR code (a germanpractice://expo-development-client/...
// deep link) can only be claimed by the dev-client build, not by a preview
// or production build also installed on the same device.
const getSchemeSuffix = () => {
  if (IS_DEV) return '-dev';
  if (IS_PREVIEW) return '-preview';
  return ''; // Production: germanpractice
};

export default {
  expo: {
    name: `üben${getAppVariant()}`,
    slug: 'uben',
    version: '1.9.0',
    orientation: 'portrait',
    icon: `./assets/images/icon${IS_PREVIEW ? '-preview' : ''}.png`,
    scheme: `germanpractice${getSchemeSuffix()}`,
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      bundleIdentifier: `com.westmorelandcreative.uben${getBundleSuffix()}`,
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    android: {
      package: `com.westmorelandcreative.uben${getBundleSuffix()}`,
      icon: `./assets/images/icon${IS_PREVIEW ? '-preview' : ''}.png`,
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
    },
    plugins: [
      'expo-router',
      [
        'expo-dev-client',
        {
          // expo-dev-client is a normal dependency, so its config plugin
          // runs for every build profile — including preview/production —
          // and by default registers an `exp+uben` URL scheme in each one
          // (see expo-dev-client/plugin/build/getDefaultScheme.js). Worse,
          // `expo start`'s scheme resolver *prefers* any `exp+`-prefixed
          // scheme over our own custom `scheme` field above, so with that
          // scheme duplicated across variants, the dev-client QR code could
          // resolve to whichever installed app the OS picked — often the
          // preview build instead of the dev client.
          //
          // (`slug` can't be varied per environment instead: EAS build
          // requires it to match the slug already registered for
          // extra.eas.projectId.)
          //
          // Only the development build actually needs this scheme for
          // `expo start`'s QR handshake, so it's the only one that
          // registers it.
          addGeneratedScheme: IS_DEV,
        },
      ],
      [
        'expo-splash-screen',
        {
          image: './assets/images/splash-icon.png',
          imageWidth: 200,
          resizeMode: 'contain',
          backgroundColor: '#ffffff',
          dark: {
            backgroundColor: '#000000',
          },
        },
      ],
      [
        'expo-sqlite',
        {
          enableFTS: true,
          useSQLCipher: true,
          android: {
            enableFTS: false,
            useSQLCipher: false,
          },
          ios: {
            customBuildFlags: [
              '-DSQLITE_ENABLE_DBSTAT_VTAB=1 -DSQLITE_ENABLE_SNAPSHOT=1',
            ],
          },
        },
      ],
      [
        'react-native-google-mobile-ads',
        {
          // Google's sample App IDs, used until real AdMob app IDs are issued.
          // Safe to ship with test IDs — no real ads or revenue will be served.
          androidAppId:
            process.env.EXPO_PUBLIC_ADMOB_ANDROID_APP_ID ||
            'ca-app-pub-3940256099942544~3347511713',
          iosAppId:
            process.env.EXPO_PUBLIC_ADMOB_IOS_APP_ID ||
            'ca-app-pub-3940256099942544~1458002511',
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    extra: {
      router: {},
      eas: {
        projectId: 'a1b09294-f1e5-411b-8ba0-a710103aa648',
      },
      appEnv: process.env.APP_ENV || 'production',
    },
    owner: 'rawestmoreland',
    runtimeVersion: {
      policy: 'appVersion',
    },
    updates: {
      url: 'https://u.expo.dev/a1b09294-f1e5-411b-8ba0-a710103aa648',
    },
  },
};
