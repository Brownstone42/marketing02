---
name: my-plugins
description: Personal plugin reference — shows the user's curated list of useful Claude Code plugins, what each one does, when to use it, and the exact install command. Use this skill when the user asks "what plugins do I have?", "which plugins should I install?", "how do I install frontend-design?", or whenever starting a new project and deciding which plugins to set up.
---

# My Plugins Reference

Display this list clearly when invoked. The user keeps this updated as they discover new plugins they like.

---

## Installed & Trusted Plugins

### frontend-design
**Source:** `claude-plugins-official`
**Install:** `/plugin install frontend-design@claude-plugins-official`
**Then:** `/reload-plugins`

**What it does:** Guides Claude to build frontend interfaces with intentional, non-generic design. Avoids cookie-cutter SaaS aesthetics — pushes for distinctive typography, considered spacing, real color commitment, and subtle motion.

**Use when:**
- Starting any new web UI from scratch
- Wanting to restyle an existing component or page
- The current design feels generic or "AI-generated"

**How to invoke after installing:** `/frontend-design <describe what you want to build or restyle>`

**Tip:** Tell it your aesthetic preference upfront — "keep it minimal", "dark and technical", "warm and editorial" — so it commits to the right direction.

---

## How to Update This List

When you install a new plugin you want to remember, say:

> "add [plugin-name] to my-plugins skill"

Claude will use `skill-creator` to update this file with the plugin's details.

This skill lives at `.agents/skills/my-plugins/SKILL.md`. Copy that folder into any new project to bring this reference with you.
