import { fireEvent, render, screen } from '@testing-library/react'
import { PublicCalendar } from './PublicCalendar'
import { mockPublicGatherings } from './mock-data'

describe('PublicCalendar', () => {
  it('presents the weekday Altar rhythm in a switchable calendar', () => {
    render(<PublicCalendar gatherings={mockPublicGatherings} />)

    expect(screen.getByRole('heading', { name: 'October 2026' })).toBeInTheDocument()
    expect(screen.getAllByText('Morning Altar').length).toBeGreaterThan(20)
    expect(screen.getAllByText('Evening Altar').length).toBeGreaterThan(20)
    expect(mockPublicGatherings.filter((gathering) => gathering.kind === 'evening')).toHaveLength(22)
    expect(mockPublicGatherings.every((gathering) => gathering.kind !== 'evening' || (
      gathering.startsAt.endsWith('T17:00:00-06:00') &&
      gathering.endsAt.endsWith('T18:00:00-06:00') &&
      !gathering.timeLabel
    ))).toBe(true)
    expect(screen.queryByText('Time to be announced')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Week' }))

    expect(screen.getByRole('heading', { name: 'Sep 27–Oct 3, 2026' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Previous week' })).toBeVisible()
  })
})
