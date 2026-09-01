import { fireEvent, render, screen } from '@testing-library/react'
import { PublicCalendar } from './PublicCalendar'

describe('PublicCalendar', () => {
  it('presents the weekday Altar rhythm in a switchable calendar', () => {
    render(<PublicCalendar />)

    expect(screen.getByRole('heading', { name: 'October 2026' })).toBeInTheDocument()
    expect(screen.getAllByText('Morning Altar').length).toBeGreaterThan(20)
    expect(screen.getAllByText('Evening Altar').length).toBeGreaterThan(20)

    fireEvent.click(screen.getByRole('button', { name: 'Week' }))

    expect(screen.getByRole('heading', { name: 'Sep 27–Oct 3, 2026' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Previous week' })).toBeVisible()
  })
})
