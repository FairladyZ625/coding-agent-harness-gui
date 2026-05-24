# Agent Entry - harness-gui

This repository is the independent GUI module for `coding-agent-harness`.

## Operating Rule

Task planning, review, progress, and module coordination stay in the parent
private harness:

`/Users/lizeyu/Projects/coding-agent-harness/.harness-private/docs/09-PLANNING/MODULES/gui/`

Do not create ad hoc planning docs in this repository unless a module task
explicitly says to do so.

## Product Boundary

- Build a local desktop/web PLM console for many Harness projects.
- Do not replace the Harness document/CLI source of truth.
- Do not make the GUI local cache own task lifecycle state.
- Route write actions through Harness CLI/core.
- Do not add agent runner/session management until a later approved module task.

## First Read

- Parent strategy: `/Users/lizeyu/Projects/coding-agent-harness/.harness-private/docs/09-PLANNING/TASKS/2026-05-24-harness-gui-plm-console-strategy/strategy.md`
- Module plan: `/Users/lizeyu/Projects/coding-agent-harness/.harness-private/docs/09-PLANNING/MODULES/gui/module_plan.md`
