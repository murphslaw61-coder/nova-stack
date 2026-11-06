// Anchored adaptive banner. Renders nothing until consent + SDK init are done,
// when ads are removed, or when the native module is unavailable.
import React, { useState } from 'react';
import { View } from 'react-native';
import { useAdsStatus, bannerUnitId, BannerModule } from '../services/ads';

export default function AdBanner({ hidden }) {
  const status = useAdsStatus();
  const [failed, setFailed] = useState(false);
  const M = BannerModule();
  const unit = bannerUnitId();
  if (hidden || !M || !unit || !status.ready || !status.canRequestAds || failed) return null;
  return (
    <View style={{ alignItems: 'center', width: '100%' }}>
      <M.BannerAd
        unitId={unit}
        size={M.BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        onAdFailedToLoad={() => {
          setFailed(true);
          setTimeout(() => setFailed(false), 60000); // retry in a minute
        }}
      />
    </View>
  );
}
