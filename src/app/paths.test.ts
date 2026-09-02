import { describe, expect, it } from 'vitest'
import { appPath, appUrl } from './paths'

describe('app paths', () => {
  it('preserves a deployment base path for internal links', () => {
    expect(appPath('/portal', '/prayer-room/')).toBe('/prayer-room/portal')
    expect(appPath('access', '/prayer-room')).toBe('/prayer-room/access')
  })

  it('builds absolute callback URLs inside the deployed app', () => {
    expect(appUrl('/portal', 'https://example.org')).toBe('https://example.org/portal')
  })
})
