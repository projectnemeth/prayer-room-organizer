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
    return () => window.clearInterval(timer)
  }, [])

  return day
}
