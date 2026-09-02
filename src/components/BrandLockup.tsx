import { Link } from 'react-router-dom'

export function LogoMark({ className = 'h-5 w-16' }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 72 20">
      <path d="M4 10H68" stroke="currentColor" strokeLinecap="round" strokeOpacity="0.75" />
      <circle cx="4" cy="10" fill="currentColor" r="2.5" />
      <circle cx="36" cy="10" fill="none" r="3.25" stroke="currentColor" strokeOpacity="0.75" />
      <circle cx="68" cy="10" fill="currentColor" r="2.5" />
    </svg>
  )
}

export function BrandLockup({ asLink = true }: { asLink?: boolean }) {
  const content = (
    <span className="inline-flex min-w-0 items-center gap-3 text-altar-teal">
      <LogoMark className="h-5 w-16 shrink-0" />
      <span className="font-display text-lg leading-tight tracking-[0.08em] sm:text-xl">THE ALTAR INITIATIVE</span>
    </span>
  )

  return asLink ? <Link to="/">{content}</Link> : content
}
