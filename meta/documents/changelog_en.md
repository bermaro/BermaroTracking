# Release notes BERMARO Tracking

## 1.0.4 (2026-10-22)

- Main script is loaded async so it no longer waits behind slow third-party scripts; retry shortly after DOMContentLoaded.

## 1.0.3 (2026-10-22)

- Self-healing loader: if the main script did not start during page load, it is re-injected up to twice after the load event.

## 1.0.2 (2026-10-22)

- Fix: main script is now loaded via an inline loader, because plentyShop did not execute external script tags in the "Script.AfterScriptsLoaded" container on page load.

## 1.0.1 (2026-10-22)

- Fix: removed PHP function method_exists, which plentymarkets does not allow (deployment failed).

## 1.0.0 (2026-10-22)

- Initial release: multi-client Google Tag Manager integration with felixries, cfour and GA4 data layer formats, consent registration and Consent Mode v2.
