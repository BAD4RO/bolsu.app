import Image from 'next/image';
import { cn } from '@/lib/utils';
export function Brand({ size = 'small', wordmark = true, className }: { size?: 'small' | 'large'; wordmark?: boolean; className?: string }) {
  return <div className={cn('brand', `brand--${size}`, className)}>
    <Image src="/brand-mark.svg" alt={wordmark ? '' : 'BOLSUAPP'} width={120} height={132} className="brand__mark" priority={size === 'large'}/>
    {wordmark && <span className="brand__name" aria-label="BOLSUAPP"><span>BOLSU</span><span>APP</span></span>}
  </div>;
}
export function BrandSplash({ children }: { children?: React.ReactNode }) {
  return <div className="brand-splash"><div className="brand-splash__center"><Brand size="large"/></div><div className="brand-splash__bottom"><p className="brand-manifesto">Organize<br/>Planeje<br/>Conquiste</p>{children}</div></div>;
}
