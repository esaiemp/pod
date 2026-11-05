import Link from 'next/link'
import { Sparkles } from 'lucide-react'

export function Brand({ inverted = false, size = 'default' }: { inverted?: boolean; size?: 'default' | 'large' }) {
  const iconSize = size === 'large' ? 'size-11' : 'size-9'

  return (
    <Link href="/" className="inline-flex items-center gap-3" aria-label="DailySpark Tech home">
      <span className={`grid ${iconSize} place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm`}>
        <Sparkles aria-hidden="true" className={size === 'large' ? 'size-5' : 'size-4'} />
      </span>
      <span className="flex flex-col leading-none">
        <span className={`font-semibold tracking-tight ${size === 'large' ? 'text-xl' : 'text-base'} ${inverted ? 'text-white' : 'text-slate-950'}`}>
          DailySpark
        </span>
        <span className={`mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${inverted ? 'text-slate-300' : 'text-muted-foreground'}`}>
          Tech
        </span>
      </span>
    </Link>
  )
}
