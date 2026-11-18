import { execSync } from 'node:child_process'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const offenders = []
for (const folder of ['server', 'api']) {
  for (const name of readdirSync(join(root, folder))) {
    if (!name.endsWith('.ts')) continue
    const text = readFileSync(join(root, folder, name), 'utf8')
    if (/\.\.\/src\/lib\/[^'"]+\.ts['"]/.test(text)) offenders.push(`${folder}/${name}`)
  }
}
if (offenders.length) {
  console.error('Server files must not import ../src with .ts extensions:')
  console.error(offenders.join('\n'))
  process.exit(1)
}
execSync(
  'npx tsc --noEmit server/amount.ts server/reply.ts --module nodenext --target es2022 --moduleResolution nodenext --esModuleInterop',
  { cwd: root, stdio: 'inherit' },
)
console.log('API import guard OK')