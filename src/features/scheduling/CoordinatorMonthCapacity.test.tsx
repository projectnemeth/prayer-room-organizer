import { fireEvent, render, screen } from '@testing-library/react'
import { CoordinatorMonthCapacity } from './CoordinatorMonthCapacity'

describe('CoordinatorMonthCapacity', () => {
  it('renders month navigation and triggers callbacks', () => {
    const onPreviousMonth = vi.fn()
    const onNextMonth = vi.fn()
    const onToday = vi.fn()

    render(<CoordinatorMonthCapacity monthLabel="October 2026" days={[]} onPreviousMonth={onPreviousMonth} onNextMonth={onNextMonth} onToday={onToday} />)

    expect(screen.getByText('October 2026 · America/Denver')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Previous month' }))
    fireEvent.click(screen.getByRole('button', { name: 'Current month' }))
    fireEvent.click(screen.getByRole('button', { name: 'Next month' }))

    expect(onPreviousMonth).toHaveBeenCalledTimes(1)
    expect(onToday).toHaveBeenCalledTimes(1)
    expect(onNextMonth).toHaveBeenCalledTimes(1)
  })

  it('opens a shift when its card is selected', () => {
    const onSelectSlot = vi.fn()
    render(<CoordinatorMonthCapacity monthLabel="October 2026" onSelectSlot={onSelectSlot} days={[{ id: '2026-10-01', label: 'Thu', dateLabel: 'Oct 1', slots: [{ id: 'shift-1', startsAt: '2026-10-01T22:30:00Z', endsAt: '2026-10-01T23:30:00Z', label: 'Evening Altar', capacity: 1, assignedCount: 0 }] }]} />)

    fireEvent.click(screen.getByRole('button', { name: /Evening Altar/ }))

    expect(onSelectSlot).toHaveBeenCalledWith(expect.objectContaining({ id: 'shift-1' }))
  })
})
