import os
import time
from playwright.sync_api import sync_playwright

def verify_extension():
    extension_path = os.getcwd()
    test_page_path = f"file://{os.path.join(extension_path, 'verification/test.html')}"

    with sync_playwright() as p:
        browser = p.chromium.launch_persistent_context(
            "",
            headless=False,
            args=[
                f"--disable-extensions-except={extension_path}",
                f"--load-extension={extension_path}",
            ],
        )

        page = browser.new_page()
        page.goto(test_page_path)

        print("Injecting scripts...")

        # Mock chrome.storage.local.get to avoid the error in headless-ish environment
        # and provide default settings
        page.evaluate("""
            window.chrome = window.chrome || {};
            window.chrome.storage = window.chrome.storage || {};
            window.chrome.storage.local = {
                get: (keys, callback) => {
                    callback({
                        filterSettings: {
                            allowedTypes: ['jpeg', 'png', 'gif', 'svg', 'webp'],
                            minSize: 0,
                            aspectRatioMode: 'any',
                            aspectRatioValue: '1:1'
                        }
                    });
                }
            };
            window.chrome.runtime = window.chrome.runtime || {};
            window.chrome.runtime.sendMessage = (msg, callback) => {
                if (callback) callback(null);
            };
        """)

        # Simulate 'Show All' mode
        page.evaluate("window.imageDetailsOverlayApiOnly = false;")

        # Inject imageUtils.js
        with open("imageUtils.js", "r") as f:
            page.evaluate(f.read())

        # Inject imageDetails.js
        with open("imageDetails.js", "r") as f:
            page.evaluate(f.read())

        # Wait for overlays to appear
        time.sleep(2)

        # Check if overlays exist
        overlays_count = page.locator(".image-details-overlay").count()
        print(f"Found {overlays_count} overlays.")

        page.screenshot(path="verification/show_all_result.png")

        # Now test Inspector mode simulation
        print("Testing Inspector mode simulation...")
        # Clear overlays first
        page.evaluate("window.imageDetailsAPI.clearAllOverlays();")

        # Inject inspectorMode.js
        with open("inspectorMode.js", "r") as f:
            page.evaluate(f.read())

        # Hover over an image
        page.hover("#img1")
        time.sleep(1)

        # Check if overlay appeared
        inspector_overlay_count = page.locator(".image-details-overlay").count()
        print(f"Found {inspector_overlay_count} overlays after hover.")

        page.screenshot(path="verification/inspector_hover_result.png")

        browser.close()

if __name__ == "__main__":
    verify_extension()
