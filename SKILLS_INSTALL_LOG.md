# Skills Installation Log

Date: 2026-03-26 (UTC)

Installed local skills from `skills/.curated` into `/opt/codex/skills` because the network-based installer failed with `403 Forbidden` in this environment.

Installed skills count: 42

Installed skills:
- aspnet-core
- chatgpt-apps
- cloudflare-deploy
- develop-web-game
- doc
- figma
- figma-code-connect-components
- figma-create-design-system-rules
- figma-create-new-file
- figma-generate-design
- figma-generate-library
- figma-implement-design
- figma-use
- frontend-skill
- gh-address-comments
- gh-fix-ci
- imagegen
- jupyter-notebook
- linear
- netlify-deploy
- notion-knowledge-capture
- notion-meeting-intelligence
- notion-research-documentation
- notion-spec-to-implementation
- openai-docs
- pdf
- playwright
- playwright-interactive
- render-deploy
- screenshot
- security-best-practices
- security-ownership-map
- security-threat-model
- sentry
- slides
- sora
- speech
- spreadsheet
- transcribe
- vercel-deploy
- winui-app
- yeet

Note: restart Codex to pick up newly installed skills.

## Repo cleanup recommendation

The `skills/` folder in this repository is only a local source snapshot. After installation, it should be removed from the product repository to avoid unnecessary repository bloat. Runtime skills are loaded from `/opt/codex/skills`.
