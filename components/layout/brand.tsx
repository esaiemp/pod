
import Image from 'next/image'
import Link from 'next/link'

type BrandProps = {
  inverted?: boolean
  size?: 'sm' | 'md' | 'mobile' | 'large'
}

export function Brand({
  inverted = false,
  size = 'sm',
}: BrandProps) {
  const widthClass = {
    mobile: 'w-[115px] sm:w-[130px]',
    sm: 'w-[140px]',
    md: 'w-[160px]',
    large: 'w-[180px]',
  }[size]

  return (
    <Link
      href="/"
      aria-label="Daily Spark Tech home"
      className="inline-flex shrink-0 items-center"
    >
      <Image
        src={
          inverted
            ? '/images/daily-spark-logo.png'
            : '/images/daily-spark-logo-dark.png'
        }
        alt="Daily Spark Tech"
        width={220}
        height={110}
        className={`block h-auto max-w-full object-contain ${widthClass}`}
        priority
      />
    </Link>
  )
}
