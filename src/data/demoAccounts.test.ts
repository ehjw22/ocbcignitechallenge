import assert from 'node:assert/strict'
import test from 'node:test'
import { DEMO_SEED_VERSION, demoBook, migrateBalances } from './demoAccounts.ts'

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

test('v2 books are unchanged when already migrated', () => {
  const seed = demoBook('arif')!
  const saved = { ...seed, balances: { frank: 99980 }, seedVersion: DEMO_SEED_VERSION }
  const next = migrateBalances(saved, seed)
  assert.equal(next.balances.frank, 99980)
})

test('fresh seeds are 100000', () => {
  assert.equal(demoBook('auntiemei')!.balances['360'], 100000)
  assert.equal(demoBook('arif')!.balances.frank, 100000)
})