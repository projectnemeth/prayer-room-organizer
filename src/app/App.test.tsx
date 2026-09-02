import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import { App } from './App'
import type { ActivePrivateProfile } from '../features/access'

vi.mock('../features/access', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../features/access')>()
  return {
    ...actual,
    PrivateAccessBoundary: ({ children, requireCoordinator }: { children: (profile: ActivePrivateProfile) => React.ReactNode; requireCoordinator?: boolean }) => {
      const mockProfile = (globalThis as unknown as { mockProfile?: ActivePrivateProfile }).mockProfile || {
        id: 'user-1',
        displayName: 'Test User',
        role: 'volunteer',
      }
      if (requireCoordinator && mockProfile.role === 'volunteer') {
        return <div>Access Denied</div>
      }
      return <div>{children(mockProfile)}</div>
    },
  }
})

describe('App', () => {
  afterEach(() => {
    delete (globalThis as unknown as { mockProfile?: ActivePrivateProfile }).mockProfile
  })

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

  it('redirects admin users from /portal to /coordinator', () => {
    ;(globalThis as unknown as { mockProfile?: ActivePrivateProfile }).mockProfile = {
      id: 'admin-1',
      displayName: 'Admin User',
      role: 'admin',
    }

    render(
      <MemoryRouter initialEntries={['/portal']}>
        <App />
      </MemoryRouter>,
    )

    expect(screen.getByText('Overview')).toBeInTheDocument()
  })

  it('allows volunteer users to view volunteer schedule at /portal', () => {
    ;(globalThis as unknown as { mockProfile?: ActivePrivateProfile }).mockProfile = {
      id: 'vol-1',
      displayName: 'Volunteer User',
      role: 'volunteer',
    }

    render(
      <MemoryRouter initialEntries={['/portal']}>
        <App />
      </MemoryRouter>,
    )

    expect(screen.getByText('Your upcoming assignments')).toBeInTheDocument()
  })
})
