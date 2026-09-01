import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { App } from './App'

describe('App', () => {
  it('presents the Altar Initiative daily rhythm', () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'A daily rhythm of prayer.' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'View gatherings' })).toBeVisible()
    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: 'Admin' })).toHaveAttribute('href', '/coordinator')
  })
})
