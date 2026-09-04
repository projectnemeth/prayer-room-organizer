import { render, screen } from '@testing-library/react'
import { VolunteerAssignments } from './VolunteerAssignments'

describe('VolunteerAssignments', () => {
  it('shows the roles for each scheduled date and time', () => {
    render(<VolunteerAssignments assignments={[{ id: 'a1', startsAt: '2026-10-05T18:00:00Z', endsAt: '2026-10-05T19:00:00Z', title: 'Evening prayer', status: 'assigned', roles: ['prayer_leader', 'host'] }]} />)

    expect(screen.getByText('Serving as: Prayer Leader · Host')).toBeInTheDocument()
    expect(screen.getByText('Evening prayer')).toBeInTheDocument()
  })

  it('lets a volunteer accept or decline a pending invitation', () => {
    const onRespond = vi.fn()
    render(<VolunteerAssignments assignments={[{ id: 'a2', startsAt: '2026-10-06T18:00:00Z', endsAt: '2026-10-06T19:00:00Z', title: 'Morning prayer', status: 'pending', roles: ['host'] }]} onRespondToInvitation={onRespond} />)

    screen.getByRole('button', { name: 'Accept invitation' }).click()
    screen.getByRole('button', { name: 'Decline' }).click()
    expect(onRespond).toHaveBeenNthCalledWith(1, 'a2', 'accepted')
    expect(onRespond).toHaveBeenNthCalledWith(2, 'a2', 'declined')
  })

  it('shows instructions only for the roles assigned to the volunteer', () => {
    render(<VolunteerAssignments assignments={[{ id: 'a3', startsAt: '2026-10-07T18:00:00Z', endsAt: '2026-10-07T19:00:00Z', title: 'Prayer set', status: 'assigned', roles: ['tech_director'], roleInstructions: { tech_director: 'Arrive 15 minutes early to prepare sound.' } }]} />)

    expect(screen.getByText('Tech Director')).toBeInTheDocument()
    expect(screen.getByText('Arrive 15 minutes early to prepare sound.')).toBeInTheDocument()
  })

  it('marks a self-claimed shift as awaiting a coordinator role assignment', () => {
    render(<VolunteerAssignments assignments={[{ id: 'a4', startsAt: '2026-10-08T18:00:00Z', endsAt: '2026-10-08T19:00:00Z', title: 'Prayer set', status: 'assigned', roles: [] }]} />)

    expect(screen.getByText('Role assignment pending')).toBeInTheDocument()
  })
})
