# Harness GUI

Local desktop/web PLM console for aggregating multiple Coding Agent Harness projects.

GitHub: https://github.com/FairladyZ625/coding-agent-harness-gui

This repository is intentionally separate from `coding-agent-harness` core. The
core repository remains the document/CLI/kernel package; this GUI repository is
the operator console that reads many Harness projects and routes approved write
actions back through Harness CLI/core.

## Product Boundary

V1 is a local portfolio console:

- register and scan local Harness projects;
- show global review, blocked, missing-materials, lessons, and active queues;
- open task contracts, evidence, and project files;
- route gated actions such as review confirmation through Harness CLI/core.

V1 does not run coding agents. External tools such as Codex, Claude Code,
Cursor, and Antigravity remain the coding surfaces until the later handoff and
controlled runner phases.

## Planning Source

Planning and task governance live in the embedding repository's private
Harness workspace. This public repository intentionally does not include private
task paths, local project paths, or dogfood fixture content.

Module key: `gui`

## Status

V1 implementation is in progress: local Web console, localhost service, schema
fixtures, scanner, benchmark, and guarded preview actions.
