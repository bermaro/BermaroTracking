# Versionshinweise BERMARO Tracking

## 1.0.14 (23.10.2026)

- cfour-Format (pelletgrill.rocks, B2B): "globalValues" und die Artikelansicht ("singleItemView") werden jetzt garantiert VOR dem Tag-Manager-Ereignis "Window Loaded" (gtm.load) gesendet. Das Google-Ads-Remarketing-Tag feuert bei gtm.load und bekam vorher bei gecachten Seiten noch keinen Seitentyp (ecomm_pagetype "other", leere ecomm_prodid). Hinweis von Stefan Kaltenecker.
- Technisch: Das Kopf-Skript meldet sich als Erstes beim "load"-Ereignis an (vor dem Tag Manager) und lässt ausstehende Daten sofort senden. globalValues wird pro Seite nur einmal gesendet.

## 1.0.13 (22.10.2026)

- Google Consent Mode "Advanced" meldet Google jetzt zuverlässig den echten Einwilligungsstand aus dem plentyShop-Cookie-Banner. Sendet ein anderes Skript (z. B. Shoplytics) danach "denied", wird sofort der echte Stand hinterhergeschickt. Hintergrund: Auf lackier-bedarf.info gingen Käufe und Google-Ads-Conversions sonst trotz Zustimmung "ohne Cookies" (gcs=G100) raus.
- Beschriftung der Consent-Mode-Einstellung angepasst ("Advanced" ist bei Shoplytics die empfohlene Wahl).

## 1.0.12 (22.10.2026)

- Währung immer als ISO-Code ("EUR" statt "€"). pelletgrill.rocks und b2b.bermaro.de liefern im Shop das Zeichen "€"; Google Analytics 4 und Google Ads brauchen "EUR" (das bisherige Plugin sendete ebenfalls "EUR").

## 1.0.11 (22.10.2026)

- cfour-Format (pelletgrill.rocks, B2B), Abgleich mit dem bisherigen Plugin im Live-Shop b2b.bermaro.de:
  - Kategorieseiten melden "pageType": "categoryItem" (wird vom Google-Ads-Remarketing-Tag beider Container ausgewertet).
  - Artikel: "price" immer brutto, zusätzlich "priceNet", "amount", "amountNet", "rrp", "rrpNet" und "number" – auch im B2B-Shop mit Nettoanzeige.
  - Bestellung: Positionspreise brutto + "priceNet" (wie bisher beim alten Plugin).

## 1.0.10 (22.10.2026)

- Artikellisten: Auch Artikelkacheln, die plentyShop erst beim Scrollen aufbaut, werden jetzt sofort mitgemeldet (Daten aus der Seite gelesen). Vorher kamen z. B. auf b2b.bermaro.de nur 8 von 20 Artikeln an.

## 1.0.9 (22.10.2026)

- cfour-Format (pelletgrill.rocks, B2B): Kategorie als vollständiger Pfad ("A > B"), Listenname "Kategorieliste: …, Seite: n" und Position ab 1 – wie beim bisherigen Plugin (Abgleich mit dem Live-Shop).

## 1.0.8 (22.10.2026)

- Bestellbestätigung (ShopBuilder): plentyShop übergibt dort teils die rohe Bestellung. Das Plugin erkennt jetzt beide Formen auf dem Server und liest die Bestellung zusätzlich als Sicherheitsnetz direkt aus der Seite (höchstens 60 Minuten alte Bestellungen, jede nur einmal).

## 1.0.7 (22.10.2026)

- Felix-Format: Auf Suchseiten wird der Suchbegriff als "search_string" mitgesendet (wird im Tag Manager vom GA4-Ereignis-Tag gelesen).

## 1.0.6 (22.10.2026)

- Felix-Format: Cookie "consentActiveStatus" wird wie beim alten Felix-Ries-Plugin gesetzt. Der Tag-Manager-Container von lackier-bedarf.info prüft damit vor 13 Auslösern (u. a. Google-Ads-Conversion) die Einwilligung – ohne das Cookie würden diese Tags bei neuen Besuchern nicht feuern.

## 1.0.5 (22.10.2026)

- Produktlisten werden gemeldet, sobald die sichtbaren Kacheln fertig sind (plentyShop baut Kacheln unterhalb des sichtbaren Bereichs erst beim Scrollen auf).

## 1.0.4 (22.10.2026)

- Haupt-Skript wird unabhängig (async) geladen, damit es nicht hinter langsamen Fremd-Skripten wartet; Nachladen schon kurz nach DOMContentLoaded.

## 1.0.3 (22.10.2026)

- Lader selbstheilend: Startet das Haupt-Skript beim Seitenaufbau nicht, wird es nach dem Laden der Seite bis zu zweimal nachgeladen.

## 1.0.2 (22.10.2026)

- Korrektur: Haupt-Skript wird jetzt per Inline-Lader eingebunden, weil plentyShop externe Skript-Tags im Container "Script.AfterScriptsLoaded" beim Seitenaufbau nicht ausführte.

## 1.0.1 (22.10.2026)

- Korrektur: Die von plentymarkets nicht erlaubte PHP-Funktion method_exists entfernt (Bereitstellung schlug fehl).

## 1.0.0 (22.10.2026)

- Erste Version.
- Tag-Manager-Einbindung, mandantenfähig (pro Plugin-Set und optional pro plentyId).
- Datenformate: Felix Ries (lackier-bedarf.info), cfour (pelletgrill.rocks, B2B), GA4-Standard.
- Ereignisse: Produktliste, Produktklick, Artikelansicht, Warenkorb (hinzufügen/entfernen/Menge), Wunschzettel, Warenkorbseite, Kasse, Versand-/Zahlungsart, Bestellung.
- Cookie-Banner-Einträge mit einstellbaren Schlüsseln, Consent Mode v2 (Aus/Basic/Advanced).
- Schutz vor doppelten Bestellmeldungen und vor doppelten GA4-Daten bei Shoplytics.
