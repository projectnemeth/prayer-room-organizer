import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import { VolunteerSchedule } from './VolunteerSchedule'

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }))

vi.mock('../../lib/supabase', () => ({
  getSupabaseBrowserClient: () => ({ rpc }),
}))

describe('VolunteerSchedule', () => {
  beforeEach(() => {
    rpc.mockReset()
    rpc.mockImplementation((name: string) => {
      if (name === 'list_available_volunteer_shifts') return Promise.resolve({ data: [{ id: 'shift-1', starts_at: '2026-10-01T18:00:00-06:00', ends_at: '2026-10-01T19:00:00-06:00', title: 'Evening prayer', volunteer_count: 0, role_coverage: [] }], error: null })
      if (name === 'list_my_shift_assignments') return Promise.resolve({ data: [], error: null })
      if (name === 'claim_open_shift') return Promise.resolve({ data: { id: 'assignment-1' }, error: null })
      return Promise.resolve({ data: null, error: null })
    })
  })

  it('requires confirmation before claiming a shift', async () => {
    render(<VolunteerSchedule volunteerName="Andrew" />)

    fireEvent.click(await screen.findByRole('button', { name: 'Serve at this shift' }))
    expect(screen.getByRole('dialog')).toHaveTextContent("Are you sure you'd like to sign-up for this shift?")
    expect(rpc).not.toHaveBeenCalledWith('claim_open_shift', expect.anything())

    fireEvent.click(screen.getByRole('button', { name: 'Yes, sign me up' }))
    await waitFor(() => expect(rpc).toHaveBeenCalledWith('claim_open_shift', { p_shift_id: 'shift-1' }))
  })
})
