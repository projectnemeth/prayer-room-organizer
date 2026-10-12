import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
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

beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-09-04T12:00:00-06:00'))
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

afterEach(() => { cleanup(); vi.useRealTimers() })

describe('CoordinatorWorkspace', () => {

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

it('loads all November days with Denver midnight boundaries across daylight saving', async () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-11-15T18:00:00Z'))
  render(<CoordinatorWorkspace currentProfileId="coordinator-1" currentRole="coordinator" initialView="monthly" />)
  await waitFor(() => expect(rpc).toHaveBeenCalledWith('list_coordinator_schedule', {
    p_starts_at: '2026-11-01T06:00:00.000Z', p_ends_at: '2026-12-01T07:00:00.000Z',
  }))
  expect(screen.getByText('November 2026 · America/Denver')).toBeInTheDocument()
  expect(screen.getAllByRole('button', { name: /Add shift/ })).toHaveLength(30)
  const firstDay = screen.getAllByRole('button', { name: /Add shift/ })[0].closest('section')!
  expect(firstDay).toHaveTextContent('Sun')
  expect(firstDay).toHaveTextContent('Nov 1')
})

it('creates a shift using the selected Denver date and saves Denver time from any browser', async () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-11-15T18:00:00Z'))
  render(<CoordinatorWorkspace currentProfileId="coordinator-1" currentRole="coordinator" initialView="monthly" />)
  const addButtons = await screen.findAllByRole('button', { name: /Add shift/ })
  fireEvent.click(addButtons[15])
  expect(screen.getByLabelText('Starts (America/Denver)')).toHaveValue('2026-11-16T18:00')
  fireEvent.change(screen.getByLabelText('Starts (America/Denver)'), { target: { value: '2026-11-16T06:30' } })
  fireEvent.change(screen.getByLabelText('Ends (America/Denver)'), { target: { value: '2026-11-16T07:30' } })
  fireEvent.click(screen.getByRole('button', { name: 'Create shift' }))
  await waitFor(() => expect(rpc).toHaveBeenCalledWith('coordinator_create_shift', expect.objectContaining({
    p_starts_at: '2026-11-16T13:30:00.000Z', p_ends_at: '2026-11-16T14:30:00.000Z',
  })))
})

it.each([
  ['2026-11-01T01:30', /occurs twice/], ['2027-03-14T02:30', /does not exist/],
])('keeps invalid daylight-saving input out of the database: %s', async (start, message) => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-11-15T18:00:00Z'))
  render(<CoordinatorWorkspace currentProfileId="coordinator-1" currentRole="coordinator" initialView="monthly" />)
  await screen.findAllByRole('button', { name: /Add shift/ })
  fireEvent.click(screen.getByRole('button', { name: 'Create a shift' }))
  fireEvent.change(screen.getByLabelText('Starts (America/Denver)'), { target: { value: start } })
  fireEvent.click(screen.getByRole('button', { name: 'Create shift' }))
  expect(screen.getByRole('alert')).toHaveTextContent(message)
  expect(screen.getByRole('button', { name: 'Create shift' })).toBeEnabled()
  expect(rpc.mock.calls.some(([name]) => name === 'coordinator_create_shift')).toBe(false)
})

it('shows an existing meeting in Denver and preserves its instant when editing', async () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-11-01T18:00:00Z'))
  const repeatedHourShift = { ...shift, starts_at: '2026-11-01T08:30:15Z', ends_at: '2026-11-01T09:30:15Z' }
  rpc.mockImplementation((name: string) => Promise.resolve({ data: name === 'list_coordinator_schedule' ? [repeatedHourShift] : [], error: null }))
  render(<CoordinatorWorkspace currentProfileId="coordinator-1" currentRole="coordinator" initialView="schedule" />)
  fireEvent.click(await screen.findByRole('button', { name: /Evening Altar/ }))
  expect(screen.getByLabelText('Starts (America/Denver)')).toHaveValue('2026-11-01T01:30')
  expect(screen.getByLabelText('Ends (America/Denver)')).toHaveValue('2026-11-01T02:30')
  fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
  await waitFor(() => expect(rpc).toHaveBeenCalledWith('coordinator_update_shift', expect.objectContaining({
    p_starts_at: '2026-11-01T08:30:15Z', p_ends_at: '2026-11-01T09:30:15Z',
  })))
})

it('advances current month and schedule data after a suspended tab crosses midnight', async () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-11-01T05:59:59Z'))
  render(<CoordinatorWorkspace currentProfileId="coordinator-1" currentRole="coordinator" initialView="monthly" />)
  await waitFor(() => expect(rpc).toHaveBeenCalledWith('list_active_volunteers_for_assignment'))
  expect(screen.getByText('October 2026 · America/Denver')).toBeInTheDocument()
  vi.setSystemTime(new Date('2026-11-01T06:00:01Z'))
  act(() => { window.dispatchEvent(new Event('focus')) })
  expect(screen.getByText('November 2026 · America/Denver')).toBeInTheDocument()
  await waitFor(() => expect(rpc).toHaveBeenCalledWith('list_coordinator_schedule', {
    p_starts_at: '2026-11-01T06:00:00.000Z', p_ends_at: '2026-12-01T07:00:00.000Z',
  }))
  fireEvent.click(screen.getByRole('button', { name: 'Current month' }))
  expect(screen.getByText('November 2026 · America/Denver')).toBeInTheDocument()
})

it('preserves a browsed month and restores current month with Today', async () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-10-15T18:00:00Z'))
  render(<CoordinatorWorkspace currentProfileId="coordinator-1" currentRole="coordinator" initialView="monthly" />)
  await waitFor(() => expect(rpc).toHaveBeenCalledWith('list_active_volunteers_for_assignment'))
  fireEvent.click(screen.getByRole('button', { name: 'Next month' }))
  expect(screen.getByText('November 2026 · America/Denver')).toBeInTheDocument()
  vi.setSystemTime(new Date('2026-12-01T18:00:00Z'))
  act(() => { window.dispatchEvent(new Event('focus')) })
  expect(screen.getByText('November 2026 · America/Denver')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Current month' }))
  expect(screen.getByText('December 2026 · America/Denver')).toBeInTheDocument()
  await waitFor(() => expect(rpc).toHaveBeenCalledWith('list_coordinator_schedule', {
    p_starts_at: '2026-12-01T07:00:00.000Z', p_ends_at: '2027-01-01T07:00:00.000Z',
  }))
})

it('advances the coming seven days but preserves a browsed week until Today', async () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-11-01T05:59:59Z'))
  render(<CoordinatorWorkspace currentProfileId="coordinator-1" currentRole="coordinator" initialView="schedule" />)
  await waitFor(() => expect(rpc).toHaveBeenCalledWith('list_active_volunteers_for_assignment'))
  vi.setSystemTime(new Date('2026-11-01T06:00:01Z'))
  act(() => { window.dispatchEvent(new Event('focus')) })
  await waitFor(() => expect(rpc).toHaveBeenCalledWith('list_coordinator_schedule', {
    p_starts_at: '2026-11-01T06:00:00.000Z', p_ends_at: '2026-11-08T07:00:00.000Z',
  }))
  fireEvent.click(screen.getByRole('button', { name: 'Next week' }))
  await waitFor(() => expect(rpc).toHaveBeenCalledWith('list_coordinator_schedule', {
    p_starts_at: '2026-11-08T07:00:00.000Z', p_ends_at: '2026-11-15T07:00:00.000Z',
  }))
  vi.setSystemTime(new Date('2026-11-03T18:00:00Z'))
  act(() => { window.dispatchEvent(new Event('focus')) })
  expect(screen.getByText('Nov 8–Nov 14 · America/Denver')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Current week' }))
  await waitFor(() => expect(rpc).toHaveBeenCalledWith('list_coordinator_schedule', {
    p_starts_at: '2026-11-03T07:00:00.000Z', p_ends_at: '2026-11-10T07:00:00.000Z',
  }))
})

it('does not let an older schedule request overwrite the current month', async () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-11-15T18:00:00Z'))
  let finishNovember!: (value: { data: typeof shift[]; error: null }) => void
  rpc.mockImplementation((name: string, args?: { p_starts_at?: string }) => {
    if (name !== 'list_coordinator_schedule') return Promise.resolve({ data: [], error: null })
    if (args?.p_starts_at === '2026-11-01T06:00:00.000Z') return new Promise((resolve) => { finishNovember = resolve })
    return Promise.resolve({ data: [{ ...shift, starts_at: '2026-12-16T13:30:00Z', ends_at: '2026-12-16T14:30:00Z', title: 'December morning' }], error: null })
  })
  render(<CoordinatorWorkspace currentProfileId="coordinator-1" currentRole="coordinator" initialView="monthly" />)
  await waitFor(() => expect(rpc).toHaveBeenCalledWith('list_active_volunteers_for_assignment'))
  fireEvent.click(screen.getByRole('button', { name: 'Next month' }))
  await screen.findByRole('button', { name: /December morning/ })
  await act(async () => { finishNovember({ data: [], error: null }) })
  expect(screen.getByRole('button', { name: /December morning/ })).toBeInTheDocument()
  expect(screen.getAllByRole('button', { name: /Add shift/ })).toHaveLength(31)
})
