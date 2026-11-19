#!/usr/bin/env node
/**
 * Merge locale files: union of HEAD (teammate) and stash (round-6).
 * Teammate wins: guides.home.shortcutsBody (3 shortcuts), guides.settings.shortcutsBody, onboarding.settings.shortcuts (3).
 */
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const LOCALES = fs.readdirSync(path.join(ROOT, 'src/i18n/locales')).filter((f) => f.endsWith('.json'))

const TEAMMATE_LEAF = new Set([
  'guides.home.shortcutsBody',
  'guides.settings.shortcutsBody',
  'onboarding.settings.shortcuts',
])

function flat(obj, prefix = '') {
  const out = {}
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === 'object' && !Array.isArray(v)) Object.assign(out, flat(v, key))
    else out[key] = v
  }
  return out
}

function unflatten(flatMap) {
  const root = {}
  for (const [key, value] of Object.entries(flatMap)) {
    const parts = key.split('.')
    let cur = root
    for (let i = 0; i < parts.length - 1; i++) {
      cur[parts[i]] ??= {}
      cur = cur[parts[i]]
    }
    cur[parts[parts.length - 1]] = value
  }
  return root
}

function loadJsonFromGit(ref, file) {
  try {
    const raw = execSync(`git show ${ref}:src/i18n/locales/${file}`, { cwd: ROOT, encoding: 'utf8' })
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function loadStashJson(file) {
  try {
    const raw = execSync(`git show "stash@{0}:src/i18n/locales/${file}"`, {
      cwd: ROOT,
      encoding: 'utf8',
    })
    return JSON.parse(raw)
  } catch {
    /* fall through to patch parse */
  }
  try {
    const raw = execSync(`git stash show -p "stash@{0}" -- src/i18n/locales/${file}`, {
      cwd: ROOT,
      encoding: 'utf8',
    })
    const plus = raw.split('\n').filter((l) => l.startsWith('+') && !l.startsWith('+++')).map((l) => l.slice(1))
    const minus = raw.split('\n').filter((l) => l.startsWith('-') && !l.startsWith('---')).map((l) => l.slice(1))
    const attempt = (lines) => {
      const text = lines.join('\n')
      const start = text.indexOf('{')
      const end = text.lastIndexOf('}')
      if (start < 0 || end < start) return null
      try {
        return JSON.parse(text.slice(start, end + 1))
      } catch {
        return null
      }
    }
    return attempt(plus) ?? attempt(minus)
  } catch {
    return null
  }
}

for (const file of LOCALES) {
  const head = loadJsonFromGit('HEAD', file)
  const stash = loadStashJson(file)
  const disk = path.join(ROOT, 'src/i18n/locales', file)
  if (!head) {
    console.warn('skip (no HEAD)', file)
    continue
  }
  const headFlat = flat(head)
  const stashFlat = stash ? flat(stash) : {}
  const merged = { ...headFlat, ...stashFlat }
  for (const key of TEAMMATE_LEAF) {
    if (headFlat[key] !== undefined) merged[key] = headFlat[key]
  }
  const meta = stash?.['_meta'] ?? head?.['_meta']
  const out = unflatten(merged)
  if (meta) out._meta = meta
  fs.writeFileSync(disk, `${JSON.stringify(out, null, 2)}\n`, 'utf8')
  console.log('merged', file, Object.keys(merged).length, 'keys')
}