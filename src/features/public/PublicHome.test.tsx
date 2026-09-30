import { act, cleanup, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import { PublicHome } from './PublicHome'

function renderHome() {
  return render(<MemoryRouter><PublicHome /></MemoryRouter>)
}

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('homepage seasonal and evergreen resources', () => {
  it('removes October gathering access at Denver midnight while rotating resources together', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-01T05:59:59Z'))
    renderHome()
    expect(screen.getByRole('heading', { name: 'Sat, Oct 31st' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Join Live on Zoom' })).toHaveAttribute('href', 'https://altar.day/zoom-Oct26')
    expect(screen.getByText(/October 1–30, Monday–Friday/)).toBeInTheDocument()
    expect(screen.getByText(/Day 31 is for catching up/)).toBeInTheDocument()
    expect(screen.getByTitle('Spotify worship playlist · Day 31')).toBeInTheDocument()

    act(() => { vi.advanceTimersByTime(30_000) })
    expect(screen.getByRole('heading', { name: 'Sun, Nov 1st' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Join Live on Zoom' })).not.toBeInTheDocument()
    expect(screen.queryByText(/Mon-Fri •/)).not.toBeInTheDocument()
    expect(screen.queryByText(/October 1–30, Monday–Friday/)).not.toBeInTheDocument()
    expect(screen.getByText('Sanctuary Sunday:')).toBeInTheDocument()
    expect(screen.getByText('Psalms 1–2')).toBeInTheDocument()
    expect(screen.getByText('Psalm 3 · Proverbs 1')).toBeInTheDocument()
    expect(screen.getByTitle('Spotify worship playlist · Day 1')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Apple Music' })).toBeDisabled()
    expect(screen.getByRole('link', { name: 'Spotify' })).toHaveAttribute('href', expect.stringContaining('/2NIAAfjxKAdcVhws9Yb4nT'))
  })

  it.each([
    ['2026-10-05', 'Marketplace', 'Marketplace Monday'],
    ['2026-10-06', 'Revival', 'Revival Tuesday'],
    ['2026-10-07', 'Next Gen', 'Awakening Wednesday'],
    ['2026-10-08', 'Family', 'Family Thursday'],
    ['2026-10-09', 'Israel & Nations', 'Fullness Friday'],
    ['2026-10-10', 'Sabbath', 'Sabbath Saturday'],
    ['2026-10-11', 'The Gathered Church', 'Sanctuary Sunday'],
  ])('shows the focus category and title for %s', (date, category, title) => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(`${date}T18:00:00Z`))
    renderHome()
    const focus = within(screen.getByRole('heading', { name: "Today's Focus" }).closest('article')!)
    expect(focus.getByText(category)).toBeInTheDocument()
    expect(focus.getByText(`${title}:`)).toBeInTheDocument()
    expect(focus.getByRole('link', { name: 'Explore the prayer focuses →' })).toHaveAttribute('href', '/rhythm#weekly-focus')
    expect(screen.getByRole('link', { name: 'Explore the prayers' })).toHaveAttribute('href', '/rhythm#praying-the-scriptures')
  })
})
