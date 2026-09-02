import { fireEvent, render, screen } from '@testing-library/react'
import { InvitationSignIn } from './InvitationSignIn'
import { PrivateAccessError } from '../../lib/supabase'

describe('InvitationSignIn', () => {
  it('requests a link without presenting public account creation', async () => {
    const requestMagicLink = vi.fn().mockResolvedValue(undefined)
    render(<InvitationSignIn onRequestMagicLink={requestMagicLink} />)

    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'volunteer@example.org' } })
    fireEvent.click(screen.getByRole('button', { name: 'Email me a sign-in link' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Check your email')
    expect(requestMagicLink).toHaveBeenCalledWith('volunteer@example.org')
    expect(screen.getByText(/no public account creation/i)).toBeInTheDocument()
  })

  it('shows a non-sensitive, actionable delivery diagnostic', async () => {
    const requestMagicLink = vi.fn().mockRejectedValue(new PrivateAccessError(
      'email-rate-limited',
      'Email delivery is temporarily limited. Please wait a few minutes and try again.',
    ))
    render(<InvitationSignIn onRequestMagicLink={requestMagicLink} />)

    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'volunteer@example.org' } })
    fireEvent.click(screen.getByRole('button', { name: 'Email me a sign-in link' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Email delivery is temporarily limited')
    expect(screen.queryByText(/has been invited/i)).not.toBeInTheDocument()
  })
})
