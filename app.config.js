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

export default {
  expo: {
    name: `üben${getAppVariant()}`,
    slug: 'uben',
    version: '1.5.0',
    orientation: 'portrait',
    icon: `./assets/images/icon${IS_PREVIEW ? '-preview' : ''}.png`,
    scheme: 'germanpractice',
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
        'react-native-google-mobile-ads',
        {
          androidAppId: 'ca-app-pub-3399938065938082/4693073685',
          iosAppId: 'ca-app-pub-3399938065938082~7320604001',
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
