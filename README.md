# Outfit Switcher for SillyTavern

Outfit Switcher keeps things deliberately focused on one character while matching the automatic convenience of the Outfit Lab. Configure the folders you care about and the extension will swap outfits in real time as chat messages stream in, just like Costume Switcher’s automation, while still exposing quick manual overrides when you need them.

## Features

- **Single character focus** – Configure one character name for clarity while the extension concentrates on outfit management.
- **Hands-free streaming detection** – Outfit Switcher watches every generated token and fires the mapped outfit the moment a trigger phrase appears, mirroring the Outfit Lab’s real-time swaps.
- **Manual triggers** – Use the settings panel buttons or the `/outfitswitch &lt;trigger&gt;` slash command to launch a specific outfit instantly whenever you want to override automation.
- **Safe costume calls** – The extension never issues commands that change the active speaker. Every action resolves to a `/costume` update for the configured character.
- **Default outfit shortcut** – Store a fallback folder and fire it from the UI with one click.

## Getting Started

1. Enable the extension in **Settings → Extensions**.
2. Open the Outfit Switcher drawer.
3. Enter your focus character’s name (for reference) and optional default outfit.
4. Add trigger rows. Each trigger name pairs with the outfit folder you want to show.
5. Press **Run** next to a trigger or type `/outfitswitch &lt;trigger&gt;` in chat to switch outfits.

That’s it—no background detection or complex configuration required.

## Slash Command Reference

| Command | Description |
| --- | --- |
| `/outfitswitch <trigger>` | Switch to the outfit mapped to `<trigger>`. The command is ignored when the extension is disabled or the trigger is unknown. |

## Development

- Run `npm test` to execute the lightweight unit tests for the trigger helpers.
- All configuration is stored under the `SillyTavern-CostumeSwitch` extension namespace.
