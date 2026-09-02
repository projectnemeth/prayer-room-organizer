import type { VolunteerAssignmentsProps } from './types'

const churchTimeZone = 'America/Denver'
function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: churchTimeZone }).format(new Date(value))
}

/** A volunteer's own assignment projection. It contains no other person's schedule. */
export function VolunteerAssignments({ assignments }: VolunteerAssignmentsProps) {
  return <section aria-labelledby="my-assignments-heading" className="mx-auto max-w-4xl px-6 pt-12 sm:px-10 lg:px-16">
    <div className="border-t border-altar-sage/30 pt-8"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-altar-teal">Your private schedule</p><h2 className="mt-3 font-display text-3xl text-altar-teal" id="my-assignments-heading">Your upcoming assignments</h2>
      {assignments.length ? <ul className="mt-5 divide-y divide-altar-sage/25 border-y border-altar-sage/25">{assignments.map((assignment) => <li className="grid gap-2 py-5 sm:grid-cols-[12rem_1fr]" key={assignment.id}><p className="text-sm font-semibold text-altar-teal">{formatDateTime(assignment.startsAt)}</p><div><h3 className="font-display text-xl text-altar-ink">{assignment.title}</h3>{assignment.locationLabel ? <p className="mt-1 text-sm text-altar-ink/70">{assignment.locationLabel}</p> : null}{assignment.instructions ? <p className="mt-2 text-sm leading-6 text-altar-ink/75">{assignment.instructions}</p> : null}<p className="mt-2 text-xs font-semibold uppercase tracking-[0.12em] text-altar-sage">{assignment.status === 'absence_requested' ? 'Absence requested' : assignment.status === 'confirmed' ? 'Confirmed' : 'Scheduled'}</p></div></li>)}</ul> : <p className="mt-5 border-l-2 border-altar-stone bg-white/45 p-4 text-sm leading-6 text-altar-ink/70">You do not have any upcoming assignments yet. Open opportunities are listed below.</p>}</div>
  </section>
}
