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
})
