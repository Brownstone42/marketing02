# Higgsfield CLI — Reference

## Binary name

The CLI binary is `hf`, not `higgsfield`.

The npm install of `@higgsfield/cli` fails on Windows because the post-install script runs `tar` on a path containing `@higgsfield` — Windows tar interprets `@` as a remote connection prefix. The binary was manually downloaded and placed at `C:\Users\anawa\AppData\Roaming\npm\hf.exe`.

**Always use `hf` in Bash calls and in backend `child_process` code.**  
`higgsfield` works only in PowerShell (via patched `.ps1` shim). The skills in `.agents/skills/` use `higgsfield` in their examples — substitute `hf` when executing in Bash.

## Common commands

```bash
hf generate create gpt_image_2 --prompt "..." --aspect_ratio 1:1 --resolution 2k --wait
hf generate create seedance_2_0 --prompt "..." --duration 12 --wait
hf model list --json        # discover available models
hf generate list --json     # list past jobs
```

`hf auth login` is interactive — must be run by the user, not spawned from code.

## Model defaults for marketing

**Testing/budget phase — use these until further notice:**

| Task | Model | Note |
|---|---|---|
| Product shots, banners, text-on-image | `nano_banana_2` | cheaper than `gpt_image_2`; step up to `nano_banana_pro` for hard cases |
| General video | `kling3_0` | budget alternative; avoid `seedance_2_0` — too expensive for testing |
| Branded ad video with avatar + product | `marketing_studio_video` | unchanged |

`seedance_2_0` and `gpt_image_2` are production-quality defaults — do not use during testing phase.

## Prompt structure (product photography)

`[subject] on [surface], [lighting], [composition style], [photography style], [brand feel]`

Example: `luxury skincare cream jar on white marble background, soft natural side lighting, minimal clean composition, professional product photography, high-end beauty brand aesthetic`

## Installed skills

Located at `.agents/skills/`, symlinked for Claude Code:
- `higgsfield-generate` — general image/video generation
- `higgsfield-marketplace-cards` — marketplace card graphics
- `higgsfield-product-photoshoot` — product photography style
- `higgsfield-soul-id` — character/portrait consistency
