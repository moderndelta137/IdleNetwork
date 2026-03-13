# Enemy attack CSV data

`enemy-attacks.csv` is the source of truth for enemy attack tuning fields:

- Name
- Actor
- DMG
- Type
- Description
- Lag (seconds)
- Recoil (seconds)
- Effects (grammar string)

Notes:
- Invalid rows/effects are skipped at load time with a warning log (safe fallback).
- Projectile effects are supported via grammar (example: `projectile:rows=0;maxRange=6;speed=2`).
- FireMan attacks are authored here and consumed by the same parser/validator pipeline as other enemies.
