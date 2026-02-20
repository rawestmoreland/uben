import en from '@/locales/en.json';
import it from '@/locales/it.json';
import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// eslint-disable-next-line import/no-named-as-default-member
i18n.use(initReactI18next).init({
  lng: getLocales()[0]?.languageTag ?? 'en',
  fallbackLng: 'en',
  resources: { en, it },
  ns: ['app', 'categories', 'settings'],
  defaultNS: 'app',
  interpolation: { escapeValue: false },
});

export default i18n;
