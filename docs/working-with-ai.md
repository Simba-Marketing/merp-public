# Working with AI

MERP is built by one person and an AI pair programmer, [Claude Code](https://claude.com/claude-code), with a small team of specialised agents around it. This document describes how that works in practice, and what keeps it from going wrong.

## One shared memory

The project has a single long-lived instruction file that every session reads first. It is not documentation for humans; it is the working memory of the project: the architecture, every decision with its reason, and every mistake with the rule that came out of it. A typical entry is not *what* was built but *why it is this way and what breaks if you change it*.

That file is why a new session does not repeat last month's bug. It is also the reason this repository's security model reads like a list of lessons — because it is one.

## A team of agents, each with a lane

Specialists are defined as agents with their own scope and their own lines of consultation:

| Agent | Lane |
|---|---|
| Security & IT | RLS audits, edge-function review, secrets hygiene, attack tests after every schema change |
| Backlog | Classifies new items, splits work that is too big, proposes what to build each week |
| Chief of staff | Combines the domain reports into one monthly management summary |
| Sales, marketing, SEO, finance, legal, client management, product, organisation | Domain analysis and a short monthly briefing from live data |

The security agent is not a reviewer at the end. It is pulled in *during* a change, and asked to attack the result rather than read it.

## Automation that proposes, humans that decide

Every agent that runs on a schedule follows the same rule: **the system proposes, a human approves, and only then does the application act.**

- The SEO pipeline writes a draft every morning and emails it. Publishing is a human action in WordPress.
- The client-satisfaction survey proposes who should be invited each quarter. Nothing is sent until someone approves each row — and that brake is a property of the data, not a switch in the code that the next deploy might flip.
- The assistant on the home screen can read across the system and prepare emails, tasks and backlog items. It never sends or changes anything itself.

## Failing loudly

A job that fails silently is worse than one that never ran, because you stop checking. So:

- Scheduled jobs are built to mail a human when they fail, with the reason; where one still doesn't, that is tracked as a gap.
- A watchdog compares what an ad platform reports with what actually arrived, and raises an alarm when they drift apart.
- A screen that fails shows the error in place, instead of staying empty — "no leads" and "something broke" must never look the same.

## Tests that run the code

`node --check` catches syntax errors. It does not catch a variable used outside its scope, a backtick that closes a template literal early, or a selector that silently matches nothing — all of which have broken a production screen here. The tests in this repository therefore *execute* the code: the map test drives the real draw loop against a proxy canvas, and the quote test runs the real calculation in both languages.

And a test is only trusted after it has been seen to fail for the reason it claims to check.

## What the AI is not allowed to do alone

- Deploy to the server or publish anything outward-facing without explicit approval.
- Handle a secret in the conversation: credentials are pasted into Vault or the dashboard by a human, never into a chat.
- Overwrite or delete data to make a migration easier. Migrations add; historic numbers stay reproducible.
