"""Conversion and UI smoke checks using the installed Microsoft Edge browser."""
from pathlib import Path
from playwright.sync_api import sync_playwright, expect


with sync_playwright() as p:
    browser = p.chromium.launch(channel="msedge", headless=True)
    page = browser.new_page(viewport={"width": 1440, "height": 1000}, timezone_id="Europe/Minsk")
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.goto((Path(__file__).resolve().parents[1] / "index.html").as_uri())

    cases = [
        ("0", "auto", "Thu, 01 Jan 1970 00:00:00 GMT"),
        ("-1", "seconds", "Wed, 31 Dec 1969 23:59:59 GMT"),
        ("-1", "nanoseconds", "Wed, 31 Dec 1969 23:59:59 GMT"),
        ("1700000000000", "auto", "Tue, 14 Nov 2023 22:13:20 GMT"),
        ("1700000000000000", "auto", "Tue, 14 Nov 2023 22:13:20 GMT"),
        ("1700000000000000000", "auto", "Tue, 14 Nov 2023 22:13:20 GMT"),
    ]
    for value, unit, expected in cases:
        page.locator("#timestamp").fill(value)
        page.locator("#unit").select_option(unit)
        page.locator("#timestamp-form button[type=submit]").click()
        expect(page.locator("#timestamp-result")).to_contain_text(expected)

    for invalid in ["invalid", "", "1.5", "999999999999999999999999999999999999"]:
        page.locator("#timestamp").fill(invalid)
        page.locator("#timestamp-form button[type=submit]").click()
        expect(page.locator("#timestamp-error")).to_be_visible()
        expect(page.locator("#timestamp-result")).to_be_empty()

    page.locator("#date").fill("1970-01-01")
    page.locator("#time").fill("00:00:00")
    page.locator("#date-form button[type=submit]").click()
    expect(page.locator("#date-result code").first).to_have_text("0")
    page.locator("#local-zone").click()
    expect(page.locator("#date-result code").first).to_have_text("-10800")
    page.locator("#utc-zone").click()
    page.locator("#date").fill("2000-02-29")
    page.locator("#date-form button[type=submit]").click()
    expect(page.locator("#date-result code").first).to_have_text("951782400")
    page.locator("#date").fill("")
    page.locator("#date-form button[type=submit]").click()
    expect(page.locator("#date-error")).to_be_visible()

    page.locator("#pause").click()
    frozen = page.locator("#live-timestamp").inner_text()
    page.wait_for_timeout(1200)
    expect(page.locator("#live-timestamp")).to_have_text(frozen)
    page.locator("#pause").click()
    expect(page.locator("#live-timestamp")).not_to_have_text(frozen, timeout=2500)
    page.locator("#use-now").click()
    expect(page.locator("#timestamp-error")).to_be_hidden()
    page.locator("#copy-live").click()
    expect(page.locator("#toast")).to_have_text("Copied to clipboard")

    for width in [320, 390, 768, 1440]:
        page.set_viewport_size({"width": width, "height": 844})
        assert page.evaluate("document.documentElement.scrollWidth <= innerWidth"), f"Overflow at {width}px"

    dst = browser.new_page(timezone_id="America/New_York")
    dst.goto((Path(__file__).resolve().parents[1] / "index.html").as_uri())
    dst.locator("#local-zone").click()
    dst.locator("#date").fill("2026-03-08")
    dst.locator("#time").fill("02:30:00")
    dst.locator("#date-form button[type=submit]").click()
    expect(dst.locator("#date-error")).to_contain_text("does not exist")
    assert not errors, errors
    browser.close()
    print("Passed: timestamp units, negative values, validation, UTC/local dates, leap day, DST gap, live clock, clipboard, responsive layouts, and browser errors.")
