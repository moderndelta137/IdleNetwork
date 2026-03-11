# M3 Build Error Triage Thread (Carry-over Task)

This note is for the **next thread** to focus only on build-error triage and fixes.

## Goal
Identify and fix the build errors the user is seeing, then land a minimal, targeted PR.

## Current Observation in This Environment
- `npm run build` currently passes locally.
- There is still a non-blocking Vite warning about unresolved Jersey font file at build time.

Because local build is green, treat this as an **environment/branch-specific regression investigation** in the next thread.

## Required First Steps in Next Thread
1. Reproduce failure exactly in the user-reported context.
2. Capture raw failing logs (TypeScript, Vite, CI, or package manager).
3. Classify root cause:
   - Type errors from recent wave/multi-virus changes.
   - Missing/mis-cased files/import paths.
   - Data CSV parse issues.
   - Dependency/tooling drift (`node`, `npm`, lockfile, TS project refs).
   - CI-only path/case-sensitivity or clean-checkout issues.
4. Implement smallest safe fix.
5. Re-run required checks and include logs in PR summary.

## Suggested Repro Checklist
- `npm ci`
- `npm run check:game-store-duplicates`
- `npm run build`
- If still non-reproducible locally, run in a clean clone/container and match CI node/npm versions.

## Likely Focus Files (if code regression)
- `src/features/simulation/store/gameStore.ts`
- `src/features/battle/components/Board.tsx`
- `src/app/App.tsx`
- `src/features/enemies/data/enemy-attacks.csv`
- `tsconfig*.json`

## Exit Criteria for Next Thread
- Build error is reproducible and root-caused.
- Fix is merged with passing:
  - `npm run check:game-store-duplicates`
  - `npm run build`
- Handoff docs updated with what failed, why, and what was fixed.
