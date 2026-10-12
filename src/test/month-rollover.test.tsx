import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import { PublicHome } from '../features/public/PublicHome'
import { DailyRhythm } from '../features/public/DailyRhythm'
import { Resources } from '../features/public/Resources'
import { Initiatives } from '../features/public/Initiatives'

afterEach(() => { cleanup(); vi.useRealTimers() })

it.each([
  ['2026-11-01T06:00:00Z', 'Sanctuary Sunday'],
  ['2026-12-01T07:00:00Z', 'Revival Tuesday'],
  ['2027-01-01T07:00:00Z', 'Fullness Friday'],
  ['2027-03-01T07:00:00Z', 'Marketplace Monday'],
  ['2028-03-01T07:00:00Z', 'Awakening Wednesday'],
])('rolls all daily pages into %s without reloading', (midnight, focus) => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(new Date(midnight).getTime() - 1000))
  render(<MemoryRouter><PublicHome /><Resources /><DailyRhythm /><Initiatives /></MemoryRouter>)
  act(() => { vi.advanceTimersByTime(30_000) })
  expect(screen.getAllByTitle('Spotify worship playlist · Day 1')).toHaveLength(2)
  expect(screen.getByRole('combobox')).toHaveValue('1')
  expect(screen.getByRole('heading', { name: "Day 1 · Today's readings" })).toBeInTheDocument()
  expect(screen.getByText(`${focus}:`)).toBeInTheDocument()
  expect(screen.getAllByText('Psalm 3 · Proverbs 1')).toHaveLength(3)
  expect(screen.queryByRole('link', { name: 'Join Live on Zoom' })).not.toBeInTheDocument()
  expect(screen.queryByRole('link', { name: 'Weekly Prayer Signup' })).not.toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'Gather with us' })).toBeInTheDocument()
})

it('keeps a manually selected playlist while the Today marker advances', () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-11-01T05:59:59Z'))
  render(<Resources />)
  fireEvent.change(screen.getByRole('combobox'), { target: { value: '8' } })
  act(() => { vi.advanceTimersByTime(30_000) })
  expect(screen.getByRole('combobox')).toHaveValue('8')
  expect(screen.getByTitle('Spotify worship playlist · Day 8')).toBeInTheDocument()
  expect(screen.getByRole('option', { name: 'Day 1 · Today' })).toBeInTheDocument()
})
