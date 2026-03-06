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
