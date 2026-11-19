import assert from 'node:assert/strict'
import test from 'node:test'
import { finalizeReply, visibleReply } from './chatReply.ts'

test('visibleReply hides truncated JSON and suggestion scaffolding', () => {
  const truncated = '{ "reply": "Your top category was groceries.", "action": null, "scamRisk":'
  assert.equal(visibleReply(truncated), 'Your top category was groceries.')
  const zhCut = '{ "reply": "您可以在底部菜单的“转'
  assert.equal(visibleReply(zhCut), '您可以在底部菜单的“转')
  const fenced = '```json\n{"reply":"Step one.","action":null}\n```'
  assert.equal(visibleReply(fenced), 'Step one.')
  const zh = '这是答案。\n建议操作: 本地转账, 海外转账, 查看账户余额'
  assert.equal(visibleReply(zh), '这是答案。')
  assert.equal(visibleReply('Plain help text.'), 'Plain help text.')
  assert.equal(visibleReply('{"reply":"Hi","action":null}'), 'Hi')
  assert.equal(visibleReply('{"action":null,"scamRisk":"none"}'), '')
})

test('finalizeReply adds ellipsis for unfinished JSON', () => {
  assert.equal(finalizeReply('{ "reply": "Almost done', 'fallback'), 'Almost done…')
})