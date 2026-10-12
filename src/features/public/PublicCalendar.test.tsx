import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { PublicCalendar } from './PublicCalendar'
import { mockPublicGatherings } from './mock-data'
import { vi } from 'vitest'

const { from } = vi.hoisted(() => ({ from: vi.fn() }))
vi.mock('../../lib/supabase', () => ({ getSupabaseBrowserClient: () => ({ from }) }))
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-10-01T18:00:00Z'))
  from.mockReturnValue({ select: () => ({ order: () => Promise.resolve({ data: [{
    id: 'oct-event', title: 'October gathering', starts_at: '2026-10-01T12:30:00Z', ends_at: '2026-10-01T13:30:00Z',
    description: '', location_label: 'Prayer Room', participation_format: 'hybrid', public_url: null,
  }], error: null }) }) })
})
afterEach(() => { cleanup(); vi.useRealTimers() })

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


it('opens the current month even when the database contains only October events', async () => {
  vi.setSystemTime(new Date('2026-11-15T18:00:00Z'))
  render(<PublicCalendar />)
  await act(async () => {})
  expect(from).toHaveBeenCalledWith('public_events')
  expect(screen.getByRole('heading', { name: 'November 2026' })).toBeInTheDocument()
  expect(screen.getByText('No gatherings have been published for this month. Please check back soon.')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Previous month' }))
  expect(screen.getAllByText('October gathering').length).toBeGreaterThan(0)
  fireEvent.click(screen.getByRole('button', { name: 'Today' }))
  expect(screen.getByRole('heading', { name: 'November 2026' })).toBeInTheDocument()
})

it('places a November morning in the correct mobile and desktop day, regardless of browser zone', () => {
  vi.setSystemTime(new Date('2026-11-02T18:00:00Z'))
  render(<PublicCalendar gatherings={[{
    id: 'nov-event', title: 'November morning', kind: 'morning', locationType: 'hybrid',
    startsAt: '2026-11-02T13:30:00Z', endsAt: '2026-11-02T14:30:00Z', description: '', locationLabel: 'Prayer Room',
  }]} />)
  const events = screen.getAllByText('November morning')
  expect(events[0].closest('section')).toHaveTextContent('Mon, Nov 2')
  expect(events[0].closest('section')).toHaveTextContent('6:30 AM')
  expect(events[1].closest('section')?.querySelector('p')).toHaveTextContent('2')
  fireEvent.click(screen.getByRole('button', { name: 'Week' }))
  expect(screen.getByRole('heading', { name: 'Nov 1–Nov 7, 2026' })).toBeInTheDocument()
  for (const event of screen.getAllByText('November morning')) expect(event.closest('section')).toHaveTextContent('Mon, Nov 2')
})

it('advances current views across midnight and preserves deliberate browsing until Today', () => {
  vi.useRealTimers()
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-11-01T05:59:59Z'))
  render(<PublicCalendar gatherings={mockPublicGatherings} />)
  act(() => { vi.advanceTimersByTime(30_000) })
  expect(screen.getByRole('heading', { name: 'November 2026' })).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Previous month' }))
  vi.setSystemTime(new Date('2026-12-01T18:00:00Z'))
  act(() => { window.dispatchEvent(new Event('focus')) })
  expect(screen.getByRole('heading', { name: 'October 2026' })).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Today' }))
  expect(screen.getByRole('heading', { name: 'December 2026' })).toBeInTheDocument()
})

it.each([
  ['2027-02-01', 28], ['2028-02-01', 29], ['2026-11-01', 30], ['2026-12-01', 31],
])('renders the actual days of %s', (date, count) => {
  vi.setSystemTime(new Date(`${date}T18:00:00Z`))
  const { container } = render(<PublicCalendar gatherings={[]} />)
  expect(container.querySelectorAll('.md\\:hidden section')).toHaveLength(count)
})
