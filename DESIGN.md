# Executive Assistant App — Design Doc

## 1\. Guiding principles

- **Autonomy-building, not supervision.** A stated goal is weaning students off needing parental/supporter support over time. Supporters are "cheerleaders," not co-managers.  
- **Minimal data collection.** This is a vulnerable population; the business model should favor charging more over monetizing data. No ad SDKs, no data resale, least-data-necessary for every feature (e.g., location check-ins store a place label, never a GPS trail).  
- **Uncertainty is an invitation, not a flaw.** When AI extraction is unsure, surface the guess rather than hide it — being asked to confirm/correct is itself useful planning practice for this population.  
- **Process over outcome.** Feedback loops (retrospective, reporting, nudges) ask about or support planning behavior ("did you give yourself enough time"), never academic outcome ("how'd you do").  
- **Restraint over generosity in prompting.** Default to fewer, better-timed nudges — over-notifying this population is how students disable notifications entirely or feel surveilled rather than supported.

## 2\. Roadmap

Following the original phase plan from `App Summary.docx`:

- **Phase 3 — Intelligence pt. 1**: auto-suggested study schedules (project breakdown \+ routine chains), progress reporting.  
- **Phase 4 — Intelligence pt. 2**: feedback-loop refinement (retrospective-driven learning on `Routine` durations and breakdown estimates).

**Backlog (post-Phase 4, not designed yet)**:

- Peer encouragement / leaderboards. Flagged risk if revisited: competitive comparison can backfire for an anxiety-prone population — lean toward opt-in, non-ranked, effort-based signals rather than a ranked leaderboard.  
- Student-adjustable nudge intensity (Minimal/Standard/More support). Deferred in favor of one fixed cadence for everyone in Phase 1/2 — revisit once there's real usage data to calibrate against.

## 3\. Architecture

## 4\. Data model

```
CheckIn      { id, studentId, subjectType: 'task'|'assignment'|'step', subjectId, ... }
Document     { id, studentId, classId?, type: 'syllabus'|'schedule', fileUrl,
               status: 'pending'|'parsed'|'reviewed', createdAt }
Reminder     { id, targetType: 'student'|'supporter', targetId,
               type: 'due'|'initiation'|'missed-followup'|'planning-session', firesAt }
Notification { id, targetType: 'student'|'supporter', targetId, channel: 'push'|'email' }
```

## 5–6. Engines

The hero screen. Given the current timestamp, resolve whichever `Step` (or atomic item) ...

## 7\. Weekly planning session

A ritual, on a student-chosen day (default: before the new week starts), in two parts:

1. **Look back — retrospective.** A capped 2–3 process-focused yes/no/somewhat questions about the prior week, generated from higher-stakes items and/or plan-vs-actual divergence (e.g., "You had a quiz Thursday — did you give yourself enough time to study?"). Never about academic outcome. This is the training signal for the Phase 4 feedback loop: a "no" biases future similar breakdowns/routines toward more lead time. *(Not yet fleshed out in detail — flagged for a later pass, see §13.)*  
2. **Look forward.** Confirm this week's fixed commitments (including variable-schedule instances) → review upcoming assignments/tasks → system proposes work blocks in remaining free time → student accepts/moves/skips each.

If a student skips the session entirely, the system still generates a best-effort week (stable commitments \+ template defaults for variable ones \+ whatever work blocks it can place) — the session makes the plan *better and reviewed*, its absence shouldn't mean no plan at all.

Day-of changes don't require re-running the ritual — a student can always edit ... 

## 8\. Check-ins

- **Location check-in**: opt-in per item (toggle "ask me to check in here"), never continuous tracking. At the expected time, a prompt to confirm a place label (e.g. "Library") — device location, if permitted, only suggests the label, it's never stored as an ongoing coordinate trail.  
- **Supporter visibility**: `CheckIn.sharedWithSupporters` defaults to `true` for completion check-ins, `false` for location check-ins (student can override either way). Completion is unambiguously cheer-worthy; location edges toward monitoring, so it stays opt-in for sharing even when the check-in feature itself is turned on.

## 9\. Nudges — tone and frequency

Default to restraint, not generosity (see guiding principles, §1) — over-notifying this population is how students disable notifications entirely or feel nagged rather than supported.

**Cadence per nudge type** — the general rule is *each real-world moment gets at most one nudge*; if several things miss around the same time, bundle into a single check-in rather than firing separately:

| Nudge | When it fires | Repeats? |
| :---- | :---- | :---- |
| Initiation (time to start a planned Step) | Once, right at/just before the planned start | No — one nudge, not a countdown |
| Missed-followup (window passed, nothing recorded) | Once, after a grace period (\~15–30 min) | At most one more, bundled into an end-of-day wrap-up if still open — never per-item nagging |
| Due reminder (bare item with no Steps) | Once, at a sensible lead time (e.g. night before) | No |
| Planning-session reminder | Once on the chosen day | One gentle follow-up later that day if skipped, then stop |

**Tone rules**:

- Always an invitation, never a command or a verdict — "Ready to start the bio reading?" not "You need to start reading now."  
- No guilt, no streaks-as-shame — a miss is information for replanning, not a failure to call out. "Looks like that didn't happen — want to move it or break it smaller?"  
- Warm but matter-of-fact, not relentlessly cheerful — upbeat-but-vague copy can read as patronizing to this audience specifically.  
- Never stack blame across misses — one bundled "here's what's open" beats five individual "you missed X" messages.

**Quiet hours / context awareness (hard requirement)**: suppress non-critical nudges during a default quiet window (e.g. 11pm–7am), and never nudge about a competing item while the student is inside a fixed commitment (class, shift) per Engine 1's "now" resolution.

**Deferred**: student-adjustable nudge intensity — see backlog, §2.

## 10\. Supporters

- Many-to-many with students (`StudentSupporterLink`); **student controls the relationship** — invites and revokes, not the other way around.  
- **Default permissions**: view-only. Supporters see check-ins the student shares and basic calendar info (titles/times) — never task breakdowns, subtasks, grades, raw location, or AI-coaching interactions.  
- Supporters cannot create, edit, or delete anything on the student's behalf — a deliberate departure from the original doc's "students and supporters can manually create tasks" line, in favor of the autonomy-building principle.  
- Noted for later, not designed yet: supporter visibility might need to *taper* over time as a student demonstrates consistency (ties to the "wean off support" goal) — a natural Phase 3/4 feature once there's behavioral data to act on.  
- **Invite flow not yet finalized** — see open questions, §12 (\#6).

## 11\. Screen inventory

| Screen | Status |
| :---- | :---- |
|  |  |
| Check-in (completion/location) | new |
| Settings/profile | repurpose `(tabs)/explore.tsx` or add fresh |

## 12\. Open questions (not yet resolved)

- **\#6 — Supporter invite flow.** How a student actually adds a supporter, and check-in email cadence (immediate vs. digest). *(Next up.)*  
- **\#7 — Onboarding sequence.** First-session path to value, given EF users are prone to abandoning multi-step setup.  
- **\#8 — Privacy/retention specifics.** Concrete retention windows for location check-ins and documents, consistent with the minimal-data-collection principle.  
- **Business/cost questions from the original doc**, not design decisions but need real research before provider selection: cost of a notification/SMS service at scale, and cost of AI-based syllabus extraction per document.

## 13\. Retrospective design — flagged for a later pass

The weekly retrospective (§7.1) is sketched but not fully designed: exact question bank, how many questions is too many, how answers concretely adjust `Routine`/breakdown estimates. Revisit before Phase 4\.