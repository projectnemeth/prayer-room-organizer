import { requestInvitationMagicLink } from './auth'

describe('requestInvitationMagicLink', () => {
  it('normalizes email and gives a rate-limit diagnostic without revealing account state', async () => {
    const signInWithOtp = vi.fn().mockResolvedValue({ error: new Error('Email rate limit exceeded') })
    const client = { auth: { signInWithOtp } }

    await expect(requestInvitationMagicLink(client as never, ' Volunteer@Example.org ', 'https://altar.example.org/portal'))
      .rejects
      .toMatchObject({
        code: 'email-rate-limited',
        userMessage: expect.stringContaining('temporarily limited'),
      })
    expect(signInWithOtp).toHaveBeenCalledWith({
      email: 'volunteer@example.org',
      options: { emailRedirectTo: 'https://altar.example.org/portal', shouldCreateUser: false },
    })
  })
})
