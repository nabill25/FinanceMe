// Hanya logo yang benar-benar dipakai (lihat ACCOUNT_PROVIDERS di lib/utils.js) yang diimpor.
// Komponen bawaan 'idn-finlogos/react' memuat ±1.100 logo sekaligus (±9 MB di bundle),
// yang membuat aplikasi sangat lambat dibuka di HP. Tambah provider baru = tambah impor di sini;
// tanpa impor, provider itu tampil sebagai inisial.
import bca from 'idn-finlogos/icons/bca.svg?raw';
import mandiri from 'idn-finlogos/icons/mandiri.svg?raw';
import bni from 'idn-finlogos/icons/bni.svg?raw';
import bri from 'idn-finlogos/icons/bri.svg?raw';
import bsi from 'idn-finlogos/icons/bsi.svg?raw';
import btn from 'idn-finlogos/icons/btn.svg?raw';
import jago from 'idn-finlogos/icons/jago.svg?raw';
import seabank from 'idn-finlogos/icons/seabank.svg?raw';
import jenius from 'idn-finlogos/icons/jenius.svg?raw';
import cimbNiaga from 'idn-finlogos/icons/cimb-niaga.svg?raw';
import danamon from 'idn-finlogos/icons/danamon.svg?raw';
import permata from 'idn-finlogos/icons/permata.svg?raw';
import ocbcNisp from 'idn-finlogos/icons/ocbc-nisp.svg?raw';
import maybank from 'idn-finlogos/icons/maybank.svg?raw';
import paninBank from 'idn-finlogos/icons/panin-bank.svg?raw';
import gopay from 'idn-finlogos/icons/gopay.svg?raw';
import ovo from 'idn-finlogos/icons/ovo.svg?raw';
import shopeepay from 'idn-finlogos/icons/shopeepay.svg?raw';
import dana from 'idn-finlogos/icons/dana.svg?raw';
import linkaja from 'idn-finlogos/icons/linkaja.svg?raw';
import { ACCOUNT_PROVIDERS } from '../lib/utils';
import { Wallet, CreditCard, Smartphone, TrendingUp } from 'lucide-react';

const LOGOS = {
  bca,
  mandiri,
  bni,
  bri,
  bsi,
  btn,
  jago,
  seabank,
  jenius,
  'cimb-niaga': cimbNiaga,
  danamon,
  permata,
  'ocbc-nisp': ocbcNisp,
  maybank,
  'panin-bank': paninBank,
  gopay,
  ovo,
  shopeepay,
  dana,
  linkaja,
};

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

  const logoSvg = provider?.slug ? LOGOS[provider.slug] : null;
  if (logoSvg) {
    return (
      <div
        className={className}
        style={{ ...containerStyle, background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.12)' }}
        title={provider.name}
      >
        <span
          role="img"
          aria-label={provider.name}
          style={{ display: 'inline-block', width: size, height: size }}
          dangerouslySetInnerHTML={{ __html: logoSvg }}
        />
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
