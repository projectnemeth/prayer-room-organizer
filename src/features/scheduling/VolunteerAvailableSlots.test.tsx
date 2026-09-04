import { fireEvent, render, screen } from '@testing-library/react'
import { VolunteerAvailableSlots } from './VolunteerAvailableSlots'

describe('VolunteerAvailableSlots', () => {
  it('shows aggregate role coverage in a compact serving card without a location', () => {
    const onClaimSlot = vi.fn()
    render(<VolunteerAvailableSlots periodLabel="Welcome, Andrew" onClaimSlot={onClaimSlot} slots={[{
      id: 'shift-1',
      startsAt: '2026-10-01T18:00:00-06:00',
      endsAt: '2026-10-01T19:00:00-06:00',
      label: 'Evening prayer',
      volunteerCount: 4,
      roleCoverage: [
        { role: 'worship_leader', required_count: 1, serving_count: 1 },
        { role: 'worship_team_member', required_count: 3, serving_count: 2 },
      ],
    }]} />)

    expect(screen.getByText('4 volunteers serving at this shift')).toBeInTheDocument()
    expect(screen.getByText('Worship Leader')).toBeInTheDocument()
    expect(screen.getByText('Worship Team Member')).toBeInTheDocument()
    expect(screen.queryByText('Lighthouse Prayer Room')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Serve at this shift' }))
    expect(onClaimSlot).toHaveBeenCalledWith(expect.objectContaining({ id: 'shift-1' }))
  })

  it('keeps an already-claimed shift visible as a scheduled state', () => {
    const onCancelSlot = vi.fn()
    render(<VolunteerAvailableSlots periodLabel="Welcome, Andrew" slots={[{
      id: 'shift-1',
      assignmentId: 'assignment-1',
      startsAt: '2026-10-01T18:00:00-06:00',
      endsAt: '2026-10-01T19:00:00-06:00',
      label: 'Evening prayer',
      volunteerCount: 1,
      roleCoverage: [],
      isScheduled: true,
    }]} onCancelSlot={onCancelSlot} />)

    expect(screen.getByRole('button', { name: 'You are scheduled for this shift' })).toBeDisabled()
    expect(screen.getByText('A coordinator will assign your function.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel this shift' }))
    expect(onCancelSlot).toHaveBeenCalledWith(expect.objectContaining({ id: 'shift-1', assignmentId: 'assignment-1' }))
  })
})
