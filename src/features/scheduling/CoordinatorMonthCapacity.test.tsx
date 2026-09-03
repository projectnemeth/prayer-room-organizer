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
})
