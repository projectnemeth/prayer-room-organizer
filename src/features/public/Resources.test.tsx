import { render, screen, within } from '@testing-library/react'
import { Resources } from './Resources'

describe('Resources', () => {
  it('shows the team sequence with only ready destinations enabled', () => {
    render(<Resources />)

    const sections = screen.getAllByRole('region')
    expect(sections.map((section) => section.getAttribute('aria-labelledby'))).toEqual([
      'course-heading',
      'blog-heading',
      'playlists-heading',
      'wristbands-heading',
      'resources-updates-heading',
    ])

    expect(screen.getByRole('link', { name: 'Get the Course Now' })).toHaveAttribute('href', 'https://altar.day/CPC')
    expect(screen.getByText('Blog link coming soon.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Spotify Playlist' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Apple Music Playlist' })).toBeDisabled()
    expect(screen.getByText(/local pay and pickup only at The Rock Church/)).toBeInTheDocument()

    const signup = screen.getByRole('region', { name: 'Stay in the Rhythm' })
    expect(within(signup).getByRole('link', { name: 'Join the Rhythm' })).toHaveAttribute('href', '#resources-signup')
    expect(signup.querySelector('#resources-signup')).toBeInTheDocument()
  })
})
