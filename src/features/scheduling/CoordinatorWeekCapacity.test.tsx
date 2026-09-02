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
})
