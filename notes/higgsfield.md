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

## Correct model IDs (verified via hf model list)

| Display Name | job_set_type | Type |
|---|---|---|
| Nano Banana Pro | `nano_banana_2` | image |
| Nano Banana 2 | `nano_banana_flash` | image |
| Flux Kontext | `flux_kontext` | image |
| FLUX.2 | `flux_2` | image |
| Kling O1 Image | `kling_omni_image` | image |
| GPT Image 2 | `gpt_image_2` | image |
| Kling v3.0 | `kling3_0` | video |
| Kling 2.6 | `kling2_6` | video |
| Marketing Studio Video | `marketing_studio_video` | video |
| Seedance 2.0 | `seedance_2_0` | video |

**Note:** `nano_banana_pro` does not exist — `nano_banana_2` IS the Pro model. `kling3_0` is video only.

## Model defaults for marketing

**Testing/budget phase — use these until further notice:**

| Task | Model | Note |
|---|---|---|
| Character/portrait image | `nano_banana_2` | Nano Banana Pro — best for reference-based character work |
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
