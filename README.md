# Executive Assistant for Students

A planning app for students with executive-function challenges. It answers one question at a time, "what should I be doing right now?", and turns syllabi and assignment sheets into a plan the student can actually start.

Parents and other supporters can be invited as cheerleaders, not co-managers. The long-term goal is to make the student need less support over time.

**[Try the live demo →](https://kotenpan94.github.io/executive-assistant/)** It runs in the browser on a sample student's week. Use the time controls at the bottom of the Now tab to jump through the day, and the Add tab to see a sample syllabus get turned into a plan. (The demo uses a saved AI result rather than calling Claude live.)

> Status: early prototype. Runs on mock week data. Auth and a real backend are not wired in yet.

## What it does today

- **Now screen.** Given the current time, the app picks the single most relevant thing to show:
  1. inside a fixed commitment (class, practice): only that, with no competing work
  2. inside a planned work block: that step or task
  3. earlier work today with nothing recorded: one bundled "still open" card
  4. otherwise: free time, plus what's next

  Below that: "later today" and "due soon". A dev panel lets you fake the current time to see each case.
- **Add a document.** Upload a syllabus or assignment (PDF, .docx, or an image). Claude extracts due dates, how much each item matters, and 2–5 concrete starter steps for anything due in the next three weeks. Dates the model is unsure about are flagged with a plain-language note, and the student confirms or fixes them before anything is added to their week.

## Design principles

The full reasoning is in [DESIGN.md](DESIGN.md). In short:

- **Build independence, not supervision.** Supporters cheer; they don't manage.
- **Collect as little data as possible.** This is a vulnerable population. No ad SDKs, no data resale. Location check-ins store a place label, never a GPS trail.
- **Uncertainty is an invitation.** When the AI is unsure, show the guess and ask. Confirming a date is itself useful planning practice.
- **Process over outcome.** Feedback asks "did you give yourself enough time?", never "how did you do?"
- **Restraint in reminders.** Each real-world moment gets at most one nudge. Over-notifying is how students turn notifications off.

## Tech

- **App:** Expo 57 / React Native 0.86, TypeScript, React Navigation. Runs on iOS, Android and web.
- **Extraction server:** a small Node server (`server/`) that sends uploaded files to the Claude API and returns schema-validated JSON (zod). It exists so the API key never ships inside the app. File contents are passed straight through, never written to disk or logged.

```
src/
  engine/resolveNow.ts     picks what the Now screen leads with
  screens/                 Now, Add (upload), Auth (not wired in yet)
  state/                   week state, actions, merging extraction results
  services/extract.ts      client for the extraction server
  mocks/                   sample week and time scenarios
server/src/index.ts        extraction server
```

## Running it

```bash
npm install
npm run web        # or: npm run ios / npm run android
```

To use document upload, run the extraction server in a second terminal:

```bash
cd server
npm install
cp .env.example .env   # then add your ANTHROPIC_API_KEY
npm start              # listens on port 8787
```

The app looks for the server on the same machine as the Expo dev server. Set `EXPO_PUBLIC_EXTRACT_URL` to point it elsewhere.

To publish the demo to GitHub Pages: `npm run deploy`. This builds the web app in demo mode (`EXPO_PUBLIC_DEMO_MODE=1`) and pushes it to the `gh-pages` branch.

## Roadmap

- Weekly planning session: a short look back at the prior week's planning, then accept, move or skip proposed work blocks
- Opt-in check-ins and a fixed, gentle reminder cadence
- Supporter view
- Auto-suggested study schedules, and learning from past weeks to improve time estimates

## License

MIT
