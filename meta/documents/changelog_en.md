# Release notes BERMARO Tracking

## 1.0.16 (2026-10-23)

- cfour format: on item pages the global `singleItem` variable is already available when "globalValues" is pushed (preparation for firing the remarketing tag on "globalValues" instead of "Window Loaded").

## 1.0.15 (2026-10-23)

- cfour format: on item pages the global JavaScript variable `singleItem` is set as well (like the previous plugin); the remarketing variables of the pelletgrill.rocks / B2B containers read `singleItem[0].*` directly.

## 1.0.14 (2026-10-23)

- cfour format (pelletgrill.rocks, B2B): "globalValues" and the item view ("singleItemView") are now always pushed BEFORE the Tag Manager event "Window Loaded" (gtm.load), which the Google Ads remarketing tag uses (previously ecomm_pagetype "other" on cached pages).

## 1.0.13 (2026-10-22)

- Google Consent Mode "Advanced" now reliably reports the real consent state from the plentyShop cookie bar. If another script (e.g. Shoplytics) sends "denied" afterwards, the real state is re-sent immediately (purchases and Google Ads conversions were otherwise sent cookieless, gcs=G100, despite consent).
- Consent mode setting labels updated ("Advanced" is recommended with Shoplytics).

## 1.0.12 (2026-10-22)

- Currency is always sent as ISO code ("EUR" instead of "€"), as required by GA4 / Google Ads and as sent by the previous plugin.

## 1.0.11 (2026-10-22)

- cfour format: category pages report pageType "categoryItem" (used by the Google Ads remarketing tag); items always send gross "price" plus "priceNet", "amount", "amountNet", "rrp", "rrpNet" and "number", matching the previous plugin.

## 1.0.10 (2026-10-22)

- Item lists: tiles that plentyShop only renders on scroll are now reported immediately (data read from the page).

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
