import { fireEvent, render, screen } from '@testing-library/react'
import { InterestReviewQueue } from './InterestReviewQueue'

const interest = {
  id: 'interest-1',
  name: 'Mara Lee',
  email: 'mara@example.org',
  submittedAt: '2026-09-02T12:00:00.000Z',
  status: 'new' as const,
}

describe('InterestReviewQueue', () => {
  it('shows an invitation as sent only after the server action resolves', async () => {
    let resolveInvitation: ((value: { outcome: 'invitation-sent'; email: string }) => void) | undefined
    const onStartInvitation = vi.fn(() => new Promise<{ outcome: 'invitation-sent'; email: string }>((resolve) => {
      resolveInvitation = resolve
    }))
    render(<InterestReviewQueue items={[interest]} onStartInvitation={onStartInvitation} />)

    fireEvent.click(screen.getByRole('button', { name: 'Send private invitation' }))
    expect(screen.getByRole('status')).toHaveTextContent('Sending private invitation')
    expect(screen.getByRole('button', { name: 'Sending invitation…' })).toBeDisabled()

    resolveInvitation?.({ outcome: 'invitation-sent', email: interest.email })
    expect(await screen.findByText('Invitation sent to mara@example.org. Their private portal access is ready once they use the email link.')).toBeInTheDocument()
    expect(onStartInvitation).toHaveBeenCalledWith(interest.id)
  })

  it('keeps the interest actionable when the server action fails', async () => {
    const onStartInvitation = vi.fn().mockRejectedValue(new Error('The invitation could not be sent. Check the email provider and try again.'))
    render(<InterestReviewQueue items={[interest]} onStartInvitation={onStartInvitation} />)

    fireEvent.click(screen.getByRole('button', { name: 'Send private invitation' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Check the email provider')
    expect(screen.getByRole('button', { name: 'Try invitation again' })).toBeEnabled()
  })

  it('labels the already-visible review action accurately', () => {
    const onOpenInterest = vi.fn()
    render(<InterestReviewQueue items={[interest]} onOpenInterest={onOpenInterest} />)

    fireEvent.click(screen.getByRole('button', { name: 'Mark as in conversation' }))
    expect(onOpenInterest).toHaveBeenCalledWith(interest.id)
    expect(screen.queryByRole('button', { name: 'Review details' })).not.toBeInTheDocument()
  })

  it('separates completed approvals and closed requests from the review queue', () => {
    render(<InterestReviewQueue items={[
      interest,
      { ...interest, id: 'approved-interest', name: 'Approved person', status: 'invited' },
      { ...interest, id: 'closed-interest', name: 'Closed person', status: 'not-moving-forward' },
    ]} />)

    expect(screen.getByText('1 to review')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Open serving interests' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Approved interest requests' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Not moving forward' })).toBeInTheDocument()
  })
})
