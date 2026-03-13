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
- Invalid rows/effects are skipped at load time with a warning log (safe fallback).


- Supports projectile effects via grammar (e.g., `projectile:rows=0;maxRange=6;speed=2`).
