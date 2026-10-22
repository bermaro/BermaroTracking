# Versionshinweise BERMARO Tracking

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
