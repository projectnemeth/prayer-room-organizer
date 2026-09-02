import { fireEvent, render, screen } from '@testing-library/react'
import { CoordinationOverview } from './CoordinationOverview'
import type { CoordinationOverviewData } from './types'

describe('CoordinationOverview', () => {
  const mockData: CoordinationOverviewData = {
    periodLabel: 'Sep 2–Sep 8, 2026',
    upcomingGatherings: 5,
    openVolunteerSlots: 2,
    scheduledVolunteerSlots: 8,
    pendingInterests: 1,
    attentionItems: [
      {
        id: '1',
        title: 'Open slots in Oct',
        description: 'Need volunteers for October rhythm',
        severity: 'needs-attention',
      },
    ],
  }

  it('renders period label and metrics', () => {
    render(<CoordinationOverview data={mockData} />)
    expect(screen.getByText('Sep 2–Sep 8, 2026')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('Upcoming gatherings')).toBeInTheDocument()
  })

  it('renders date navigation buttons and triggers callbacks', () => {
    const onPreviousPeriod = vi.fn()
    const onNextPeriod = vi.fn()
    const onToday = vi.fn()

    render(
      <CoordinationOverview
        data={mockData}
        onPreviousPeriod={onPreviousPeriod}
        onNextPeriod={onNextPeriod}
        onToday={onToday}
      />,
    )

    const prevBtn = screen.getByRole('button', { name: 'Previous 7 days' })
    const todayBtn = screen.getByRole('button', { name: 'Current 7 days' })
    const nextBtn = screen.getByRole('button', { name: 'Next 7 days' })

    expect(prevBtn).toBeInTheDocument()
    expect(todayBtn).toBeInTheDocument()
    expect(nextBtn).toBeInTheDocument()

    fireEvent.click(prevBtn)
    expect(onPreviousPeriod).toHaveBeenCalledTimes(1)

    fireEvent.click(todayBtn)
    expect(onToday).toHaveBeenCalledTimes(1)

    fireEvent.click(nextBtn)
    expect(onNextPeriod).toHaveBeenCalledTimes(1)
  })
})
