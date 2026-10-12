import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const vitest = fileURLToPath(new URL('../node_modules/vitest/vitest.mjs', import.meta.url))
const tests = [
  'src/lib/church-time.test.ts',
  'src/features/public/church-date.test.ts',
  'src/features/public/useChurchDay.test.tsx',
  'src/features/public/PublicCalendar.test.tsx',
  'src/features/private-workspace/CoordinatorWorkspace.test.tsx',
  'src/test/month-rollover.test.tsx',
]
for (const timeZone of ['America/Denver', 'UTC', 'America/New_York', 'Asia/Tokyo', 'Pacific/Honolulu']) {
  console.log(`Date regression tests: ${timeZone}`)
  const result = spawnSync(process.execPath, [vitest, 'run', ...tests], {
    stdio: 'inherit', env: { ...process.env, TZ: timeZone },
  })
  if (result.status !== 0) process.exit(result.status ?? 1)
}
