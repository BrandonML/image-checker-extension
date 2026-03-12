# AGENTS.md

When in doubt, prefer preserving existing behavior over simplifying or refactoring code.

## Project Overview

This repository contains a Chrome extension that inspects images on a webpage and reports information about them.

The extension provides two main modes:

- **Show All Mode**: Displays details about all images on the page.
- **Inspector Mode**: Allows the user to hover or select individual images to inspect.

## Architecture

manifest.json
Defines extension permissions, scripts, and entry points.

popup.html
UI shown when the extension icon is clicked.

popup.js
Handles popup UI logic and communication with the active tab.

background.js
Service worker that manages extension lifecycle and messaging.

imageDetails.js
Implements the logic for gathering and displaying information about all images on the page.

inspectorMode.js
Handles the interactive image inspection functionality.

icons/
Extension icon assets.

## Development Notes

This extension uses **plain JavaScript with no build system**.

Files are loaded directly by Chrome according to `manifest.json`.

There are no external dependencies.

This extension uses Manifest V3.

Background logic runs in a service worker.

## Testing Changes

To test changes:

1. Open Chrome
2. Navigate to `chrome://extensions`
3. Enable **Developer Mode**
4. Click **Load unpacked**
5. Select the repository folder
6. Reload the extension after making changes

## Coding Guidelines

- Keep the extension dependency-free.
- Avoid adding build tools unless absolutely necessary.
- Maintain clear separation between popup UI logic and page inspection logic.
- Avoid modifying `manifest.json` unless required for functionality.

## Safe Changes

Agents may safely:

- Improve image detection logic
- Improve UI in popup.html
- Fix bugs in inspector or show-all modes
- Improve code clarity and comments

Agents should avoid:

- Adding new frameworks
- Adding external dependencies
- Changing extension permissions without justification

## Change Safety Rules

The agent must treat existing functionality as intentional unless explicitly told otherwise.

If a requested task appears to require removing or altering existing behavior, the agent must:

1. Explain what functionality would change or be removed.
2. Explain why the change appears necessary.
3. Pause and request confirmation before proceeding.

Example scenario:
If a task involves modifying image type filters, the agent must ensure that existing logic that identifies images (including logic that checks MIME types or data URLs for images without file extensions) is preserved unless explicitly instructed otherwise.

The agent should not remove or replace existing detection logic simply because filter options become static.

Existing functionality should be preserved whenever possible.

## Proposing Better Approaches

If the agent believes there is a significantly better approach to completing a task (for example: simpler logic, better performance, cleaner architecture, or fewer edge cases), the agent should:

1. Briefly explain the proposed improvement.
2. Explain why it may be better.
3. Ask for approval before implementing the alternative.

The agent should not silently change the scope or strategy of the requested task without informing the user.

## Environment and Repository Access Issues

If the agent encounters problems that prevent normal work, such as:

- inability to access parts of the repository
- missing files
- permission errors
- inability to build or run tests
- environment setup failures

the agent should:

1. Clearly explain the problem.
2. Explain what action failed.
3. Suggest possible solutions or configuration changes.

The agent should not attempt to bypass errors by making unrelated changes to the codebase.