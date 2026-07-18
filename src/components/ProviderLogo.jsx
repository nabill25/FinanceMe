import Logo from 'idn-finlogos/react';
import { ACCOUNT_PROVIDERS, ACCOUNT_TYPES } from '../lib/utils';
import { Wallet, CreditCard, Smartphone, TrendingUp } from 'lucide-react';

const FALLBACK_ICONS = {
  cash: Wallet,
  bank: CreditCard,
  ewallet: Smartphone,
  investment: TrendingUp,
};

/**
 * Shows the real bank/ewallet logo, or a fallback icon/initials
 * @param {{ account: object, size?: number, className?: string }} props
 */
export default function ProviderLogo({ account, size = 32, className = '' }) {
  const provider = ACCOUNT_PROVIDERS[account?.type]?.find(p => p.id === account?.icon);
  const FallbackIcon = FALLBACK_ICONS[account?.type] || Wallet;

  const containerStyle = {
    width: size + 8,
    height: size + 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '50%',
    overflow: 'hidden',
    flexShrink: 0,
  };

  if (provider?.slug) {
    return (
      <div
        className={className}
        style={{ ...containerStyle, background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.12)' }}
        title={provider.name}
      >
        <Logo slug={provider.slug} size={size} title={provider.name} />
      </div>
    );
  }

  if (provider) {
    // Named provider but no logo — show colored initials
    return (
      <div
        className={className}
        style={{
          ...containerStyle,
          background: (account.color || provider.color) + '22',
          color: account.color || provider.color,
        }}
        title={provider.name}
      >
        <span style={{ fontSize: Math.max(10, size * 0.38), fontWeight: 800, letterSpacing: '-0.5px' }}>
          {provider.name.substring(0, 3).toUpperCase()}
        </span>
      </div>
    );
  }

  // Generic fallback icon for cash/investment
  return (
    <div
      className={className}
      style={{
        ...containerStyle,
        background: (account?.color || '#6b7280') + '22',
        color: account?.color || '#6b7280',
      }}
    >
      <FallbackIcon size={size * 0.6} />
    </div>
  );
}
