import { fireEvent, render, screen } from '@testing-library/react'
import { CoordinatorWeekCapacity } from './CoordinatorWeekCapacity'

describe('CoordinatorWeekCapacity', () => {
  it('renders week navigation buttons and triggers callbacks', () => {
    const onPreviousWeek = vi.fn()
    const onNextWeek = vi.fn()
    const onToday = vi.fn()

    render(
      <CoordinatorWeekCapacity
        weekLabel="Oct 4–Oct 10, 2026"
        days={[]}
        onPreviousWeek={onPreviousWeek}
        onNextWeek={onNextWeek}
        onToday={onToday}
      />,
    )

    expect(screen.getByText('Oct 4–Oct 10, 2026 · America/Denver')).toBeInTheDocument()

    const prevBtn = screen.getByRole('button', { name: 'Previous week' })
    const todayBtn = screen.getByRole('button', { name: 'Current week' })
    const nextBtn = screen.getByRole('button', { name: 'Next week' })

    fireEvent.click(prevBtn)
    expect(onPreviousWeek).toHaveBeenCalledTimes(1)

    fireEvent.click(todayBtn)
    expect(onToday).toHaveBeenCalledTimes(1)

    fireEvent.click(nextBtn)
    expect(onNextWeek).toHaveBeenCalledTimes(1)
  })

  it('counts a pending invitation as reserved capacity without calling it covered', () => {
    render(
      <CoordinatorWeekCapacity
        weekLabel="Oct 4–Oct 10, 2026"
        days={[{
          id: '2026-10-04',
          label: 'Sun',
          dateLabel: 'Oct 4',
          slots: [{
            id: 'shift-1',
            startsAt: '2026-10-04T18:00:00Z',
            endsAt: '2026-10-04T19:00:00Z',
            label: 'Evening Altar',
            capacity: 2,
            assignedCount: 0,
            pendingCount: 1,
          }],
        }]}
      />,
    )

    expect(screen.getByText('0 of 2 role openings covered; 1 invitation pending')).toBeInTheDocument()
    expect(screen.getByText('1 invitation pending')).toBeInTheDocument()
    expect(screen.getByText('Open coverage').parentElement).toHaveTextContent('Open coverage1')
  })
})
