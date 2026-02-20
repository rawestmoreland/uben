import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import en from '@/locales/en.json';
import it from '@/locales/it.json';

i18n.use(initReactI18next).init({
  lng: getLocales()[0]?.languageTag ?? 'en',
  fallbackLng: 'en',
  resources: { en, it },
  defaultNS: 'app',
  interpolation: { escapeValue: false },
});

export default i18n;
