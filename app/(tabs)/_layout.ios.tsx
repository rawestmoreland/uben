import { Icon, Label, NativeTabs } from 'expo-router/unstable-native-tabs';
import { useTranslation } from 'react-i18next';

export default function TabLayout() {
  const { t } = useTranslation('app');
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Label>{t('practice')}</Label>
        <Icon sf={{ default: 'book', selected: 'book.fill' }} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="explore">
        <Label>{t('about')}</Label>
        <Icon sf={{ default: 'info.circle', selected: 'info.circle.fill' }} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <Label>{t('settings_title')}</Label>
        <Icon sf={{ default: 'gearshape', selected: 'gearshape.fill' }} />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
