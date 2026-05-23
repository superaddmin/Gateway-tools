import { useTranslation } from 'react-i18next';
import { useTopRightAdStore } from '../stores/useTopRightAdStore';

interface TopCenterPromoBannerProps {
  reserveWhenEmpty?: boolean;
}

export function TopCenterPromoBanner({ reserveWhenEmpty = true }: TopCenterPromoBannerProps) {
  const { t } = useTranslation();
  const ad = useTopRightAdStore((state) => state.state.ad);

  if (!ad) {
    return reserveWhenEmpty ? <div className="global-promo-center global-promo-center-placeholder" aria-hidden="true" /> : null;
  }

  return (
    <div
      className="global-promo-center"
      role="complementary"
      aria-label={t('common.topRightAd.ariaLabel', '全局右上角广告位')}
    >
      <div className="global-promo-slot">
        <span className="global-ad-slot-badge">
          {ad.badge || t('common.topRightAd.badge', '广告')}
        </span>
        <div className="global-promo-main">
          <p className="global-promo-text">{ad.text}</p>
        </div>
      </div>
    </div>
  );
}
