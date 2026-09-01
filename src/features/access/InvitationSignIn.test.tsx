import { fireEvent, render, screen } from '@testing-library/react'
import { InvitationSignIn } from './InvitationSignIn'

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
})
