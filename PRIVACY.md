# WindPanel Privacy Policy

Effective date: May 22, 2026

WindPanel is a browser extension for inspecting and editing Tailwind CSS theme variables on the current website. This policy explains what data the extension accesses, stores, and does not collect.

## Single Purpose

WindPanel detects Tailwind CSS theme variables on web pages and provides an in-page panel for previewing, editing, importing, exporting, and saving theme presets locally.

## Data Access

WindPanel runs a content script on websites so it can detect CSS custom properties and theme mode selectors such as `:root`, `.dark`, or other page-defined mode selectors. It reads the page's CSS theme variables, the active theme mode from the document HTML/body state, and related style information needed to render previews and apply local theme edits.

WindPanel does not collect browsing history, page text content, account data, passwords, payment data, health data, location data, personal communications, or personally identifiable information.

## Local Storage

WindPanel uses Chrome extension storage only to save user-created or imported theme presets. Stored preset data may include preset names, CSS variable names, CSS variable values, mode labels/selectors, and timestamps used to manage those presets.

This data stays in the user's browser through Chrome's extension storage. WindPanel does not transmit saved presets to the developer or to any third-party service.

## Remote Code

WindPanel does not use remote JavaScript or remote WebAssembly. All extension code is packaged with the extension.

## Data Sharing

WindPanel does not sell, transfer, or share user data with third parties.

WindPanel does not use user data for purposes unrelated to its single purpose.

WindPanel does not use user data to determine creditworthiness or for lending purposes.

## Network Requests

WindPanel does not require network requests to provide its core functionality. Marketplace and external sharing features are planned for future development, but they are not part of the current extension behavior described by this policy.

## Contact

For privacy questions, open an issue in the WindPanel project repository or contact the project maintainer through the repository's published support channel.
