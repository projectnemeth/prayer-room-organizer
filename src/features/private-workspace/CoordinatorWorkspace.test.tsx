import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { vi } from 'vitest'
import type { ShiftRole } from '../scheduling'
import { CoordinatorWorkspace } from './CoordinatorWorkspace'

const { from, rpc } = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn() }))

vi.mock('../../lib/supabase', () => ({
  getSupabaseBrowserClient: () => ({ from, rpc }),
  inviteVolunteer: vi.fn(),
  inviteVolunteerFromInterest: vi.fn(),
  VolunteerInvitationError: class VolunteerInvitationError extends Error {},
}))

const shift = {
  id: 'shift-1',
  starts_at: '2026-09-04T18:00:00-06:00',
  ends_at: '2026-09-04T19:00:00-06:00',
  required_volunteers: 5,
  volunteer_count: 1,
  unassigned_claim_count: 1,
  pending_count: 0,
  status: 'scheduled',
  title: 'Evening Altar',
  role_requirements: [],
  role_coverage: [],
  assignments: [{ assignment_id: 'assignment-1', profile_id: 'volunteer-1', display_name: 'Andrew TEST', email: 'projectnemeth@gmail.com', assignment_status: 'assigned', roles: [] as ShiftRole[] }],
  is_public: false,
  public_description: null,
  location_label: null,
  participation_format: null,
  public_url: null,
}

describe('CoordinatorWorkspace', () => {
  beforeEach(() => {
    from.mockReset()
    rpc.mockReset()
    shift.assignments[0].roles = []
    from.mockReturnValue({ select: () => ({ in: () => ({ order: () => Promise.resolve({ data: [], error: null }) }) }) })
    rpc.mockImplementation((name: string, args?: { p_roles?: ShiftRole[] }) => {
      if (name === 'list_coordinator_schedule') return Promise.resolve({ data: [shift], error: null })
      if (name === 'list_active_volunteers_for_assignment') return Promise.resolve({ data: [], error: null })
      if (name === 'coordinator_set_assignment_roles') { shift.assignments[0].roles = args?.p_roles ?? []; return Promise.resolve({ data: args?.p_roles ?? [], error: null }) }
      return Promise.resolve({ data: null, error: null })
    })
  })

  it('opens a selected shift in a modal and gives role-save feedback for its claimant', async () => {
    render(<CoordinatorWorkspace currentProfileId="coordinator-1" currentRole="coordinator" initialView="schedule" />)

    fireEvent.click(await screen.findByRole('button', { name: /Evening Altar/ }))
    const dialog = screen.getByRole('dialog', { name: 'Evening Altar' })
    expect(dialog).toHaveTextContent('Volunteer coverage')
    expect(dialog).toHaveTextContent('Andrew TEST')
    expect(dialog).toHaveTextContent('1 serving · 1 needs a role')

    const claimCard = screen.getByText('Andrew TEST').closest('li')
    expect(claimCard).not.toBeNull()
    fireEvent.click(within(claimCard as HTMLElement).getByLabelText('Worship Leader'))
    fireEvent.click(within(claimCard as HTMLElement).getByRole('button', { name: 'Save roles' }))

    await waitFor(() => expect(rpc).toHaveBeenCalledWith('coordinator_set_assignment_roles', { p_assignment_id: 'assignment-1', p_roles: ['worship_leader'] }))
    await waitFor(() => expect(within(claimCard as HTMLElement).getByRole('button', { name: 'Role(s) saved' })).toBeDisabled())
    fireEvent.click(within(claimCard as HTMLElement).getByLabelText('Host'))
    expect(within(claimCard as HTMLElement).getByRole('button', { name: 'Update role(s)' })).toBeEnabled()
  })
})
