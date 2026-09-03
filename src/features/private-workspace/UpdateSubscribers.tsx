import { useEffect, useState } from 'react'
import { getSupabaseBrowserClient } from '../../lib/supabase'

interface UpdateSubscriberRow {
  subscriber_name: string | null
  email: string
  confirmed_at: string
}

function formatConfirmationDate(value: string) {
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date(value))
}

function csvCell(value: string) {
  return `"${value.replaceAll('"', '""')}"`
}

function downloadSubscribers(subscribers: UpdateSubscriberRow[]) {
  const content = [
    ['Name', 'Email', 'Confirmed on'],
    ...subscribers.map((subscriber) => [subscriber.subscriber_name ?? '', subscriber.email, subscriber.confirmed_at]),
  ].map((row) => row.map(csvCell).join(',')).join('\n')
  const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = 'altar-initiative-confirmed-update-subscribers.csv'
  link.click()
  URL.revokeObjectURL(url)
}

/** An administrator-only list returned by a narrow database function. */
export function UpdateSubscribers() {
  const [subscribers, setSubscribers] = useState<UpdateSubscriberRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    async function load() {
      const { data, error: requestError } = await getSupabaseBrowserClient().rpc('list_confirmed_update_subscribers')
      if (!active) return
      if (requestError) {
        setError('Update subscribers could not be loaded. Please refresh and try again.')
      } else {
        setSubscribers((data ?? []) as UpdateSubscriberRow[])
      }
      setIsLoading(false)
    }
    void load()
    return () => { active = false }
  }, [])

  return (
    <section className="mx-auto max-w-6xl bg-white/45 p-6 sm:p-8" aria-labelledby="update-subscribers-heading">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-altar-teal">Administrator workspace</p>
      <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-3xl text-altar-ink" id="update-subscribers-heading">Email updates</h2>
          <p className="mt-3 max-w-3xl leading-7 text-altar-ink/75">Confirmed subscribers only. People who have not confirmed or who unsubscribed are not included.</p>
        </div>
        <button className="button-primary" disabled={isLoading || subscribers.length === 0} onClick={() => downloadSubscribers(subscribers)} type="button">Download confirmed list</button>
      </div>
      {error ? <p className="mt-6 border-l-2 border-altar-gold bg-white/55 p-4 text-sm" role="alert">{error}</p> : null}
      {isLoading ? <p aria-live="polite" className="mt-7 text-sm text-altar-sage">Loading confirmed subscribers…</p> : null}
      {!isLoading && !error && subscribers.length === 0 ? <p className="mt-7 border-l-2 border-altar-gold bg-white/55 p-4 text-sm leading-6 text-altar-ink/75">No confirmed email-update subscribers yet.</p> : null}
      {!isLoading && !error && subscribers.length > 0 ? <div className="mt-7 overflow-x-auto"><table className="min-w-full border-collapse text-left text-sm"><thead><tr className="border-b border-altar-sage/30 text-altar-sage"><th className="px-3 py-3 font-semibold">Name</th><th className="px-3 py-3 font-semibold">Email</th><th className="px-3 py-3 font-semibold">Confirmed</th></tr></thead><tbody>{subscribers.map((subscriber) => <tr className="border-b border-altar-sage/20" key={subscriber.email}><td className="px-3 py-4 font-semibold text-altar-ink">{subscriber.subscriber_name || 'Name not provided'}</td><td className="px-3 py-4 text-altar-ink/75"><a className="focus-ring rounded-sm underline decoration-altar-gold decoration-2 underline-offset-4" href={`mailto:${subscriber.email}`}>{subscriber.email}</a></td><td className="px-3 py-4 text-altar-ink/75">{formatConfirmationDate(subscriber.confirmed_at)}</td></tr>)}</tbody></table></div> : null}
    </section>
  )
}
