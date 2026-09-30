import { fireEvent, render, screen, within } from '@testing-library/react'
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
    expect(screen.getByRole('link', { name: 'Spotify playlist' })).toHaveAttribute('href', expect.stringContaining('https://open.spotify.com/playlist/'))
    expect(screen.getByRole('button', { name: 'Apple Music playlist' })).toBeDisabled()
    expect(screen.getByText(/local pay and pickup only at The Rock Church/)).toBeInTheDocument()

    const signup = screen.getByRole('region', { name: 'Stay in the Rhythm' })
    expect(within(signup).getByRole('link', { name: 'Join the Rhythm' })).toHaveAttribute('href', '#resources-signup')
    expect(signup.querySelector('#resources-signup')).toBeInTheDocument()
  })
  it('switches the platform destination and compact color player together', () => {
    render(<Resources />)
    fireEvent.change(screen.getByRole('combobox', { name: 'Choose a day of the month' }), { target: { value: '31' } })
    expect(screen.getByRole('link', { name: 'Spotify playlist' })).toHaveAttribute('href', expect.stringContaining('/67TTVa7b9jlmhDrvFSV1KH'))
    const player = screen.getByTitle('Spotify worship playlist · Day 31')
    expect(player).toHaveAttribute('height', '152')
    expect(player).toHaveAttribute('src', expect.stringContaining('/embed/playlist/67TTVa7b9jlmhDrvFSV1KH'))
    expect(player.getAttribute('src')).not.toContain('theme=0')
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '1' } })
    expect(screen.getByTitle('Spotify worship playlist · Day 1')).toBeInTheDocument()
    expect(screen.queryByTitle('Spotify worship playlist · Day 31')).not.toBeInTheDocument()
  })

})
