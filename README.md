# BERMARO Tracking – Google Tag Manager für plentyShop LTS

Eigenes Plugin der BERMARO GmbH. Es ersetzt

- auf **lackier-bedarf.info** das nicht mehr gepflegte Plugin „Google Tag Manager by felixries.de“ (Version 1.3.2),
- auf **pelletgrill.rocks** und **b2b.bermaro.de** das bisherige Tag-Manager-Plugin (Datenformat „globalValues / singleItemView / orderConfirmation“).

**Live seit 22.10.2026 (ca. 20:30–21:00 Uhr) in allen drei Shops** – zuerst Version 1.0.12, Testmodus aus; ab 1.0.13 mit Consent-Korrektur (siehe unten). Live-Plugin-Sets: lackier-bedarf = Set 18 „b2c Ceres ab 1.7.2020 BR“, pelletgrill = Set 22 „Pelletgrill.rocks 17.7.2020“, B2B = Set 23 „b2b.bermaro.de 20.7.2020“. Die alten Plugins sind dort nur **deaktiviert** (nicht gelöscht). Nach dem Live-Gang geprüft: Tag Manager je Shop genau einmal geladen, Ereignisse im Live-Shop korrekt (lackier: Liste, Warenkorb hinzufügen/entfernen, Shoplytics läuft; pelletgrill/B2B: `categoryItem`, `EUR`, Brutto-/Nettopreise). Shoplytics und Stefan Kaltenecker wurden am 22.10.2026 per E-Mail informiert.

**Gutschein-Testbestellung 22.10.2026 (lackier-bedarf.info, Auftrag 331025, wird storniert):** 1 × MIRKA Schleifteller 104,14 €, Aktionsgutschein 22NLMA (Kampagne 11) −5,00 €, Versand 0 €. dataLayer: `orderValue`/`revenue` = **99,14 €** (Warenwert brutto **nach** Gutschein), netto 83,31 €, MwSt. 15,83 €, `coupon` = 22NLMA, Auftrags-ID 331025 – stimmt mit plentymarkets überein. GA4 `purchase` (99,14 €, transaction_id 331025) und Google-Ads-Conversion (99,14 € EUR) wurden gesendet.
Dabei gefunden: Beide Treffer gingen mit `gcs=G100` raus, also „Einwilligung verweigert“, obwohl im Cookie-Banner zugestimmt war. Ursache: Shoplytics sendet `consent update: denied`, weil es die Einwilligung im (URL-kodierten) Cookie `plenty-shop-cookie` nicht findet. Lösung ab **1.0.13**: Consent Mode auf lackier-bedarf.info = **Advanced**; das Plugin schickt nach jedem fremden consent-update sofort den echten Stand aus dem Cookie-Banner hinterher.
Hinweis Kampagne 34 („Gutschein-KA ab 100€ Neue Codes“, Uptain): Codes 222QNS und 222RDQ wurden im Shop als „bereits verwendet oder ungültig“ abgelehnt, obwohl im Backend „aktiv“ – Einstellungen (Mandant Standard, Kundenklassen, Kategorien) sahen unauffällig aus; Ursache nicht abschließend geklärt.

**Prüfung Stefan Kaltenecker 23.10.2026 (pelletgrill.rocks) und Umsetzung:**
1. Remarketing-Tag (feuert bei „Window Loaded“/gtm.load) bekam bei gecachten Seiten noch keinen pageType → ab **1.0.14** werden globalValues und singleItemView garantiert vor gtm.load gesendet.
2. Consent Mode v2 war auf pelletgrill/B2B „Aus“ → auf **Advanced** gestellt (alle vier Signale, Update nach echter Banner-Auswahl). Die zusätzlichen v1-Consent-Befehle (nur ad_storage/analytics_storage) stammen **nicht vom Plugin**, sondern aus Custom-HTML-Tags im Container GTM-KVGNQMX – Entfernen/Anpassen der Trigger (Bedingung plenty-shop-cookie) ist eine Container-Änderung (Stefan/Bernd entscheiden, ob Ablehner cookielose Pings senden dürfen).
3. Remarketing auf Artikelseiten: Die Container-Variablen lesen die **globale JS-Variable `singleItem`** (nicht den dataLayer) → ab **1.0.15** setzt das Plugin `window.singleItem` wie das alte Plugin.
4. `valueBasis` wirkt nur auf Felix- und GA4-Format; `orderData.0.itemSum` im cfour-Format ist immer Warenwert brutto (nach Gutschein).

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

Test-Sets (Kopien, nicht live; „Sicherung“ = Kopie des Live-Sets vom 29.09.2026): lackier-bedarf = Set 44, pelletgrill = Set 40 („Pelletgrill Sicherung 29.09.26“), B2B = Set 41 („B2B Sicherung 29.09.2026“). In Set 40 und 41 ist BermaroTracking aktiv und „Google Tag Manager Tracking ENTERPRISE“ deaktiviert.

| Einstellung | lackier-bedarf.info | pelletgrill.rocks | b2b.bermaro.de |
|---|---|---|---|
| Container-ID | `GTM-PKMRNKBW` | `GTM-KVGNQMX` | `GTM-TVGX67G` |
| Datenformat | nur **Felix Ries** | nur **cfour** | nur **cfour** |
| Artikel-ID | Varianten-ID | Varianten-ID (= wie altes Plugin, geprüft) | Varianten-ID (= wie altes Plugin, geprüft) |
| Bestellwert | **Warenwert brutto (ohne Versand)** – wie bisher bei Felix („Brutto“) | egal (cfour nutzt Warenwert brutto) | egal |
| Consent Mode | **Advanced** (ab 1.0.13; korrigiert das „denied“ von Shoplytics) | **Advanced** (ab 23.10.2026) | **Advanced** (ab 23.10.2026) |
| Google Analytics: Schlüssel / Gruppe | `googleanalytics` / Statistik | `gtmGoogleAnalytics` / Statistik | `gtmGoogleAnalytics` / Statistik (Eintrag gibt es im Live-Shop bereits) |
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

**pelletgrill.rocks / b2b.bermaro.de:** genauso, nur statt des Felix-Ries-Plugins das Plugin **„Google Tag Manager Tracking ENTERPRISE“** deaktivieren (nicht löschen). Einstellungen laut Tabelle in Abschnitt 2. In den Test-Sets 40 und 41 ist das bereits so eingerichtet und kann als Vorlage dienen.

### 3.6 Zurück zum alten Stand (Notfall)
Im Plugin-Set **BermaroTracking deaktivieren**, das alte Plugin (lackier: „Google Tag Manager by felixries.de“, pelletgrill/B2B: „Google Tag Manager Tracking ENTERPRISE“) **wieder aktivieren**, bereitstellen. Dauer: etwa 8 Minuten.

---

## 4. Offene Punkte vor dem Live-Gang

1. ~~Bestellwert `orderValue`~~ – **geklärt:** Felix-Ries war auf „Brutto“ eingestellt → in BermaroTracking **Warenwert brutto (ohne Versand)**. Im Test-Set 44 so eingetragen.
2. ~~Artikel-ID pelletgrill/B2B~~ – **geklärt:** Das alte Plugin sendet dieselbe ID wie die Einstellung „Varianten-ID“ (z. B. 22869 auf B2B, 22547 auf pelletgrill; Abgleich mit dem Live-Shop am 22.10.2026).
3. **Warenwert mit Rabatt/Gutschein:** Das Plugin berechnet den Warenwert aus den tatsächlich berechneten Positionspreisen und zieht Aktionsgutscheine ab. Bei der Testbestellung einmal **mit Gutschein** bestellen und den Wert mit der Bestellung in plentymarkets vergleichen.
4. **Cookie `consentActiveStatus`** (nur lackier-bedarf): Der Container GTM-PKMRNKBW wertet bei 13 Auslösern (u. a. Google-Ads-Conversion) dieses Cookie aus, das bisher das Felix-Plugin setzte. BermaroTracking setzt es ab 1.0.6 identisch. Die Container von pelletgrill (GTM-KVGNQMX) und B2B (GTM-TVGX67G) wurden am 22.10.2026 geprüft: Sie werten kein Cookie des alten Plugins aus.
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
| Bestellbestätigung (Testbestellung 331024, Vorkasse, 7,52 € + 6,90 € Versand) | ✅ `Bestellbestätigung` genau einmal, `orderValue` 7,52 € (Warenwert brutto) – Google-Ads-Conversion (7,52 €), Shoplytics-Gewinn-Conversion (0,43 €), GA4-Kauf und Bing haben gefeuert (ab 1.0.8) |
| Bestätigungsseite neu geladen | ✅ keine zweite Meldung |

### Test pelletgrill.rocks (22.10.2026, Test-Set 40, Version 1.0.9)

| Prüfung | Ergebnis |
|---|---|
| Tag Manager `GTM-KVGNQMX` genau einmal geladen, `globalValues` wie im Live-Shop | ✅ |
| Kategorie „Smoker - Grills“: `itemListView` mit Kategoriepfad „Pelletgrills Pelletsmoker > Smoker - Grills“, Liste „Kategorieliste: …, Seite: 1“, Position ab 1 | ✅ – Container macht daraus `view_item_list` |
| Artikelseite: `singleItemView` | ✅ – Container macht daraus `view_item` |
| In den Warenkorb: `addToCartSingleItem` | ✅ – Container macht daraus `add_to_cart` |
| Aus dem Warenkorb löschen: `removeFromCart` | ✅ – Container macht daraus `remove_from_cart` |
| Kauf | nicht mit echter Bestellung getestet (gleicher Programmteil wie bei lackier-bedarf; dort ✅) – nach dem Live-Gang die erste echte Bestellung in Google Ads prüfen |

Hinweis: Im Warenkorb (`basketItems`, `removeFromCart`) ist das Feld `category` leer, weil plentyShop dort keine Kategorie mitliefert. Google Analytics erhält bei „aus dem Warenkorb entfernt“ deshalb keine Kategorie. Für Google Ads (Conversion, Remarketing) spielt das keine Rolle.

### Test b2b.bermaro.de (22.10.2026, Test-Set 41, Version 1.0.10)

| Prüfung | Ergebnis |
|---|---|
| Tag Manager `GTM-TVGX67G` genau einmal geladen | ✅ |
| Kategorie „Schleifen“: `itemListView` mit allen 20 Artikeln der Seite | ✅ (ab 1.0.10; vorher nur 8, weil plentyShop die unteren Kacheln erst beim Scrollen aufbaut) |
| Artikelseite: `singleItemView` | ✅ |
| In den Warenkorb: `addToCartSingleItem` genau einmal | ✅ |
| Aus dem Warenkorb löschen: `removeFromCart` | ✅ |
| Kauf | nicht mit echter Bestellung getestet – nach dem Live-Gang die erste echte Bestellung in Google Ads prüfen |

**Abgleich mit dem alten Plugin im Live-Shop b2b.bermaro.de (22.10.2026)** – daraus folgte Version 1.0.11:
- Kategorieseiten: Das alte Plugin meldet `pageType: "categoryItem"`. Der Google-Ads-Remarketing-Tag in GTM-TVGX67G **und** GTM-KVGNQMX übersetzt nur diesen Wert in „category“ → BermaroTracking meldet ab 1.0.11 ebenfalls `categoryItem`.
- Artikel: Das alte Plugin meldet `price` **brutto** und zusätzlich `priceNet`, `amount`, `amountNet`, `rrp`, `rrpNet`, `number` – auch im B2B-Shop, der netto anzeigt. Der Remarketing-Tag nimmt auf der Artikelseite `price` als Wert → ab 1.0.11 identisch.
- Währung: Das alte Plugin sendet `currency: "EUR"`. plentyShop liefert auf pelletgrill/B2B das Zeichen „€“; die GA4-Tags und die Ads-Conversion in GTM-KVGNQMX lesen `currency` → ab 1.0.12 sendet BermaroTracking ebenfalls „EUR“.
- Weitere Unterschiede ohne Wirkung auf aktive Tags (nur von abgeschalteten Universal-Analytics-Tags gelesen): `webstoreName` „Bermaro Business B2B“, Ereignis `pageCategoryArticle`, `productLink`. Das alte Plugin meldet außerdem bis zu 48 Artikel je Liste, BermaroTracking die tatsächlich angezeigten Artikel der Seite.
- Aktive Tags in GTM-TVGX67G: Google-Ads-Conversion (liest `orderData.0.orderId`, `orderData.0.itemSum`, `currency`) und Google-Ads-Remarketing (liest `pageType`, `singleItem`, `basketItems`, `basketData.0.itemSum`, `orderItems`, `orderData.0.itemSum`). Alle diese Felder liefert BermaroTracking.

### Nachtest Version 1.0.12 (22.10.2026, Test-Sets 40 und 41)

| Prüfung | pelletgrill.rocks | b2b.bermaro.de |
|---|---|---|
| `pageType` auf Kategorieseiten = `categoryItem` (wie altes Plugin) | ✅ | ✅ |
| `currency` = „EUR“ | ✅ | ✅ |
| Artikelfelder wie altes Plugin (`price` brutto, `priceNet`, `rrp`, `rrpNet`) – Werte verglichen mit dem Live-Shop | ✅ identisch (836,00 / 702,52 / 1.393,00 / 1.170,59) | ✅ identisch (6,47 / 5,44 / 10,40 / 8,74, `number` MIX1211141) |
| Alle Artikel der Kategorieseite in `itemListView` | ✅ 2 von 2 | ✅ 20 von 20 |
| GA4-Ereignisse, die der Container erzeugt (`view_item_list`, `view_item`) | ✅ | – (B2B-Container hat keine aktiven GA4-Tags) |
| Daten liegen **vor** `gtm.load` im dataLayer (der Remarketing-Tag beider Container feuert bei `gtm.load`) | ✅ | ✅ |

lackier-bedarf.info (Test-Set 44) mit 1.0.12 kurz nachgeprüft: Tag Manager `GTM-PKMRNKBW` einmal geladen, `currency` „EUR“, Kategorie „Schleifen“ mit 24 Artikeln (eingestellte Höchstzahl), Cookie `consentActiveStatus` gesetzt ✅. Alle Vorschauen im Browser wurden danach beendet.

**Beobachtungspunkt nach dem Live-Gang:** Der Google-Ads-Remarketing-Tag in GTM-KVGNQMX und GTM-TVGX67G feuert beim Ereignis `gtm.load` (Seite fertig geladen) und liest dann `pageType`, `singleItem`, `basketItems`. Das alte Plugin schrieb diese Daten direkt in die Seite; BermaroTracking schreibt sie per Skript – in allen Tests deutlich vor `gtm.load`. Startet das Skript auf einer extrem langsamen Seite erst nach dem Laden, fehlen dem Remarketing auf dieser einen Seite die Angaben (Conversion-Tracking ist davon nicht betroffen, es feuert bei `orderConfirmation`). Einmal nach dem Live-Gang im Tag-Manager-Vorschaumodus prüfen.

Abgleich mit dem Tag-Manager-Container GTM-PKMRNKBW (22.10.2026): Alle Felder, die Tags oder Auslöser tatsächlich verwenden, liefert das Plugin. Weitere vom alten Plugin bekannte Felder (z. B. `addCartName`, `visitorId`, `customerHash`, `categoryId`) werden im Container von keinem Tag benutzt.

Abgleich mit GTM-KVGNQMX (pelletgrill.rocks, 22.10.2026): Die GA4-Ereignisse erzeugt der Container selbst aus den cfour-Ereignissen (eigene HTML-Tags). Gelesen werden nur Felder, die das Plugin liefert (id, name, itemName, price, brand, category, variant, quantity, position, list, orderData, orderItems). Kein verstecktes Cookie des alten Plugins.

Abgleich mit GTM-TVGX67G (b2b.bermaro.de, 22.10.2026): Aktiv relevant sind nur Google-Ads-Conversion (orderData.0.orderId, orderData.0.itemSum, currency) und Remarketing; die übrigen Tags sind abgeschaltete Universal-Analytics-Tags.

Versionsstand: 1.0.15 (23.10.2026)
