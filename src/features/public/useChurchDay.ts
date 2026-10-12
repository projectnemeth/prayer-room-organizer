import { useEffect, useState } from 'react'
import { getChurchDay } from './church-date'

export function useChurchDay() {
  const [day, setDay] = useState(() => getChurchDay())

  useEffect(() => {
    const refresh = () => {
      const next = getChurchDay()
      setDay((current) => current.dateKey === next.dateKey ? current : next)
    }
    const timer = window.setInterval(refresh, 30_000)
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') refresh()
    }
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [])

  return day
}
