export const LANG_IDS = [
  "en",
  "zh",
  "ms",
  "ta",
  "zh-TW",
  "id",
  "vi",
  "th",
  "tl",
  "ko",
  "ja",
  "hi",
  "bn",
] as const;

export type LangId = (typeof LANG_IDS)[number];

export type ColorVision =
  | "default"
  | "protanopia"
  | "deuteranopia"
  | "tritanopia"
  | "monochrome";

export type HelpMethod = "ai" | "guide" | "staff";

export type ThemeId = "ocbc" | "ocean" | "forest" | "sunset" | "plum";

export const ACTION_IDS = [
  "transfer",
  "paynow",
  "bills",
  "overseas",
  "qr",
  "cards",
  "goals",
  "giro",
  "topup",
  "invest",
  "insurance",
  "rewards",
] as const;

export type ActionId = (typeof ACTION_IDS)[number];

export type Prefs = {
  onboarded: boolean;
  language: LangId;
  textScale: number;
  bold: boolean;
  highContrast: boolean;
  colorVision: ColorVision;
  detail: "short" | "full";
  readAloud: boolean;
  helpMethod: HelpMethod | null;
  themeId: ThemeId;
  customAccent: string | null;
  mode: "light" | "dark";
  backgroundImage: string | null;
  overlay: number;
  contrastWarn: boolean;
  shortcuts: ActionId[];
  insights: boolean;
  displayName: string;
};

export type AnalyticsEvent = {
  id: string;
  sessionId: string;
  type:
    | "guide_started"
    | "guide_completed"
    | "guide_dropped"
    | "guide_missing"
    | "ai_question"
    | "ai_refused"
    | "ai_escalated"
    | "staff_request"
    | "error"
    | "journey_completed";
  at: string;
  journey?: string;
  step?: string;
  element?: string;
  detail?: string;
};

export type StaffRequest = {
  ref: string;
  summary: string;
  task: string;
  step: string;
  language: string;
  detail: string;
  method: "message" | "phone" | "email";
  when: "morning" | "afternoon" | "evening";
  status: "received" | "in_progress" | "replied";
  urgent: boolean;
  at: string;
};

export type CardState = {
  id: string;
  nameKey: "cards.debit" | "cards.credit";
  last4: string;
  locked: boolean;
};

export type Goal = {
  id: string;
  name: string;
  target: number;
  monthly: number;
  saved: number;
};

export type Activity = {
  id: string;
  title: string;
  amount: string;
  date: string;
  direction: "in" | "out";
};

export type ScreenContext = {
  screen: string;
  step: string;
  error: string;
  taskLabel: string;
};

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  flags?: ChatFlags;
  source?: "model" | "fallback";
};

export type ChatFlags = {
  refused: boolean;
  escalate: boolean;
  fraud: boolean;
  offerGuide: boolean;
  unsure: boolean;
};

export type ChatResponse = {
  reply: string;
  source: "model" | "fallback";
  flags: ChatFlags;
};
