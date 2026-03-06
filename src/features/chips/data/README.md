# Chip CSV data

`chips.csv` is the source of truth for chip tuning fields:

- Name
- DMG
- MB
- Type
- Description
- Lag (seconds)
- Recoil (seconds)
- Effects (grammar string)

`effect-grammar.csv` documents supported effect grammar sections.


Notes:
- `MB` is explicit metadata used for folder legality checks (do not derive from DMG).
- Effects can be chained in one `Effects` field using commas (example: `step:offset=2|0,melee:offsets=1|0`).
- Invalid rows/effects are skipped at load time with a warning log (safe fallback).

