# Igniters Adaptive Banking (OCBC Ignite Challenge - Problem Statement 4)

A banking app prototype that adapts to each customer through preferences they choose, without inferring anything about them.

Any username and password signs in, except the two demo accounts below. Balances, names, and messages are sample data, and no money is moved.

## Expected outcomes

| Outcome | What the prototype does | Where to find it |
| --- | --- | --- |
| Select assistance preferences | First login asks for language, text size, detail level, help style, colour settings, and six home shortcuts. Each choice can be changed later. | New username, then setup. Returning choices are in Settings. |
| Guided journey | A short tour points at the balance, shortcuts, and help. Practice payments have step-by-step guides. | More → Home tour. Help → Step-by-step guide, or the “Practise an overseas transfer” card. |
| Switch interaction mode | Help always offers the assistant, a guide, or a message to staff. Text size, contrast, colour, and read-aloud can be changed without starting over. | Help button. Settings → Help preferences, Text and display, Colours and theme. |
| Request human help | The customer can send a message. Fraud and lost-card answers include the 24-hour hotline. No real call is placed. | Help → Message our staff. |
| Designer usability and accessibility insights | Counts for languages, text size, guides, errors, and staff requests, plus a CSV export. Figures are from this browser and sample records. | `/admin`. Any password works. |

## Key features

- Setup and Settings for language, text size, speaking speed, bold text, contrast, colour vision, theme, read-aloud, and home shortcuts.
- The assistant can explain a task, then start a guided walkthrough on the real screens or with sample data.
- English, 中文, Bahasa Melayu, and தமிழ், plus nine other languages.
- Transfers, PayNow, bills, overseas transfer, scan, GIRO, top up, cards, and savings goals. Practice mode does not move money.
- AI assistant for banking questions. It will not ask for a password or one-time PIN.
- Step-by-step guides, with optional spoken steps.
- Messages to staff, kept on this device.
- Spending insights stay off until the customer turns them on.
- Designer dashboard for preference and task patterns.

## Design principles

- The app does not infer age, disability, income, or confidence. Customers choose what they want.
- A preference changes presentation. It does not remove a payment, account, or help option.
- Balances, names, and messages are sample data.
- Text, controls, and status aim for WCAG 2.2 AA: labels are not colour-only, targets are at least 44px, and text can be enlarged.

## Tech stack

React, Vite, TypeScript, Tailwind, Gemini (AI), Azure Speech (text to speech), Vercel.

## Run locally

```bash
npm install
copy .env.example .env
npm run dev
```

Fill in `.env` if you want live answers and Azure speech:

- `LLM_API_KEY`
- `LLM_BASE_URL` (Gemini’s OpenAI-compatible endpoint is the default)
- `LLM_MODEL`
- `AZURE_SPEECH_KEY`
- `AZURE_SPEECH_REGION`

The app still runs with the keys empty. The assistant then uses built-in demo answers, and read-aloud uses the browser voice. Do not commit `.env`.

## Project structure

- `src/` — customer app: pages, phone shell, preferences, and locale files.
- `src/i18n/locales/` — one JSON file per language.
- `server/` — chat and speech helpers shared by local dev and Vercel.
- `api/` — `/api/chat` and `/api/tts` for Vercel.

## Limitations and next steps

This is a prototype. It is not connected to OCBC accounts, payments, or the contact centre. Data stays in the browser. Guides cover the main journeys, not every screen.

Next: test the setup and tours with customers, replace sample records with real account data, and hand staff messages to a real queue.

## Demo accounts

Sample data only. Both passwords are `demo1234`. Logging in opens Home with that person's saved preferences.

- `auntiemei` — Auntie Mei, 67. Chinese with a Cantonese voice, extra-large text, step-by-step detail, guided walkthrough, speaking speed 0.8x. Shortcuts: Overseas Transfer, PayNow, Message staff, Accounts, Help, Scan & Pay. 360 Account S$8,450.20. Saved overseas payee “Son - Wei Ming (Australia)”. No earlier overseas transfers.
- `arif` — Arif, 22. English, normal text, brief detail, AI assistant, speaking speed 1x, spending insights on, dark theme. Shortcuts: PayNow, Scan & Pay, Savings goal, Spending insights, GIRO, Rewards. FRANK Account S$1,230.55. Savings goal “Laptop”, S$400 of S$1,500. Three months of sample transactions.

## Team

- Name
- Name
- Name
