import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import { UpdateSubscriptionTokenPage } from './UpdateSubscriptionTokenPage'

describe('UpdateSubscriptionTokenPage', () => {
  it('uses privacy-preserving language for a generic unsubscribe response', async () => {
    const action = vi.fn().mockResolvedValue(true)

    render(
      <MemoryRouter initialEntries={['/updates/unsubscribe?token=test-token']}>
        <UpdateSubscriptionTokenPage action={action} kind="unsubscribe" />
      </MemoryRouter>,
    )

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Your unsubscribe request was processed' })).toBeInTheDocument())
    expect(screen.getByText(/If this link was active/)).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'You’re unsubscribed' })).not.toBeInTheDocument()
  })
})
