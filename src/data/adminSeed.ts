export const SEED_USERS = 1284;

export const SEED_LANG = [
  { id: "en", name: "English", count: 410 },
  { id: "zh", name: "中文", count: 302 },
  { id: "ms", name: "Bahasa Melayu", count: 148 },
  { id: "ta", name: "தமிழ்", count: 71 },
  { id: "zh-TW", name: "繁體中文", count: 64 },
  { id: "id", name: "Bahasa Indonesia", count: 58 },
  { id: "vi", name: "Tiếng Việt", count: 49 },
  { id: "th", name: "ไทย", count: 36 },
  { id: "tl", name: "Tagalog", count: 33 },
  { id: "ko", name: "한국어", count: 31 },
  { id: "ja", name: "日本語", count: 29 },
  { id: "hi", name: "हिन्दी", count: 28 },
  { id: "bn", name: "বাংলা", count: 25 },
];

export const SEED_TEXT = [
  { name: "100%", count: 640 },
  { name: "110%", count: 220 },
  { name: "125%", count: 210 },
  { name: "140%", count: 140 },
  { name: "150%", count: 74 },
];

export const SEED_COLOUR = [
  { name: "Default", count: 1188 },
  { name: "Protanopia", count: 28 },
  { name: "Deuteranopia", count: 34 },
  { name: "Tritanopia", count: 14 },
  { name: "Monochrome", count: 20 },
];

export const SEED_HELP = [
  { name: "AI assistant", count: 540 },
  { name: "Step-by-step", count: 470 },
  { name: "Contact staff", count: 274 },
];

export const SEED_DROPOFF: Record<string, { step: string; reached: number; dropped: number }[]> = {
  paynow: [
    { step: "Recipient", reached: 860, dropped: 90 },
    { step: "Amount", reached: 770, dropped: 70 },
    { step: "Confirm", reached: 700, dropped: 36 },
  ],
  transfer: [
    { step: "Name", reached: 740, dropped: 40 },
    { step: "Account", reached: 700, dropped: 160 },
    { step: "Amount", reached: 540, dropped: 48 },
    { step: "Confirm", reached: 492, dropped: 22 },
  ],
  overseas: [
    { step: "Recipient", reached: 410, dropped: 30 },
    { step: "SWIFT", reached: 380, dropped: 70 },
    { step: "Account", reached: 310, dropped: 90 },
    { step: "Amount", reached: 220, dropped: 24 },
    { step: "Confirm", reached: 196, dropped: 18 },
  ],
  bills: [
    { step: "Biller", reached: 390, dropped: 28 },
    { step: "Amount", reached: 362, dropped: 40 },
    { step: "Confirm", reached: 322, dropped: 16 },
  ],
  giro: [
    { step: "Organisation", reached: 280, dropped: 36 },
    { step: "Limit", reached: 244, dropped: 30 },
    { step: "Authorise", reached: 214, dropped: 48 },
    { step: "Confirm", reached: 166, dropped: 12 },
  ],
  qr: [
    { step: "Scan", reached: 510, dropped: 70 },
    { step: "Amount", reached: 440, dropped: 24 },
    { step: "Confirm", reached: 416, dropped: 20 },
  ],
  goal: [
    { step: "Name", reached: 190, dropped: 18 },
    { step: "Target", reached: 172, dropped: 22 },
    { step: "Confirm", reached: 150, dropped: 8 },
  ],
  cards: [
    { step: "Lock", reached: 240, dropped: 20 },
    { step: "Report lost", reached: 220, dropped: 14 },
  ],
  limit: [
    { step: "Current", reached: 160, dropped: 10 },
    { step: "New limit", reached: 150, dropped: 26 },
    { step: "Confirm", reached: 124, dropped: 8 },
  ],
};

export const SEED_ERRORS = [
  { name: "Account number length", count: 186 },
  { name: "SWIFT / BIC", count: 74 },
  { name: "Amount empty", count: 69 },
  { name: "PayNow number", count: 51 },
  { name: "GIRO authorisation", count: 44 },
  { name: "Limit out of range", count: 23 },
];

export const SEED_QUESTIONS = [
  { q: "What's GIRO?", count: 96 },
  { q: "How do I PayNow?", count: 88 },
  { q: "How do I change my transfer limit?", count: 61 },
  { q: "What can I see on this screen?", count: 54 },
  { q: "How do I send money overseas?", count: 47 },
];

export const SEED_REFUSED = [
  { q: "What's the weather tomorrow?", count: 18, kind: "Refused" },
  { q: "Write me a poem", count: 11, kind: "Refused" },
  { q: "I think I've been scammed", count: 27, kind: "Escalated" },
  { q: "My card is lost", count: 19, kind: "Escalated" },
  { q: "I want to talk to a person", count: 33, kind: "Escalated" },
];

export const SEED_A11Y = {
  largeText: 282,
  readAloud: 116,
  highContrast: 77,
  colourVision: 96,
};

export const SEED_KPIS = {
  guidesStarted: 2140,
  guidesCompleted: 1496,
  aiQuestions: 980,
  staffRequests: 214,
};

export const SEED_REQUESTS = [
  {
    ref: "OA-104428",
    summary: "Customer paused on GIRO authorisation and asked what GIRO means. Language: English. Detail: full.",
    task: "GIRO",
    step: "giro-auth",
    language: "en",
    detail: "full",
    method: "message" as const,
    when: "afternoon" as const,
    status: "in_progress" as const,
    urgent: false,
    at: "2026-10-20T03:12:00.000Z",
  },
  {
    ref: "OA-104102",
    summary: "PayNow practice. Customer was unsure which mobile number to use. Language: Bahasa Melayu.",
    task: "PayNow",
    step: "paynow-to",
    language: "ms",
    detail: "short",
    method: "phone" as const,
    when: "morning" as const,
    status: "received" as const,
    urgent: false,
    at: "2026-10-19T02:40:00.000Z",
  },
  {
    ref: "OA-103880",
    summary: "Transfer limit change completed with staff callback. Language: தமிழ்.",
    task: "Transfer limit",
    step: "limit-new",
    language: "ta",
    detail: "short",
    method: "email" as const,
    when: "evening" as const,
    status: "replied" as const,
    urgent: false,
    at: "2026-10-18T10:05:00.000Z",
  },
];

export const SEED_BROKEN = [
  {
    id: "seed-broken-1",
    at: "2026-10-18T04:00:00.000Z",
    journey: "invest",
    step: "rates",
    element: "invest-rates-table",
    detail: "Guide step skipped because the element was not on the page.",
  },
];
