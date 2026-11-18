import assert from 'node:assert/strict'
import test from 'node:test'
import { DEMO_SEED_VERSION, demoBook, loadBook, migrateBalances, resolveBook, saveBook } from './demoAccounts.ts'

const store: Record<string, string> = {}
Object.defineProperty(globalThis, 'localStorage', {
  value: {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { delete store[key] },
    key: (index: number) => Object.keys(store)[index] ?? null,
    get length() { return Object.keys(store).length },
    clear: () => { for (const key of Object.keys(store)) delete store[key] },
  },
  configurable: true,
})

test('migrateBalances tops up v1 saved books without wiping txns', () => {
  const seed = demoBook('arif')!
  const saved = {
    ...seed,
    balances: { frank: 1210.55 },
    accounts: [{ ...seed.accounts[0], balance: 1210.55 }],
    seedVersion: 1,
    txns: [{ id: 'keep', title: 'Test', amount: -1, date: '2026-10-01', accountId: 'frank' }],
  }
  const next = migrateBalances(saved, seed)
  assert.equal(next.balances.frank, 100000)
  assert.equal(next.seedVersion, DEMO_SEED_VERSION)
  assert.equal(next.txns.length, 1)
})

test('v2 stamp with 1210 still tops up to 100000 under v3', () => {
  const seed = demoBook('arif')!
  const saved = { ...seed, balances: { frank: 1210.55 }, accounts: [{ ...seed.accounts[0], balance: 1210.55 }], seedVersion: 2 }
  const next = migrateBalances(saved, seed)
  assert.equal(next.balances.frank, 100000)
  assert.equal(next.seedVersion, DEMO_SEED_VERSION)
})

test('v3 books are unchanged when already migrated', () => {
  const seed = demoBook('arif')!
  const saved = { ...seed, balances: { frank: 99980 }, seedVersion: DEMO_SEED_VERSION }
  const next = migrateBalances(saved, seed)
  assert.equal(next.balances.frank, 99980)
})

test('resolveBook tops up saved books missing seedVersion', () => {
  const seed = demoBook('arif')!
  saveBook('arif', {
    accounts: [{ ...seed.accounts[0], balance: 1210.55 }],
    balances: { frank: 1210.55 },
    txns: [...seed.txns],
    goals: seed.goals,
    payees: [...seed.payees],
  })
  const book = resolveBook('arif')
  assert.equal(book?.balances.frank, 100000)
  assert.equal(loadBook('arif')?.seedVersion, DEMO_SEED_VERSION)
})

test('fresh seeds are 100000', () => {
  assert.equal(demoBook('auntiemei')!.balances['360'], 100000)
  assert.equal(demoBook('arif')!.balances.frank, 100000)
})