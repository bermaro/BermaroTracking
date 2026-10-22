# BERMARO Tracking – Google Tag Manager für plentyShop LTS

Eigenes Plugin der BERMARO GmbH. Es ersetzt

- auf **lackier-bedarf.info** das nicht mehr gepflegte Plugin „Google Tag Manager by felixries.de“ (Version 1.3.2),
- auf **pelletgrill.rocks** und **b2b.bermaro.de** das bisherige Tag-Manager-Plugin (Datenformat „globalValues / singleItemView / orderConfirmation“).

Der Tag Manager selbst und die Einstellungen darin (Tags, Trigger, Shoplytics) bleiben **unverändert**. Das Plugin liefert die Daten im jeweils bisherigen Format. Deshalb muss im Tag Manager nichts umgebaut werden.

---

## 1. Was das Plugin macht

| Aufgabe | Wie |
|---|---|
| Tag Manager laden | im `<head>` jeder Seite, Container-ID je Shop einstellbar |
| Artikelliste angesehen | Kategorie- und Suchseiten |
| Klick auf Artikel in Liste | ja |
| Artikeldetailseite | ja, auch beim Wechsel der Variante |
| In den Warenkorb / heraus | ja, auch Mengenänderung im Warenkorb |
| Wunschzettel | ja |
| Warenkorbseite, Kasse, Versand-/Zahlungsart | ja |
| Bestellung (Bestellbestätigung) | ja, jede Bestellung nur einmal |
| Cookie-Banner-Einträge | Google Analytics, Google Ads, Bing, mit den **bisherigen Schlüsseln** |
| Consent Mode v2 | Aus / Basic / Advanced wählbar |
| Mandantenfähig | Einstellungen je Plugin-Set **und** optional Zuordnung je plentyId |

Ein Fehler im Plugin legt den Shop nie lahm: Jede Funktion ist abgesichert. Im Fehlerfall wird nur nichts übertragen, und es erscheint ein Eintrag im plentymarkets-Log.

---

## 2. Einstellungen je Shop

Jeder Shop hat ein eigenes Plugin-Set (lackier-bedarf = Set 18, pelletgrill = Set 22, B2B = Set 23). Die Einstellungen werden pro Plugin-Set gespeichert.

| Einstellung | lackier-bedarf.info | pelletgrill.rocks | b2b.bermaro.de |
|---|---|---|---|
| Container-ID | `GTM-PKMRNKBW` | `GTM-KVGNQMX` | `GTM-TVGX67G` |
| Datenformat | nur **Felix Ries** | nur **cfour** | nur **cfour** |
| Artikel-ID | Varianten-ID | Varianten-ID ⚠️ prüfen | Varianten-ID ⚠️ prüfen |
| Bestellwert | **Warenwert brutto (ohne Versand)** – wie bisher bei Felix („Brutto“) | egal (cfour nutzt Warenwert brutto) | egal |
| Consent Mode | Aus (Shoplytics steuert ihn) | Aus | Aus |
| Google Analytics: Schlüssel / Gruppe | `googleanalytics` / Statistik | `gtmGoogleAnalytics` / Statistik | Eintrag **aus** (gibt es dort bisher nicht) |
| Google Ads: Schlüssel / Gruppe | `googleads` / Marketing | `gtmGoogleAds` / Statistik | `gtmGoogleAds` / Statistik |
| Bing: Schlüssel / Gruppe | `bingads` / Statistik | Eintrag **aus** | Eintrag **aus** |

⚠️ **GA4-Format NIE auf lackier-bedarf.info einschalten.** Shoplytics erzeugt dort seinen eigenen GA4-dataLayer und baut daraus die Conversion „purchase PROFIT“. Ein zusätzliches `purchase`-Ereignis würde Daten doppelt zählen (Auskunft Marco Sittner, Shoplytics, 22.10.2026). Das Plugin schaltet GA4 sicherheitshalber automatisch ab, sobald Shoplytics auf der Seite erkannt wird.

**Mandanten-Zuordnung (optional):** Nur nötig, wenn sich mehrere Shops ein Plugin-Set teilen. Schreibweise:
`plentyId=GTM-ID:format ; plentyId=GTM-ID:format`
Beispiel: `22871=GTM-PKMRNKBW:felixries ; 12345=GTM-ABCDEFG:cfour`
Hinweis: lackier-bedarf.info meldet im Shop die plentyId **22871**.
Die Cookie-Banner-Schlüssel gelten immer für das ganze Plugin-Set. Shops mit unterschiedlichen Schlüsseln (lackier-bedarf vs. pelletgrill/B2B) brauchen deshalb jeweils ein eigenes Plugin-Set. Das ist heute schon so.

**Cookie-Banner-Schlüssel exakt übernehmen:** Die Schlüssel in der Tabelle wurden am 22.10.2026 direkt in den Live-Shops ausgelesen. Schon ein abweichender Groß- oder Kleinbuchstabe führt dazu, dass wiederkehrende Besucher als „nicht eingewilligt“ gelten. Auf pelletgrill/B2B würden dann keine Tags mehr auslösen.

**Schutz gegen doppelte Kaufmeldungen:**
1. Eine Bestellung wird nur auf der Bestätigungsseite direkt nach dem Bestellen gemeldet. Erkennbar ist das am Merker in der Kunden-Sitzung. Fehlt der Merker, wird höchstens 60 Minuten nach der Bestellung gemeldet.
2. Zusätzlich merkt sich der Browser die Bestellnummer, damit beim Neuladen nichts doppelt gezählt wird.
3. Im ShopBuilder-Bearbeitungsmodus wird nie ein Kauf gemeldet.

---

## 3. Installation (Schritt für Schritt)

> Die Menünamen in plentymarkets ändern sich gelegentlich. Wenn ein Menüpunkt anders heißt, nach dem sinngemäßen Begriff suchen.

### 3.1 / 3.2 Plugin in plentymarkets bekannt machen (erledigt am 22.10.2026)
Das Repository `https://github.com/bermaro/BermaroTracking` ist **öffentlich**, deshalb braucht plentymarkets keinen Zugangsschlüssel. Es ist unter **Plugins » Git** mit Branch `main` eingetragen.
Es enthält keine Passwörter oder Schlüssel – nur Programmcode. Container-IDs u. Ä. stehen nur in der Plugin-Konfiguration in plentymarkets.

**Updates:** Seit „Plugin Build 2“ zieht plentymarkets bei **jedem Bereitstellen** automatisch den neuesten Stand von `main`. Eine neue Version ist also aktiv, sobald das Plugin-Set bereitgestellt wird.

### 3.3 Testen in einer Kopie des Plugin-Sets (NICHT im Live-Set)
1. **Plugins » Plugin-Set-Übersicht**.
2. Test-Set für lackier-bedarf.info: **Set 44 „B2C Sicherung 02.10.2026 V3“** (eingerichtet am 22.10.2026; ein weiteres Kopieren ist wegen der Plugin-Set-Grenze des Tarifs nicht möglich).
3. Das Test-Set öffnen → **Plugin hinzufügen** → Quelle **Git** → **BermaroTracking** → **Installieren**.
4. In der Kopie das Plugin **„Google Tag Manager by felixries.de“ deaktivieren** (nicht löschen).
5. Auf **BermaroTracking** klicken → Einstellungen laut Tabelle in Abschnitt 2 eintragen → zusätzlich **Testmodus** anhaken → **Speichern**.
6. Reiter **Container-Verknüpfungen**: Prüfen, ob die drei Einträge verknüpft sind:
   - „BERMARO Tracking: Tag Manager laden (Kopfbereich)“ → *Page Design: After opening HTML head tag*
   - „BERMARO Tracking: Tag Manager noscript (Body)“ → *Page Design: After opening HTML body tag*
   - „BERMARO Tracking: E-Commerce-Ereignisse“ → *Script loader: After scripts loaded*
   Falls nicht: die Verknüpfungen setzen, oder in der Plugin-Set-Ansicht **„Standard-Container-Verknüpfungen“** aktivieren.
7. Plugin-Set **bereitstellen** (Deploy / Plugin-Set aktualisieren).
8. Das Test-Set im Shop **in der Vorschau** öffnen, ohne es dem Mandanten zuzuweisen: im Plugin-Set oben auf das **Auge-Symbol** → **Bermaro B2C** (= lackier-bedarf.info). Unten links erscheint der Kasten „plentyShop LTS Vorschau“. Die Vorschau gilt nur für den eigenen Browser; zum Beenden dort den Schalter ausschalten.

### 3.4 Prüfliste für den Test (mit Stefan oder Shoplytics)
1. Tag Manager → Container `GTM-PKMRNKBW` → **Vorschau** → Shop-Vorschau-URL eingeben.
2. Folgende Ereignisse müssen erscheinen:
   - Kategorieseite: `ecommerceEvent` mit `ga4Event = view_item_list`
   - Artikelseite: `ecommerceEvent` mit `ga4Event = view_item`. **Neu:** Hier kamen beim alten Plugin keine Produktdaten an.
   - In den Warenkorb: `ecommerceEvent` mit `ga4Event = add_to_cart`
   - Testbestellung (Vorkasse) → Bestellbestätigung: `ecommerceEvent` mit `eventAction = Bestellbestätigung`, `orderID`, `orderValue`. Die Tags „Google Ads Conversion“, „GA4 purchase“ und „Bing“ müssen auslösen.
   - Die Shoplytics-Ereignisse (`sl_…`, `shoplytics_…`, eigenes `view_item` und `purchase`) erscheinen weiterhin, **genau einmal**.
3. Bestätigungsseite neu laden: Es darf **kein** zweites `Bestellbestätigung`-Ereignis kommen.
4. Cookie-Banner: Die Einträge Google Analytics, Google Ads und Bing sind vorhanden. Die bisherigen Einwilligungen bleiben erhalten (gleiche Schlüssel).
5. Shoplytics nach dem Test kurz informieren (so mit Marco Sittner vereinbart).

### 3.5 Live schalten
1. Im **Live-Plugin-Set** genauso: BermaroTracking installieren, Einstellungen eintragen, **Testmodus aus**, Felix-Ries-Plugin deaktivieren, bereitstellen.
2. Shoplytics (support@shoplytics.de) Bescheid geben, damit sie das Tracking prüfen.
3. Erst nach 2 Wochen ohne Auffälligkeiten das Felix-Ries-Abo kündigen (marketplace.plentymarkets.com → Mein Konto → Verträge).

### 3.6 Zurück zum alten Stand (Notfall)
Im Plugin-Set **BermaroTracking deaktivieren**, **Felix-Ries-Plugin wieder aktivieren**, bereitstellen. Dauer: etwa 5 Minuten.

---

## 4. Offene Punkte vor dem Live-Gang

1. ~~Bestellwert `orderValue`~~ – **geklärt:** Felix-Ries war auf „Brutto“ eingestellt → in BermaroTracking **Warenwert brutto (ohne Versand)**. Im Test-Set 44 so eingetragen.
2. **Artikel-ID pelletgrill/B2B**: Muss zur ID im Google-Shopping-Feed des jeweiligen Shops passen (Varianten-ID, Artikel-ID oder Variantennummer). Mit Stefan klären.
3. **Warenwert mit Rabatt/Gutschein:** Das Plugin berechnet den Warenwert aus den tatsächlich berechneten Positionspreisen und zieht Aktionsgutscheine ab. Bei der Testbestellung einmal **mit Gutschein** bestellen und den Wert mit der Bestellung in plentymarkets vergleichen.
4. **Cookie `consentActiveStatus`** (nur lackier-bedarf): Der Container GTM-PKMRNKBW wertet bei 13 Auslösern (u. a. Google-Ads-Conversion) dieses Cookie aus, das bisher das Felix-Plugin setzte. BermaroTracking setzt es ab 1.0.6 identisch. Bei pelletgrill/B2B vor dem Umstieg prüfen, ob deren Container ähnliche Cookies des alten Plugins auswerten.
5. **B2B-Container `GTM-TVGX67G`** nutzt noch Universal-Analytics-Tags. Universal Analytics wurde von Google 2024 abgeschaltet, dort kommen also keine Analytics-Daten mehr an. Das hat mit dem Plugin nichts zu tun, sollte aber mit Stefan besprochen werden.

---

## 5. Aufbau der Dateien

```
BermaroTracking/
├── plugin.json                         Plugin-Beschreibung für plentymarkets
├── config.json                         Einstellungsmaske im plentymarkets-Backend
├── src/Providers/BermaroTrackingServiceProvider.php   Start, Cookie-Banner-Einträge
├── src/Containers/HeadContainer.php    Tag Manager im <head>
├── src/Containers/BodyContainer.php    noscript-Ersatz
├── src/Containers/ScriptContainer.php  Tracking-Skript + Bestelldaten
├── src/Helpers/TrackingConfig.php      Einstellungen + Mandanten-Zuordnung
├── src/Helpers/OrderDataBuilder.php    Bestelldaten aufbereiten
├── resources/views/*.twig              HTML-Bausteine
├── resources/js/bermaro-tracking.js    Ereignisse im Browser
└── resources/lang/de|en/*.properties   Texte (deutsch/englisch)
```

## 6. Testergebnisse (22.10.2026, Test-Set 44, Vorschau lackier-bedarf.info)

| Prüfung | Ergebnis |
|---|---|
| Bereitstellung / PHP-Prüfung von plentymarkets | ✅ (ab 1.0.1) |
| Tag Manager `GTM-PKMRNKBW` wird genau **einmal** geladen | ✅ |
| Seitenaufruf `facebookEvent / PageView` | ✅ |
| Kategorieseite `Produktimpression` (Preis = angezeigter Preis) | ✅ |
| Artikelseite `Produktdetailseite` | ✅ |
| In den Warenkorb `addToCart` (genau einmal) | ✅ |
| Warenkorbseite `Warenkorb` | ✅ |
| Shoplytics-Ereignisse laufen unverändert weiter | ✅ |
| Vergleich mit Live-Shop (altes Felix-Plugin), Kategorie „Staubsaugen“ | ✅ identisch (gleiche 12 Artikel, gleiche Felder) |
| Cookie `consentActiveStatus` (wird vom Tag Manager für 13 Auslöser gebraucht) | ✅ Zeichen für Zeichen wie beim alten Plugin (ab 1.0.6) |
| Bestellbestätigung | ⏳ nur mit echter Testbestellung prüfbar |

Abgleich mit dem Tag-Manager-Container GTM-PKMRNKBW (22.10.2026): Alle Felder, die Tags oder Auslöser tatsächlich verwenden, liefert das Plugin. Weitere vom alten Plugin bekannte Felder (z. B. `addCartName`, `visitorId`, `customerHash`, `categoryId`) werden im Container von keinem Tag benutzt.

Versionsstand: 1.0.7 (22.10.2026)
