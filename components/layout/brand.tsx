import Image from 'next/image'
import Link from 'next/link'

type BrandProps = {
  inverted?: boolean
  size?: 'sm' | 'md'
}

export function Brand({ inverted = false, size = 'sm' }: BrandProps) {
  const widthClass = size === 'md' ? 'w-[160px]' : 'w-[140px]'

  return (
    <Link href="/" aria-label="Daily Spark Tech home" className="inline-flex items-center">
      <Image
        src={
          inverted
            ? '/images/daily-spark-logo.png'
            : '/images/daily-spark-logo-dark.png'
        }
        alt="Daily Spark Tech"
        width={220}
        height={110}
        className={`h-auto object-contain ${widthClass}`}
        priority
      />
    </Link>
  )
}