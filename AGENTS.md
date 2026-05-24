# Agent Entry - harness-gui

This repository is the independent GUI module for `coding-agent-harness`.

## Operating Rule

Task planning, review, progress, and module coordination stay in the parent
private harness for the checkout that embeds this module. Do not add private
planning material to this public GUI repository.

Do not create ad hoc planning docs in this repository unless a module task
explicitly says to do so.

## Product Boundary

- Build a local desktop/web PLM console for many Harness projects.
- Do not replace the Harness document/CLI source of truth.
- Do not make the GUI local cache own task lifecycle state.
- Route write actions through Harness CLI/core.
- Do not add agent runner/session management until a later approved module task.

## First Read

- Parent strategy task in the embedding repository's private harness.
- GUI module plan in the embedding repository's private harness.
