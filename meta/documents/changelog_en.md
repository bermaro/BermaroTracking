# Release notes BERMARO Tracking

## 1.0.9 (2026-10-22)

- cfour format: full category path ("A > B"), list name "Kategorieliste: …, Seite: n" and 1-based positions, matching the previous plugin.

## 1.0.8 (2026-10-22)

- Order confirmation (ShopBuilder): supports the raw order format on the server and, as a fallback, reads the order from the page (max. 60 minutes old, reported once).

## 1.0.7 (2026-10-22)

- felixries format: search pages send the search term as "search_string" (read by the GA4 event tag in GTM).

## 1.0.6 (2026-10-22)

- felixries format: sets the "consentActiveStatus" cookie exactly like the old Felix Ries plugin. The lackier-bedarf.info GTM container uses it in 13 trigger conditions (incl. Google Ads conversion).

## 1.0.5 (2026-10-22)

- Product lists are reported as soon as the visible tiles are ready (plentyShop hydrates tiles below the fold only on scroll).

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
