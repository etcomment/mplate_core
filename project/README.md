# Project framing

This folder is the shared memory of the project: the framing documents and the outputs of each work session. Humans and AI agents read it before working and update it after.

## Read in this order

| Document | Content |
| --- | --- |
| [vision-and-scope.md](vision-and-scope.md) | What mplate is, who it is for, what this repository contains and what it does not |
| [decisions.md](decisions.md) | Architecture decision records (ADR): what was decided and why |
| [architecture.md](architecture.md) | Pipeline, modules and extension points |
| [roadmap.md](roadmap.md) | Phases, milestones and the backlog with checkboxes |
| [conventions.md](conventions.md) | Code, test, template and commit conventions |
| [worklog/](worklog/) | One dated file per work session: what was done, results, open questions |

## Public and private

The repository is **public**. Everything in this folder is committed, **except** `project/private/`, which is git-ignored.

- `project/private/` exists only in the maintainer's local checkout. It holds business context (pricing, commercial plan) and legal notes. Agents working in that checkout may read it, but must never copy its content into committed files, commit messages, issues or pull requests.
- When a decision taken in a private document has a technical consequence, record the consequence (not the reason) in `decisions.md`.

## Language

Committed documents are written in English. Private documents may be in French.

## Updating

- Append; do not rewrite history. Superseded decisions are marked *Superseded by ADR-xxx*, not deleted.
- Keep each document short and factual. Link instead of duplicating.
