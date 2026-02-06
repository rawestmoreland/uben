import { NativeTabs, Icon, Label } from 'expo-router/unstable-native-tabs';

export default function TabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Label>Practice</Label>
        <Icon sf={{ default: 'book', selected: 'book.fill' }} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="explore">
        <Label>About</Label>
        <Icon sf={{ default: 'info.circle', selected: 'info.circle.fill' }} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <Label>Settings</Label>
        <Icon sf={{ default: 'gearshape', selected: 'gearshape.fill' }} />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
