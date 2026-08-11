import { AD_UNIT_IDS } from '@/constants/ads';
import { AppColors, Layout, Spacing } from '@/constants/design';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';

/**
 * Neo-brutalist bordered banner ad slot.
 *
 * Uses a fixed BANNER size (320x50) rather than an adaptive size — adaptive
 * banners size themselves to the full device width for edge-to-edge
 * placement, which overflows this app's padded, bordered card layout.
 *
 * Renders nothing until an ad actually loads (and nothing again if it fails
 * to load, e.g. offline) so a failed/slow fetch never leaves an empty
 * bordered box on screen.
 */
export function AdBanner() {
  const [hasLoaded, setHasLoaded] = useState(false);
  const [hasFailed, setHasFailed] = useState(false);

  if (hasFailed) return null;

  return (
    <View style={[styles.container, !hasLoaded && styles.hidden]}>
      <BannerAd
        unitId={AD_UNIT_IDS.banner}
        size={BannerAdSize.BANNER}
        onAdLoaded={() => setHasLoaded(true)}
        onAdFailedToLoad={(error) => {
          console.warn('[Ads] Banner failed to load:', error);
          setHasFailed(true);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    borderWidth: Layout.borderWidth,
    borderColor: AppColors.black,
    backgroundColor: AppColors.white,
    padding: Spacing.xs,
  },
  hidden: {
    // Ad view still needs to be mounted to load, but stays invisible and
    // takes up no layout space until it actually has content to show.
    position: 'absolute',
    opacity: 0,
    height: 0,
    borderWidth: 0,
    padding: 0,
    overflow: 'hidden',
  },
});
