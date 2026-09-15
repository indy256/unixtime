# Unix time

A responsive, dependency-free timestamp converter, inspired by the functionality of [unixtimestamp.com](https://www.unixtimestamp.com/) and the visual style of [PDF editor](https://pdf-editor.indy256.com/).

## Open

Open `index.html` in a modern browser. No installation or build is required. To serve locally on Windows:

```powershell
py -m http.server 8000
```

Then visit http://localhost:8000.

## Features

- Live Unix clock with pause and copy controls.
- Timestamp conversion with automatic or explicit units: seconds, milliseconds, microseconds, and nanoseconds.
- Date conversion in UTC or your browser's local timezone.
- Copyable timestamps and live UTC, local, ISO 8601, and RFC 2822 reference formats.
- Input validation, negative timestamps, mobile layouts, and keyboard controls.

All conversion runs locally, with no external scripts, fonts, or services. Timestamp input uses integer arithmetic to avoid rounding large microsecond/nanosecond values; date display has millisecond precision. Auto-detection uses digit count; select units explicitly for historical or unusually large values. During a repeated local time at the end of daylight saving time, the earlier offset is used.

## Browser checks

With Python, Playwright (`py -m pip install playwright`), and Microsoft Edge installed:

```powershell
py tests/browser_check.py
```
