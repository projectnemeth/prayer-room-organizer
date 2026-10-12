import { act, cleanup, renderHook } from '@testing-library/react'
import { vi } from 'vitest'
import { useChurchDay } from './useChurchDay'

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-11-01T05:59:59Z'))
})
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks() })

it('advances at Denver midnight while the tab stays open', () => {
  const { result } = renderHook(() => useChurchDay())
  expect(result.current.dateKey).toBe('2026-10-31')
  act(() => { vi.advanceTimersByTime(30_000) })
  expect(result.current).toEqual({ dateKey: '2026-11-01', dayOfMonth: 1, dayOfWeek: 0 })
})
it.each(['focus', 'visibilitychange'])('refreshes immediately on %s after a suspended tab returns', (event) => {
  const { result } = renderHook(() => useChurchDay())
  vi.setSystemTime(new Date('2026-11-02T18:00:00Z'))
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
  act(() => { (event === 'focus' ? window : document).dispatchEvent(new Event(event)) })
  expect(result.current.dateKey).toBe('2026-11-02')
})
it('cleans up its timer and listeners when a page closes', () => {
  const removeWindowListener = vi.spyOn(window, 'removeEventListener')
  const removeDocumentListener = vi.spyOn(document, 'removeEventListener')
  const { unmount } = renderHook(() => useChurchDay())
  unmount()
  expect(vi.getTimerCount()).toBe(0)
  expect(removeWindowListener).toHaveBeenCalledWith('focus', expect.any(Function))
  expect(removeDocumentListener).toHaveBeenCalledWith('visibilitychange', expect.any(Function))
})
