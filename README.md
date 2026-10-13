# Planner (GSD edition) — built with the GSD workflow

> Shared routine planner + personal finance app, built phase by phase with **GSD (Get Shit Done) + Claude Code**.
> Companion repo: [planner-speckit](https://github.com/MoisesAbdalla/planner-speckit), the same product built with Spec Kit.

**Stack:** React 19 · TypeScript · Vite · Tailwind CSS · shadcn/ui (Radix) · TanStack Router · React Hook Form · Firebase (Auth, Firestore) · Vitest · Firestore Security Rules tests

**Phase 1 — access & shared workspace (done):** Google sign-in · a shared workspace for two people
(e.g. a couple) with data isolated from every other workspace by Security Rules · invite-by-link
flow with single-use invites · default categories seeded idempotently · money stored as integer
cents with pt-BR parsing · light/dark themes · mobile-first shell.

**Roadmap:** 6 phases — access & shared space → monthly entries → credit card, statements and
installments → fixed bills and category caps → **AI assistant to log and query expenses by
conversation** → tasks module. See [`.planning/ROADMAP.md`](.planning/ROADMAP.md).

### What the GSD workflow produced for one phase

Everything lives in [`.planning/phases/01-acesso-e-espa-o-compartilhado/`](.planning/phases/01-acesso-e-espa-o-compartilhado/):

- `01-CONTEXT.md`, `01-DISCUSSION-LOG.md` — decisions gathered before planning
- `01-RESEARCH.md`, `01-UI-SPEC.md` — technical research and a UI design contract
- `01-01…01-06-PLAN.md` + `SUMMARY.md` — six executable plans and what each delivered
- `01-REVIEW.md` — code review; each finding (`CR-01`, `WR-01…04`) fixed in its own commit
- `01-VERIFICATION.md`, `01-UAT.md` — goal-backward verification and the human checks that automated tests can't cover

## Same product, two AI development methodologies

I built the **same app** — a routine planner with a built-in personal finance manager (React,
TypeScript, Firebase) — twice, with Claude Code driving the implementation, to compare two
structured ways of building software with AI agents:

| | [Spec Kit](https://github.com/MoisesAbdalla/planner-speckit) (Spec-Driven Development) | [GSD](https://github.com/MoisesAbdalla/planner-gsd) (Get Shit Done) |
|---|---|---|
| Unit of work | A **feature spec** per capability | A **roadmap phase** with several plans |
| Cycle | `specify → plan → tasks → implement` | `discuss → research → plan → execute → review → verify (UAT)` |
| Artifacts | `spec.md`, `plan.md`, `research.md`, `data-model.md`, contracts, checklists, `tasks.md` | `PROJECT.md`, `REQUIREMENTS.md`, `ROADMAP.md`, per-phase context, research, UI spec, plans + summaries, code review, UAT, verification |
| Where it got | **6 features shipped**, 268 traceable tasks, ~8.8k lines of TS in 5 days | **Phase 1 of 6** (access + shared workspace) with a full review/verification loop in 3 days |
| Strength | Fast, linear delivery of many features with versioned, auditable specs | Deeper up-front discovery and a built-in review → fix → verify loop per phase |

The specs and planning artifacts are committed alongside the code, so the history shows *why*
each decision was made — not only what changed.

## Running

```bash
npm install
cp .env.local.example .env.local   # fill with your Firebase web config
npm run dev
npm run test:all                   # unit + Security Rules tests on the Firebase emulator
```
