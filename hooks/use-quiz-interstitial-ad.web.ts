/** AdMob isn't supported on web; quiz sessions there never show an interstitial. */
export function useQuizInterstitialAd() {
  const maybeShowInterstitial = async () => {};
  return { maybeShowInterstitial };
}
