# Project Cosmos Introduction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a first, independently selectable introduction entry inside Project Cosmos. The user's latest confirmation explicitly selects this approach instead of a small manual popup. Do not put a long description below the page title.

**Architecture:** Prepend an `isGuide` catalogue entry to the existing nine projects. Reuse the scene, search, reader, theme and focus lifecycle. The guide reader contains editorial sections and a real action to browse the catalogue; it does not present fabricated repository, demo or license fields. Preserve the standard project reader contract.

**Tech Stack:** Existing Vite, vanilla JavaScript, Three.js, Node tests and Playwright. Use a real screenshot and WebP assets, with no new dependencies or external runtime requests.

## Tasks

- [x] Add failing tests for catalogue ordering, preservation of all original projects, searchable introduction and guide-specific reader output.
- [x] Add introduction content, a real scene screenshot and thumbnail, and guide rendering/action support. Keep the current title description, scene controls and themes.
- [x] Test entry selection, reader, browse action, return focus, both themes, desktop/mobile and nonblank canvas pixels. Preserve WebGL fallback to the directory.
- [x] Run unit tests and production builds; inspect screenshots and review the scoped diff.
- [x] Commit, push through a protected-master PR, and verify the actual production version and guide workflow after pull deployment.

## Approved Content Scope

Explain the purpose and content of the collection: personal creations, open-source projects and useful tools; introductions and practical notes; tutorials versus externally operated trials; original authors and sources. The introduction is not a tenth external project and must not claim an exhaustive security audit or universal demo availability.

## Verification

Run `npm test` and `npm run build:site` in `previews/project-gallery`, then the complete `main` build. Use the existing WebGL motion smoke test plus a focused guide browser check. Preserve unrelated untracked files and do not edit production credentials or deployment configuration.

## Release Verification

PR #72 merged as `10c8d1d434298c304194023195132ae54dc962ac`. The public release marker confirmed this SHA. Live checks passed at 1440, 390 and 320 pixels in both themes: first introduction, real cover assets, reader, search, directory action, original project details and focus restoration. The guide also remained usable with WebGL disabled. Unit tests (25), deployment integration tests (4), the complete main build and local motion regression passed. This post-deployment note is documentation only, saved on the feature branch without triggering another production build.
