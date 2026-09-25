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

// Determine slug suffix. This is the actual fix for the QR-opens-wrong-build
// issue: expo-dev-client's config plugin always registers an `exp+<slug>`
// scheme (see expo-dev-client/plugin/build/getDefaultScheme.js), and `expo
// start`'s scheme resolver *prefers* any `exp+`-prefixed scheme over our own
// custom `scheme` above (see @expo/cli's utils/scheme.js,
// resolveExpoOrLongestScheme). Since `expo-dev-client` is a normal dependency
// installed in every build profile, every variant registers `exp+uben`
// unless the slug itself is varied — the custom scheme suffix alone can't
// fix this, because the CLI never even looks at it once an exp+ scheme
// exists.
const getSlugSuffix = () => {
  if (IS_DEV) return '-dev';
  if (IS_PREVIEW) return '-preview';
  return ''; // Production: uben
};

export default {
  expo: {
    name: `üben${getAppVariant()}`,
    slug: `uben${getSlugSuffix()}`,
    version: '1.8.0',
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
