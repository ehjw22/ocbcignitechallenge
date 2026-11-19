import { readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = join(dirname(fileURLToPath(import.meta.url)), '../src/i18n/locales')

const patchEn = {
  staff: {
    needs: {
      scam: 'Possible scam',
      largeText: 'Large text',
      readAloud: 'Read aloud',
      cantonese: 'Cantonese',
      highContrast: 'High contrast',
    },
    transcript: {
      customer: 'Customer',
      ollie: 'Ollie',
      scamCheck: 'Ollie scam check. {summary} Answers: {answers}.',
    },
    scamSummary: 'Possible scam. {money} to {name}. {reasons}',
  },
  ai: {
    samplePayee: 'Tan Wei Ming',
    sampleCountry: 'Australia',
  },
  flows: {
    currencyLabel: 'SGD',
  },
  look: {
    hiddenBalance: '•••••••• SGD',
  },
  languages: {
    moreLanguages: 'More languages',
    machineNote: 'Machine translated, may not be fully accurate.',
    switchNotice: 'This language is machine translated. Some wording may be imperfect.',
  },
  voice: {
    zh: 'Chinese voice',
    'zh-TW': 'Traditional Chinese voice',
  },
}

const zhPatch = {
  staff: {
    needs: { scam: '疑似诈骗', largeText: '大号文字', readAloud: '朗读', cantonese: '粤语', highContrast: '高对比度' },
    transcript: { customer: '客户', ollie: 'Ollie', scamCheck: 'Ollie 诈骗检查。{summary} 回答：{answers}。' },
    scamSummary: '疑似诈骗。向 {name} 支付 {money}。{reasons}',
  },
  ai: { samplePayee: 'Tan Wei Ming', sampleCountry: 'Australia' },
  flows: { currencyLabel: 'SGD' },
  look: { hiddenBalance: '•••••••• SGD' },
  languages: {
    moreLanguages: '更多语言',
    machineNote: '机器翻译，可能不完全准确。',
    switchNotice: '此语言为机器翻译，部分措辞可能不准确。',
  },
  voice: { zh: '中文语音', 'zh-TW': '繁体中文语音' },
}

const msPatch = {
  staff: {
    needs: { scam: 'Kemungkinan penipuan', largeText: 'Teks besar', readAloud: 'Baca dengan kuat', cantonese: 'Kantonis', highContrast: 'Kontras tinggi' },
    transcript: { customer: 'Pelanggan', ollie: 'Ollie', scamCheck: 'Semakan penipuan Ollie. {summary} Jawapan: {answers}.' },
    scamSummary: 'Kemungkinan penipuan. {money} kepada {name}. {reasons}',
  },
  ai: { samplePayee: 'Tan Wei Ming', sampleCountry: 'Australia' },
  flows: { currencyLabel: 'SGD', bank: 'Bank penerima' },
  look: { hiddenBalance: '•••••••• SGD' },
  languages: {
    moreLanguages: 'Lagi bahasa',
    machineNote: 'Terjemahan mesin, mungkin tidak tepat sepenuhnya.',
    switchNotice: 'Bahasa ini diterjemah mesin. Sebahagian perkataan mungkin kurang tepat.',
  },
  voice: { zh: 'Suara Cina', 'zh-TW': 'Suara Cina Tradisional' },
  dialects: { hokkien: 'Hokkien (loghat Cina)', teochew: 'Teochew (loghat Cina)', hakka: 'Hakka (loghat Cina)' },
  guides: { paynow: { title: 'Hantar dengan PayNow' } },
}

const taPatch = {
  staff: {
    needs: { scam: 'மோசடியாக இருக்கலாம்', largeText: 'பெரிய உரை', readAloud: 'சத்தமாகப் படி', cantonese: 'காண்டோனீஸ்', highContrast: 'அதிக வேறுபாடு' },
    transcript: { customer: 'வாடிக்கையாளர்', ollie: 'Ollie', scamCheck: 'Ollie மோசடிச் சரிபார்ப்பு. {summary} பதில்கள்: {answers}.' },
    scamSummary: 'மோசடியாக இருக்கலாம். {name} க்கு {money}. {reasons}',
  },
  ai: { samplePayee: 'Tan Wei Ming', sampleCountry: 'Australia' },
  flows: { currencyLabel: 'SGD' },
  look: { hiddenBalance: '•••••••• SGD' },
  languages: {
    moreLanguages: 'மேலும் மொழிகள்',
    machineNote: 'இயந்திர மொழிபெயர்ப்பு; முழுமையாகத் துல்லியமாக இருக்காது.',
    switchNotice: 'இந்த மொழி இயந்திர மொழிபெயர்ப்பு. சில சொற்கள் துல்லியமாக இருக்காது.',
  },
  voice: { zh: 'சீனக் குரல்', 'zh-TW': 'பாரம்பரிய சீனக் குரல்' },
  guides: {
    paynow: {
      title: 'PayNow மூலம் அனுப்பு',
      nameTitle: 'பெயரைச் சரிபார்',
      nameBody: 'மறைக்கப்பட்ட பெயர் நீங்கள் தேர்ந்தெடுத்த நபருடன் பொருந்த வேண்டும்.',
      slideTitle: 'செலுத்த ஸ்லைட் செய்யுங்கள்',
      slideBody: 'உறுதிப்படுத்த முழுவதும் ஸ்லைட் செய்யுங்கள்.',
    },
  },
}

function merge(target, patch) {
  for (const [key, value] of Object.entries(patch)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      target[key] = merge(target[key] && typeof target[key] === 'object' ? { ...target[key] } : {}, value)
    } else {
      target[key] = value
    }
  }
  return target
}

function load(id) {
  const path = join(dir, `${id}.json`)
  const data = JSON.parse(readFileSync(path, 'utf8'))
  delete data.present?.f11
  return { path, data }
}

const en = load('en')
merge(en.data, patchEn)
en.data.languages = { ...en.data.languages, ...patchEn.languages }
delete en.data.languages.morePreview
delete en.data.languages.previewPill
delete en.data.languages.previewNote
writeFileSync(en.path, JSON.stringify(en.data, null, 2) + '\n')

for (const [id, patch] of [
  ['zh', zhPatch],
  ['ms', msPatch],
  ['ta', taPatch],
]) {
  const file = load(id)
  merge(file.data, patch)
  if (file.data.languages) {
    file.data.languages = { ...file.data.languages, ...patch.languages }
    delete file.data.languages.morePreview
    delete file.data.languages.previewPill
    delete file.data.languages.previewNote
  }
  delete file.data.present?.f11
  writeFileSync(file.path, JSON.stringify(file.data, null, 2) + '\n')
  console.log('patched', id)
}

console.log('Run node scripts/build-zh-tw.mjs and fill other locales from en for new keys')