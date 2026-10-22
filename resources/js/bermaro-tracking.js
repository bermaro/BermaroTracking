/**
 * BERMARO Tracking – Übergabe der Shop-Ereignisse an den Google Tag Manager
 * --------------------------------------------------------------------------
 * Dieses Skript beobachtet plentyShop LTS (Artikelansicht, Warenkorb, Kasse,
 * Bestellung) und schreibt die passenden Ereignisse in den "dataLayer".
 * Der Google Tag Manager liest den dataLayer und verteilt die Daten an
 * Google Ads, Google Analytics, Bing, Shoplytics usw.
 *
 * Drei Datenformate sind möglich (in der Plugin-Konfiguration wählbar):
 *  - "felixries": genau wie das bisherige Plugin von felixries.de
 *                 (lackier-bedarf.info, Container GTM-PKMRNKBW)
 *  - "cfour":     wie das bisherige Tag-Manager-Plugin auf pelletgrill.rocks
 *                 und b2b.bermaro.de (Container GTM-KVGNQMX / GTM-TVGX67G)
 *  - "ga4":       aktueller Google-Standard (GA4-E-Commerce)
 *
 * Grundregel: Ein Fehler im Tracking darf den Shop NIE stören. Darum ist jede
 * Funktion in try/catch eingepackt.
 */
(function (window, document) {
    "use strict";

    var cfg = window.BermaroTrackingConfig;
    if (!cfg || !cfg.active || window.BermaroTrackingStarted) {
        return;
    }
    window.BermaroTrackingStarted = true;

    var dataLayer = window.dataLayer = window.dataLayer || [];
    var formats = cfg.formats || [];
    var enabledEvents = cfg.events || [];
    var USE_FELIX = formats.indexOf("felixries") !== -1;
    var USE_CFOUR = formats.indexOf("cfour") !== -1;
    var USE_GA4 = formats.indexOf("ga4") !== -1;

    /*
     * Schutz für Shoplytics (Auskunft Marco Sittner, Shoplytics, 22.10.2026):
     * Shoplytics baut seinen eigenen GA4-dataLayer (view_item, purchase ...) und daraus die
     * Conversion "purchase PROFIT". Würde dieses Plugin zusätzlich GA4-Ereignisse wie
     * "purchase" senden, wären die Daten in Shoplytics teilweise doppelt.
     * Darum: Ist Shoplytics im Shop eingebunden, wird das GA4-Format automatisch abgeschaltet.
     * Geprüft wird bei JEDEM GA4-Ereignis (Shoplytics kann auch später nachgeladen werden):
     * Shoplytics-Skript auf der Seite ODER Shoplytics-Einträge im dataLayer.
     * Die Formate "felixries" ("ecommerceEvent") und "cfour" stören Shoplytics nicht.
     */
    var shoplyticsWarned = false;

    function shoplyticsPresent() {
        var found = !!(document.querySelector && document.querySelector("script[src*='shoplytics']"));
        if (!found) {
            for (var i = 0; i < dataLayer.length; i++) {
                var entry = dataLayer[i];
                if (entry && typeof entry.event === "string" && /^(sl_|shoplytics_)/.test(entry.event)) {
                    found = true;
                    break;
                }
            }
        }
        if (found && !shoplyticsWarned && window.console && window.console.warn) {
            shoplyticsWarned = true;
            window.console.warn("[BermaroTracking] GA4-Format abgeschaltet, weil Shoplytics im Shop aktiv ist (sonst doppelte Daten).");
        }
        return found;
    }

    /* ------------------------------------------------------------------ */
    /* Allgemeine Hilfsfunktionen                                          */
    /* ------------------------------------------------------------------ */

    /** Meldung in der Browser-Konsole (nur im Testmodus) */
    function log() {
        if (!cfg.debug || !window.console || !window.console.log) {
            return;
        }
        var args = Array.prototype.slice.call(arguments);
        args.unshift("[BermaroTracking]");
        window.console.log.apply(window.console, args);
    }

    /** Fehler abfangen, damit der Shop weiterläuft */
    function safe(name, fn) {
        return function () {
            try {
                return fn.apply(this, arguments);
            } catch (error) {
                log("Fehler in " + name + ":", error);
                return undefined;
            }
        };
    }

    /** In den dataLayer schreiben */
    function push(data) {
        dataLayer.push(data);
        log("dataLayer.push", data);
    }

    /** Ist eine Ereignis-Gruppe in der Konfiguration eingeschaltet? */
    function isEnabled(name) {
        return enabledEvents.indexOf(name) !== -1;
    }

    /** Eindeutige Ereignis-ID (wie beim Felix-Ries-Plugin) */
    function newEventId() {
        return Date.now().toString(16) + "." + String(Math.random()).slice(2);
    }

    /** Zahl mit 2 Nachkommastellen */
    function toNumber(value) {
        var number = parseFloat(value);
        return isFinite(number) ? Math.round(number * 100) / 100 : 0;
    }

    /** Text (null/undefined => leer) */
    function toText(value) {
        return (value === undefined || value === null) ? "" : String(value);
    }

    /** Verschachtelten Wert sicher auslesen, z. B. get(daten, "texts.name1", "") */
    function get(object, path, fallback) {
        var parts = path.split(".");
        var current = object;
        for (var i = 0; i < parts.length; i++) {
            if (current === null || current === undefined) {
                return fallback;
            }
            current = current[parts[i]];
        }
        return (current === undefined || current === null) ? fallback : current;
    }

    /** Liste umwandeln (ohne moderne Array-Funktionen vorauszusetzen) */
    function map(list, fn) {
        var result = [];
        for (var i = 0; i < (list || []).length; i++) {
            result.push(fn(list[i], i));
        }
        return result;
    }

    /** plentyShop-Store (Warenkorb, Artikel, Einwilligungen usw.) */
    function store() {
        return window.ceresStore || null;
    }

    /** Seitentyp laut plentyShop: home, item, category, search, basket, checkout, confirmation ... */
    function templateType() {
        return toText(get(window, "App.templateType", ""));
    }

    /** Aktuelle Währung */
    function currency() {
        return toText(get(window, "App.activeCurrency", "")) || "EUR";
    }

    /** Shop-Name für "affiliation" */
    function affiliation() {
        return cfg.affiliation || window.location.hostname.replace(/^www\./, "");
    }

    /**
     * Wartet, bis eine Bedingung erfüllt ist (max. "tries" Versuche im Abstand "delay" ms).
     * "onTimeout" (optional) wird aufgerufen, wenn die Bedingung nie erfüllt wurde.
     */
    function waitFor(check, onReady, tries, delay, onTimeout) {
        var attempt = 0;
        (function next() {
            var result = false;
            try {
                result = check();
            } catch (error) {
                result = false;
            }
            if (result) {
                onReady(result);
                return;
            }
            attempt++;
            if (attempt < tries) {
                window.setTimeout(next, delay);
            } else if (typeof onTimeout === "function") {
                onTimeout();
            } else {
                log("Zeitüberschreitung beim Warten");
            }
        })();
    }

    /* ------------------------------------------------------------------ */
    /* Artikel-Daten vereinheitlichen                                      */
    /* ------------------------------------------------------------------ */

    /** Attributwerte als Text, z. B. "1,4 mm" */
    function attributeText(doc) {
        var parts = [];
        var attributes = get(doc, "attributes", []);
        for (var i = 0; i < attributes.length; i++) {
            var name = get(attributes[i], "value.names.name", "");
            if (name) {
                parts.push(name);
            }
        }
        return parts.join(", ");
    }

    /** Angezeigter Preis eines Artikels (Sonderangebot hat Vorrang) */
    function displayedPrice(doc) {
        var price = get(doc, "prices.specialOffer.price.value", null);
        if (price === null) {
            price = get(doc, "prices.default.price.value", null);
        }
        if (price === null) {
            price = get(doc, "prices.default.unitPrice.value", 0);
        }
        return toNumber(price);
    }

    /** Artikel aus einem plentyShop-Variantendokument (Artikelseite, Kacheln, Warenkorb) */
    function productFromDocument(doc) {
        if (!doc || !doc.variation) {
            return null;
        }
        return {
            variationId: get(doc, "variation.id", 0),
            itemId: get(doc, "item.id", 0),
            number: toText(get(doc, "variation.number", "")),
            name: toText(get(doc, "texts.name1", "") || get(doc, "texts.name2", "") || get(doc, "texts.name3", "")),
            brand: toText(get(doc, "item.manufacturer.externalName", "") || get(doc, "item.manufacturer.name", "")),
            price: displayedPrice(doc),
            variant: attributeText(doc),
            category: "",
            categoryPath: [],
            quantity: 1,
            url: ""
        };
    }

    /** Artikel aus einer Warenkorb-Position */
    function productFromBasketItem(basketItem) {
        var product = productFromDocument(get(basketItem, "variation.data", null)) || {
            variationId: 0, itemId: 0, number: "", name: "", brand: "", variant: "",
            category: "", categoryPath: [], url: ""
        };
        product.variationId = basketItem.variationId || product.variationId;
        product.itemId = basketItem.itemId || product.itemId;
        product.price = toNumber(basketItem.price);
        product.quantity = toNumber(basketItem.quantity) || 1;
        product.basketItemId = basketItem.id;
        return product;
    }

    /** Artikel aus der Bestellung (vom Server) */
    function productFromOrderItem(orderItem, useNetPrices) {
        return {
            variationId: orderItem.variationId,
            itemId: orderItem.itemId,
            number: toText(orderItem.number),
            name: toText(orderItem.name),
            brand: toText(orderItem.brand),
            price: toNumber(useNetPrices ? orderItem.priceNet : orderItem.priceGross),
            priceGross: toNumber(orderItem.priceGross),
            priceNet: toNumber(orderItem.priceNet),
            variant: toText(orderItem.variant),
            category: "",
            categoryPath: [],
            quantity: toNumber(orderItem.quantity) || 1,
            url: ""
        };
    }

    /** Artikel-ID je nach Einstellung (Varianten-ID, Artikel-ID oder Variantennummer) */
    function productId(product) {
        if (cfg.idSource === "itemId") {
            return toText(product.itemId);
        }
        if (cfg.idSource === "variationNumber") {
            return toText(product.number || product.variationId);
        }
        return toText(product.variationId);
    }

    /** ID als Zahl, wenn möglich (Felix-Format für content_ids) */
    function productIdValue(product) {
        var id = productId(product);
        return /^\d+$/.test(id) ? parseInt(id, 10) : id;
    }

    /** Kategoriename einer Artikelliste/eines Artikels */
    function categoryName(product) {
        if (product.category) {
            return product.category;
        }
        var path = product.categoryPath || [];
        return path.length ? path[path.length - 1] : "";
    }

    /* ------------------------------------------------------------------ */
    /* Kategorie / Brotkrümelnavigation                                    */
    /* ------------------------------------------------------------------ */

    /** Kategoriepfad aus der Brotkrümelnavigation, z. B. ["Lackieren", "Zubehör"] */
    function breadcrumbPath() {
        var nodes = document.querySelectorAll(".breadcrumbs li");
        var names = [];
        for (var i = 0; i < nodes.length; i++) {
            var text = toText(nodes[i].textContent).replace(/\s+/g, " ").trim();
            if (text) {
                names.push(text);
            }
        }
        // Erster Eintrag = Startseite
        if (names.length) {
            names.shift();
        }
        // Auf der Artikelseite ist der letzte Eintrag der Artikelname
        if (templateType() === "item" && names.length) {
            names.pop();
        }
        return names;
    }

    /** Name der aktuellen Kategorie laut plentyShop */
    function currentCategoryName() {
        var category = get(store(), "state.navigation.currentCategory", null);
        return toText(get(category, "details.0.name", ""));
    }

    /** Suchbegriff der Suchseite (aus plentyShop oder aus der Adresse ?query=...) */
    function searchTerm() {
        var term = toText(get(store(), "state.itemList.searchString", ""));
        if (!term) {
            var match = /[?&]query=([^&#]*)/.exec(window.location.search || "");
            if (match) {
                try {
                    term = decodeURIComponent(match[1].replace(/\+/g, " "));
                } catch (error) {
                    term = match[1];
                }
            }
        }
        return term.trim();
    }

    /** Name der Artikelliste (Felix-Format: "Lackieren >> Zubehör") */
    function listName() {
        if (templateType() === "search") {
            return "Suche";
        }
        var path = breadcrumbPath();
        if (path.length) {
            return path.join(" >> ");
        }
        return currentCategoryName() || templateType() || "Liste";
    }

    /* ------------------------------------------------------------------ */
    /* Artikelkacheln (Kategorie- und Suchseiten)                          */
    /* ------------------------------------------------------------------ */

    /** Vue-Komponente einer Artikelkachel */
    function tileComponent(element) {
        return element.__vue__ || (element.parentElement && element.parentElement.__vue__) || null;
    }

    /*
     * Artikeldaten, die plentyShop für jede Kachel als JSON in die Seite schreibt
     * (<script type="application/json" id="..."> – die Kachel verweist darauf mit dem Attribut "item-data-ref").
     * So sind auch Kacheln lesbar, die plentyShop erst beim Scrollen aufbaut (Feststellung 22.10.2026, b2b.bermaro.de).
     */
    var tileJsonCache = {};

    function tileDocumentFromRef(element) {
        var ref = element && element.getAttribute ? element.getAttribute("item-data-ref") : "";
        if (!ref) {
            return null;
        }
        if (tileJsonCache.hasOwnProperty(ref)) {
            return tileJsonCache[ref];
        }
        var result = null;
        try {
            var script = document.getElementById(ref);
            if (script && script.textContent) {
                var parsed = JSON.parse(script.textContent);
                if (parsed && typeof parsed === "object" && parsed.variation) {
                    result = parsed;
                }
            }
        } catch (error) {
            result = null;
        }
        tileJsonCache[ref] = result;
        return result;
    }

    /** Variantendokument einer Artikelkachel */
    function tileDocument(element) {
        var component = tileComponent(element);
        var documentData = component ? (component.item || get(component, "$props.itemData", null) || null) : null;
        return documentData || tileDocumentFromRef(element);
    }

    /** Liegt die Kachel in einem Karussell (z. B. "Zuletzt gesehen")? */
    function isInCarousel(element) {
        return !!(element.closest && element.closest(".owl-carousel, .owl-stage, .list-item-carousel"));
    }

    /*
     * Sind die Kacheln der Seite (ohne Karussells) fertig? plentyShop baut Kacheln unterhalb des sichtbaren Bereichs erst
     * beim Scrollen auf (Test 22.10.2026). Darum gilt die Liste als fertig, wenn
     *  - alle Kacheln fertig sind, ODER
     *  - genug Kacheln für die Höchstzahl fertig sind, ODER
     *  - sich die Zahl der fertigen Kacheln bei drei Prüfungen hintereinander nicht mehr ändert.
     */
    var tilesLastReady = -1;
    var tilesStableChecks = 0;

    function allTilesReady() {
        var nodes = document.querySelectorAll(".cmp-product-thumb");
        var total = 0;
        var ready = 0;
        for (var i = 0; i < nodes.length; i++) {
            if (!cfg.itemListOnAllPages && isInCarousel(nodes[i])) {
                continue;
            }
            total++;
            if (productFromDocument(tileDocument(nodes[i]))) {
                ready++;
            }
        }
        if (ready > 0 && ready === tilesLastReady) {
            tilesStableChecks++;
        } else {
            tilesStableChecks = 0;
        }
        tilesLastReady = ready;
        return total > 0 && (ready === total || ready >= cfg.maxListItems || (ready > 0 && tilesStableChecks >= 3));
    }

    /** Alle sichtbaren Artikelkacheln der Seite */
    function collectTiles() {
        var nodes = document.querySelectorAll(".cmp-product-thumb");
        var tiles = [];
        var seen = {};
        for (var i = 0; i < nodes.length; i++) {
            if (!cfg.itemListOnAllPages && isInCarousel(nodes[i])) {
                continue;
            }
            var product = productFromDocument(tileDocument(nodes[i]));
            if (!product) {
                continue;
            }
            var key = String(product.variationId);
            if (seen[key]) {
                continue;
            }
            seen[key] = true;
            tiles.push({ element: nodes[i], product: product });
            if (tiles.length >= cfg.maxListItems) {
                break;
            }
        }
        return tiles;
    }

    /* ------------------------------------------------------------------ */
    /* FORMAT 1: Felix Ries (lackier-bedarf.info)                          */
    /* ------------------------------------------------------------------ */

    /** Seitentyp für Google-Ads-Remarketing */
    function remarketingPageType() {
        var map = {
            home: "home",
            category: "category",
            item: "product",
            search: "searchresults",
            basket: "cart",
            checkout: "cart",
            confirmation: "purchase"
        };
        return map[templateType()] || "other";
    }

    /** Artikel im Felix-Format */
    function felixProduct(product, withQuantity) {
        var result = {
            id: productId(product),
            name: product.name,
            price: String(toNumber(product.price)),
            brand: product.brand,
            category: (product.categoryPath && product.categoryPath.length) ? product.categoryPath.join("/") : categoryName(product),
            variant: product.variant
        };
        if (withQuantity) {
            result.quantity = product.quantity || 1;
        }
        return result;
    }

    /** Gesamtwert einer Artikelliste */
    function sumValue(products) {
        var sum = 0;
        for (var i = 0; i < products.length; i++) {
            sum += toNumber(products[i].price) * (products[i].quantity || 1);
        }
        return toNumber(sum);
    }

    /** Gemeinsamer Aufbau aller Felix-Ereignisse ("ecommerceEvent") */
    function felixEvent(ga4Event, eventAction, eventLabel, ecommerce, products, extra) {
        var value = sumValue(products);
        var ids = map(products, productIdValue);
        var payload = {
            event: "ecommerceEvent",
            event_id: newEventId(),
            ga4Event: ga4Event,
            eventCategory: "E-Commerce",
            eventAction: eventAction,
            eventLabel: eventLabel || "",
            ecommerce: ecommerce,
            currency: currency(),
            content_ids: ids.length === 1 ? ids[0] : ids,
            content_type: "product",
            contents: map(products, function (product) {
                return { id: productIdValue(product), quantity: product.quantity || 1, item_price: toNumber(product.price) };
            }),
            value: value,
            google_tag_params: {
                ecomm_prodid: ids.length === 1 ? ids[0] : ids,
                ecomm_pagetype: remarketingPageType(),
                ecomm_totalvalue: value
            }
        };
        if (products.length === 1) {
            payload.content_name = products[0].name;
        }
        if (extra) {
            for (var key in extra) {
                if (Object.prototype.hasOwnProperty.call(extra, key)) {
                    payload[key] = extra[key];
                }
            }
        }
        push(payload);
    }

    /* ------------------------------------------------------------------ */
    /* FORMAT 2: cfour / bisheriges Plugin pelletgrill.rocks + B2B         */
    /* ------------------------------------------------------------------ */

    /**
     * Artikel im cfour-Format ("name" und "itemName" werden beide gefüllt).
     * Kategorie wie beim bisherigen Plugin als vollständiger Pfad, z. B.
     * "Pelletgrills Pelletsmoker > Smoker - Grills" (Abgleich mit pelletgrill.rocks, 22.10.2026).
     */
    function cfourProduct(product, extra) {
        var result = {
            id: productId(product),
            name: product.name,
            itemName: product.name,
            price: toNumber(product.price),
            brand: product.brand,
            category: (product.categoryPath && product.categoryPath.length) ? product.categoryPath.join(" > ") : categoryName(product),
            variant: product.variant,
            quantity: product.quantity || 1
        };
        if (extra) {
            for (var key in extra) {
                if (Object.prototype.hasOwnProperty.call(extra, key)) {
                    result[key] = extra[key];
                }
            }
        }
        return result;
    }

    /** Warenkorbsummen im cfour-Format */
    function cfourBasketData() {
        var data = get(store(), "state.basket.data", {});
        return {
            amount: toNumber(data.basketAmount),
            amountNet: toNumber(data.basketAmountNet),
            itemSum: toNumber(data.itemSum),
            itemSumNet: toNumber(data.itemSumNet),
            shippingAmount: toNumber(data.shippingAmount),
            shippingAmountNet: toNumber(data.shippingAmountNet),
            rebate: toNumber(data.basketRebate),
            rebateType: toText(get(data, "basketRebateType", "0")),
            couponDiscount: toNumber(data.couponDiscount),
            itemsQuantity: toNumber(data.itemQuantity),
            vatValue: toNumber(toNumber(data.basketAmount) - toNumber(data.basketAmountNet)),
            vatRate: toNumber(get(data, "totalVats.0.vatValue", 0))
        };
    }

    /** Listenname im cfour-Format, z. B. "Kategorieliste: Pelletgrills Pelletsmoker > Smoker - Grills, Seite: 1" */
    function cfourListName(path) {
        var page = parseInt(get(store(), "state.itemList.page", 0), 10);
        if (!page) {
            var match = /[?&]page=(\d+)/.exec(window.location.search || "");
            page = match ? parseInt(match[1], 10) : 1;
        }
        if (templateType() === "search") {
            return "Suchergebnisse: " + searchTerm() + ", Seite: " + page;
        }
        var name = (path && path.length) ? path.join(" > ") : currentCategoryName();
        return "Kategorieliste: " + name + ", Seite: " + page;
    }

    /* ------------------------------------------------------------------ */
    /* FORMAT 3: GA4-Standard                                              */
    /* ------------------------------------------------------------------ */

    /** Artikel im GA4-Format */
    function ga4Item(product, index, list) {
        var item = {
            item_id: productId(product),
            item_name: product.name,
            item_brand: product.brand,
            item_category: categoryName(product),
            item_variant: product.variant,
            price: toNumber(product.price),
            quantity: product.quantity || 1
        };
        var path = product.categoryPath || [];
        for (var i = 1; i < path.length && i < 5; i++) {
            item["item_category" + (i + 1)] = path[i];
        }
        if (path.length) {
            item.item_category = path[0];
        }
        if (typeof index === "number") {
            item.index = index;
        }
        if (list) {
            item.item_list_name = list;
        }
        return item;
    }

    /** GA4-Ereignis senden (vorher altes "ecommerce"-Objekt leeren, wie von Google empfohlen) */
    function ga4Event(name, ecommerce) {
        if (shoplyticsPresent()) {
            return;
        }
        push({ ecommerce: null });
        push({ event: name, ecommerce: ecommerce });
    }

    /* ------------------------------------------------------------------ */
    /* EREIGNISSE                                                          */
    /* ------------------------------------------------------------------ */

    /** Produktliste angesehen (Kategorie / Suche) */
    var sendItemList = safe("sendItemList", function (tiles) {
        if (!tiles.length) {
            return;
        }
        var list = listName();
        var path = breadcrumbPath();
        var products = map(tiles, function (tile) {
            tile.product.categoryPath = path;
            tile.product.category = path.length ? path[path.length - 1] : currentCategoryName();
            return tile.product;
        });

        if (USE_FELIX) {
            var felixExtra = {
                google_tag_params: {
                    ecomm_prodid: map(products, productIdValue),
                    ecomm_pagetype: remarketingPageType(),
                    ecomm_category: path.join("/")
                }
            };
            // Suchbegriff: wird im Tag Manager (GA4-Ereignis-Tag) als "search_string" gelesen
            if (templateType() === "search") {
                felixExtra.search_string = searchTerm();
            }
            felixEvent("view_item_list", "Produktimpression", templateType() === "search" ? "Suche" : "Kategorie", {
                currencyCode: currency(),
                impressions: map(products, function (product, index) {
                    var result = felixProduct(product, false);
                    result.position = index;
                    result.list = list;
                    return result;
                })
            }, products, felixExtra);
        }
        if (USE_CFOUR) {
            // Listenname und Position (ab 1) wie beim bisherigen Plugin
            var cfourList = cfourListName(path);
            push({
                event: "itemListView",
                currency: currency(),
                categoryName: list,
                itemList: map(products, function (product, index) {
                    return cfourProduct(product, { position: index + 1, list: cfourList });
                })
            });
        }
        if (USE_GA4) {
            ga4Event("view_item_list", {
                item_list_name: list,
                currency: currency(),
                items: map(products, function (product, index) {
                    return ga4Item(product, index, list);
                })
            });
        }
    });

    /** Klick auf eine Artikelkachel */
    var sendProductClick = safe("sendProductClick", function (product, position, link) {
        var list = listName();
        if (USE_FELIX) {
            felixEvent("select_item", "productClick", list, {
                currencyCode: currency(),
                click: {
                    actionField: { list: list },
                    products: [(function () {
                        var result = felixProduct(product, false);
                        result.position = position;
                        return result;
                    })()]
                }
            }, [product]);
        }
        if (USE_CFOUR) {
            push({
                event: "productClick",
                currency: currency(),
                clickedItem: [cfourProduct(product, { position: position + 1, list: cfourListName(breadcrumbPath()), productLink: link || "" })]
            });
        }
        if (USE_GA4) {
            ga4Event("select_item", {
                item_list_name: list,
                items: [ga4Item(product, position, list)]
            });
        }
    });

    /** Artikeldetailseite angesehen */
    var sentItemViews = {};
    var sendItemView = safe("sendItemView", function (product) {
        var key = String(product.variationId);
        if (sentItemViews[key]) {
            return;
        }
        sentItemViews[key] = true;

        if (USE_FELIX) {
            felixEvent("view_item", "Produktdetailseite", product.name, {
                currencyCode: currency(),
                detail: { products: [felixProduct(product, false)] }
            }, [product], {
                google_tag_params: {
                    ecomm_prodid: productIdValue(product),
                    ecomm_pagetype: "product",
                    ecomm_totalvalue: toNumber(product.price),
                    ecomm_category: (product.categoryPath || []).join("/")
                }
            });
        }
        if (USE_CFOUR) {
            push({ event: "singleItemView", currency: currency(), singleItem: [cfourProduct(product)] });
        }
        if (USE_GA4) {
            ga4Event("view_item", {
                currency: currency(),
                value: toNumber(product.price),
                items: [ga4Item(product)]
            });
        }
    });

    /** In den Warenkorb gelegt */
    var sendAddToCart = safe("sendAddToCart", function (product, fromList) {
        var list = fromList ? listName() : "Artikeldetailseite";
        if (USE_FELIX) {
            felixEvent("add_to_cart", "addToCart", product.name, {
                currencyCode: currency(),
                add: {
                    actionField: { list: list },
                    products: [felixProduct(product, true)]
                }
            }, [product]);
        }
        if (USE_CFOUR) {
            if (fromList) {
                push({ event: "addToCartItemList", currency: currency(), addToCartItem: [cfourProduct(product)] });
            } else {
                push({ event: "addToCartSingleItem", currency: currency(), addToCartSingleItem: [cfourProduct(product)] });
            }
        }
        if (USE_GA4) {
            ga4Event("add_to_cart", {
                currency: currency(),
                value: toNumber(toNumber(product.price) * (product.quantity || 1)),
                items: [ga4Item(product, undefined, fromList ? list : "")]
            });
        }
    });

    /** Aus dem Warenkorb entfernt */
    var sendRemoveFromCart = safe("sendRemoveFromCart", function (product) {
        if (USE_FELIX) {
            felixEvent("remove_from_cart", "removeFromCart", product.name, {
                currencyCode: currency(),
                remove: { products: [felixProduct(product, true)] }
            }, [product]);
        }
        if (USE_CFOUR) {
            push({ event: "removeFromCart", currency: currency(), removedItem: [cfourProduct(product)] });
        }
        if (USE_GA4) {
            ga4Event("remove_from_cart", {
                currency: currency(),
                value: toNumber(toNumber(product.price) * (product.quantity || 1)),
                items: [ga4Item(product)]
            });
        }
    });

    /** Auf den Wunschzettel gesetzt */
    var sendAddToWishlist = safe("sendAddToWishlist", function (product) {
        if (USE_FELIX) {
            push({
                event: "AddToWishlist",
                event_id: newEventId(),
                ga4Event: "add_to_wishlist",
                eventCategory: "E-Commerce",
                eventAction: "addToWishlist",
                eventLabel: product.name,
                content_ids: productIdValue(product),
                content_name: product.name,
                content_type: "product",
                currency: currency(),
                value: toNumber(product.price)
            });
        }
        if (USE_CFOUR) {
            push({ event: "addToWishList", currency: currency(), addToWishListSingleItem: [cfourProduct(product)] });
        }
        if (USE_GA4) {
            ga4Event("add_to_wishlist", {
                currency: currency(),
                value: toNumber(product.price),
                items: [ga4Item(product)]
            });
        }
    });

    /** Warenkorb angesehen bzw. Kasse begonnen */
    var sendCheckoutStep = safe("sendCheckoutStep", function (step) {
        var items = get(store(), "state.basket.items", []);
        if (!items.length) {
            return;
        }
        var products = map(items, productFromBasketItem);
        var isCart = step === 1;
        var basketData = get(store(), "state.basket.data", {});

        if (USE_FELIX) {
            felixEvent(isCart ? "view_cart" : "begin_checkout", isCart ? "Warenkorb" : "Kasse", "", {
                currencyCode: currency(),
                checkout: {
                    actionField: { step: step },
                    products: map(products, function (product) {
                        return felixProduct(product, true);
                    })
                }
            }, products, {
                itemSumGross: toNumber(basketData.itemSum),
                itemSumNet: toNumber(basketData.itemSumNet)
            });
        }
        if (USE_GA4) {
            ga4Event(isCart ? "view_cart" : "begin_checkout", {
                currency: currency(),
                value: sumValue(products),
                coupon: toText(basketData.couponCode),
                items: map(products, function (product) {
                    return ga4Item(product);
                })
            });
        }
        // Das cfour-Format kennt keine eigenen Warenkorb-/Kasse-Ereignisse (Daten stehen in "globalValues")
    });

    /** Versandart bzw. Zahlungsart in der Kasse gewählt */
    var sendCheckoutOption = safe("sendCheckoutOption", function (type, optionName) {
        var items = get(store(), "state.basket.items", []);
        var products = map(items, productFromBasketItem);
        var isShipping = type === "shipping";

        if (USE_FELIX) {
            var extra = {};
            extra[isShipping ? "shippingMethod" : "paymentMethod"] = optionName;
            felixEvent(isShipping ? "add_shipping_info" : "add_payment_info", isShipping ? "Versandart" : "Zahlungsart", optionName, {
                currencyCode: currency(),
                checkout_option: {
                    actionField: { step: isShipping ? 3 : 4, option: optionName }
                }
            }, products, extra);
        }
        if (USE_GA4) {
            var data = {
                currency: currency(),
                value: sumValue(products),
                items: map(products, function (product) {
                    return ga4Item(product);
                })
            };
            data[isShipping ? "shipping_tier" : "payment_type"] = optionName;
            ga4Event(isShipping ? "add_shipping_info" : "add_payment_info", data);
        }
    });

    /** Bestellwert je nach Einstellung (Standard: Warenwert netto) */
    function orderValue(order) {
        switch (cfg.valueBasis) {
            case "itemSumGross":
                return toNumber(order.itemSumGross);
            case "totalNet":
                return toNumber(order.totalNet);
            case "totalGross":
                return toNumber(order.totalGross);
            default:
                return toNumber(order.itemSumNet);
        }
    }

    /** Wurde die Bestellung in diesem Browser schon gemeldet? (verhindert Doppelzählung beim Neuladen) */
    var STORAGE_KEY = "bermaroTrackingOrders";

    function wasOrderTracked(orderId) {
        try {
            var list = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]");
            return list.indexOf(String(orderId)) !== -1;
        } catch (error) {
            return false;
        }
    }

    function rememberOrder(orderId) {
        try {
            var list = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]");
            list.push(String(orderId));
            // nur die letzten 20 Bestellungen merken
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(-20)));
        } catch (error) {
            // Speicher nicht verfügbar (z. B. privater Modus) – dann ohne Merken
        }
    }

    /** Bestellung abgeschlossen (Bestellbestätigung) */
    var sendPurchase = safe("sendPurchase", function (order) {
        if (!order || !order.orderId) {
            return;
        }
        if (cfg.onlyOnce && wasOrderTracked(order.orderId)) {
            log("Bestellung " + order.orderId + " wurde schon gemeldet – kein zweites Mal.");
            return;
        }

        var customer = order.customer || {};
        var value = orderValue(order);
        var orderCurrency = order.currency || currency();
        var grossProducts = map(order.items || [], function (item) {
            return productFromOrderItem(item, false);
        });
        var ids = map(grossProducts, productId);
        var quantities = map(grossProducts, function (product) {
            return product.quantity;
        });

        if (USE_FELIX) {
            felixEvent("purchase", "Bestellbestätigung", String(order.orderId), {
                currencyCode: orderCurrency,
                purchase: {
                    actionField: {
                        id: String(order.orderId),
                        affiliation: affiliation(),
                        revenue: value,
                        tax: toNumber(order.vatTotal),
                        shipping: toNumber(order.shippingGross),
                        coupon: toText(order.couponCode)
                    },
                    products: map(grossProducts, function (product, index) {
                        var result = felixProduct(product, true);
                        result.position = index;
                        result.list = "Bestellbestätigung";
                        return result;
                    })
                }
            }, grossProducts, {
                currency: orderCurrency,
                orderID: String(order.orderId),
                orderValue: value,
                value: value,
                eventValue: value,
                itemSumGross: toNumber(order.itemSumGross),
                itemSumNet: toNumber(order.itemSumNet),
                shippingCostsGross: toNumber(order.shippingGross),
                shippingCostsNet: toNumber(order.shippingNet),
                revenueGross: toNumber(order.totalGross),
                revenueNet: toNumber(order.totalNet),
                revenueNetRebate: toNumber(order.totalNet - order.shippingNet),
                paymentMethod: toText(order.paymentMethod),
                shippingMethod: toText(order.shippingProfile || order.shippingProvider),
                num_items: toNumber(order.itemsQuantity),
                itemCountQuantities: toNumber(order.itemsQuantity),
                quantities: quantities.join(","),
                idListComma: ids.join(","),
                idListPipe: ids.join("|"),
                idListSemicolon: ids.join(";"),
                customerMail: toText(customer.email),
                customerID: customer.contactId || 0,
                visitorLogin: customer.isGuest ? "guest" : "customer",
                town: toText(customer.town),
                postalCode: toText(customer.postalCode),
                countryIsoCode2: toText(customer.countryIso2),
                countryName: toText(customer.countryName),
                google_tag_params: {
                    ecomm_prodid: map(grossProducts, productIdValue),
                    ecomm_pagetype: "purchase",
                    ecomm_totalvalue: value
                }
            });
        }

        if (USE_CFOUR) {
            // Netto-Bestellungen (z. B. B2B): Positionspreise ebenfalls netto, passend zu den Summen
            var cfourProducts = order.isNet ? map(order.items || [], function (item) {
                return productFromOrderItem(item, true);
            }) : grossProducts;
            push({
                event: "orderConfirmation",
                currency: orderCurrency,
                orderData: [{
                    orderId: order.orderId,
                    amount: toNumber(order.totalGross),
                    amountNet: toNumber(order.totalNet),
                    itemSum: toNumber(order.itemSumGross),
                    itemSumNet: toNumber(order.itemSumNet),
                    shippingAmount: toNumber(order.shippingGross),
                    shippingAmountNet: toNumber(order.shippingNet),
                    rebate: 0,
                    rebateType: "0",
                    couponDiscount: toNumber(order.couponValue),
                    couponCode: toText(order.couponCode),
                    itemsQuantity: toNumber(order.itemsQuantity),
                    vatValue: toNumber(order.vatTotal),
                    vatRate: toNumber(order.vatRate),
                    paymentMethod: toText(order.paymentMethod),
                    shippingServiceProvider: toText(order.shippingProvider)
                }],
                orderItems: map(cfourProducts, function (product) {
                    return cfourProduct(product);
                })
            });
        }

        if (USE_GA4) {
            var ga4Data = {
                transaction_id: String(order.orderId),
                affiliation: affiliation(),
                value: value,
                tax: toNumber(order.vatTotal),
                shipping: toNumber(order.shippingGross),
                currency: orderCurrency,
                coupon: toText(order.couponCode),
                items: map(grossProducts, function (product) {
                    return ga4Item(product);
                })
            };
            ga4Event("purchase", ga4Data);
        }

        if (cfg.onlyOnce) {
            rememberOrder(order.orderId);
        }
    });

    /* ------------------------------------------------------------------ */
    /* Bestellung direkt aus der Bestätigungsseite lesen (Sicherheitsnetz) */
    /* ------------------------------------------------------------------ */

    /*
     * Auf der ShopBuilder-Bestellbestätigung liefert plentyShop die Bestellung teils nicht an den
     * Server-Teil des Plugins (Test 22.10.2026). Die Seite selbst enthält die Bestellung aber
     * (z. B. im Baustein "Zahlungsart ändern"). Dann wird sie hier ausgelesen und genauso
     * aufbereitet wie auf dem Server (OrderDataBuilder.php).
     */
    var ITEM_TYPES = [1, 2, 9, 13];
    var TYPE_SHIPPING = 6;
    var TYPE_PROMOTIONAL_COUPON = 4;
    var MAX_ORDER_AGE_MINUTES = 60;

    /** Rohe Bestellung in den Vue-Bausteinen der Seite suchen */
    function rawOrderFromPage() {
        var nodes = document.querySelectorAll("*");
        for (var i = 0; i < nodes.length; i++) {
            var vm = nodes[i].__vue__;
            if (!vm || !vm.$props) {
                continue;
            }
            var candidates = [vm.$props.currentOrder, vm.$props.order, get(vm.$props, "orderData.order", null)];
            for (var j = 0; j < candidates.length; j++) {
                var candidate = candidates[j];
                if (candidate && candidate.id && candidate.orderItems && candidate.orderItems.length) {
                    return candidate;
                }
            }
        }
        return null;
    }

    /** Betrag in Kundenwährung (wie plentyShop: nicht die Systemwährung bevorzugen) */
    function customerAmount(amounts) {
        if (!amounts || !amounts.length) {
            return {};
        }
        for (var i = 0; i < amounts.length; i++) {
            if (amounts[i] && !amounts[i].isSystemCurrency) {
                return amounts[i];
            }
        }
        return amounts[0] || {};
    }

    /** Bestelldaten im selben Aufbau wie OrderDataBuilder.php */
    function buildOrderFromRaw(order) {
        var items = [];
        var itemsQuantity = 0;
        var firstVatRate = 0;
        var itemSumGross = 0;
        var itemSumNet = 0;
        var shippingGross = 0;
        var shippingNet = 0;
        var couponGross = 0;
        var couponNet = 0;
        var orderItems = order.orderItems || [];

        for (var i = 0; i < orderItems.length; i++) {
            var orderItem = orderItems[i] || {};
            var typeId = parseInt(orderItem.typeId, 10) || 0;
            var amount = customerAmount(orderItem.amounts);
            var quantity = parseFloat(orderItem.quantity) || 0;
            var priceGross = parseFloat(amount.priceGross) || 0;
            var priceNet = parseFloat(amount.priceNet) || 0;

            if (typeId === TYPE_SHIPPING) {
                shippingGross += priceGross;
                shippingNet += priceNet;
                continue;
            }
            if (typeId === TYPE_PROMOTIONAL_COUPON) {
                couponGross += priceGross * (quantity > 0 ? quantity : 1);
                couponNet += priceNet * (quantity > 0 ? quantity : 1);
                continue;
            }
            if (ITEM_TYPES.indexOf(typeId) === -1) {
                continue;
            }
            var vatRate = parseFloat(orderItem.vatRate) || 0;
            if (firstVatRate === 0 && vatRate > 0) {
                firstVatRate = vatRate;
            }
            items.push({
                variationId: parseInt(orderItem.itemVariationId, 10) || 0,
                itemId: 0,
                number: "",
                name: toText(orderItem.orderItemName),
                brand: "",
                variant: "",
                priceGross: toNumber(priceGross),
                priceNet: toNumber(priceNet),
                quantity: quantity,
                vatRate: vatRate
            });
            itemsQuantity += quantity;
            itemSumGross += priceGross * quantity;
            itemSumNet += priceNet * quantity;
        }

        var orderAmount = customerAmount(order.amounts);
        var totalGross = parseFloat(orderAmount.grossTotal) || 0;
        var totalNet = parseFloat(orderAmount.netTotal) || 0;
        var address = order.billingAddress || {};
        var email = "";
        var options = address.options || [];
        for (var k = 0; k < options.length; k++) {
            if (options[k] && parseInt(options[k].typeId, 10) === 5 && options[k].value) {
                email = toText(options[k].value).trim();
                break;
            }
        }
        var contactId = 0;
        var relations = order.relations || [];
        for (var r = 0; r < relations.length; r++) {
            if (relations[r] && relations[r].referenceType === "contact" && parseInt(relations[r].referenceId, 10) > 0) {
                contactId = parseInt(relations[r].referenceId, 10);
                break;
            }
        }

        return {
            orderId: parseInt(order.id, 10) || 0,
            createdAt: toText(order.createdAt),
            currency: toText(orderAmount.currency) || "EUR",
            itemSumGross: toNumber(itemSumGross + couponGross),
            itemSumNet: toNumber(itemSumNet + couponNet),
            shippingGross: toNumber(shippingGross),
            shippingNet: toNumber(shippingNet),
            totalGross: toNumber(totalGross),
            totalNet: toNumber(totalNet),
            vatTotal: toNumber(orderAmount.vatTotal !== undefined ? orderAmount.vatTotal : totalGross - totalNet),
            vatRate: firstVatRate,
            couponCode: "",
            couponValue: toNumber(Math.abs(couponGross)),
            isNet: false,
            paymentMethod: "",
            shippingProvider: "",
            shippingProfile: "",
            itemsQuantity: itemsQuantity,
            items: items,
            customer: {
                contactId: contactId,
                isGuest: contactId <= 0,
                email: email,
                postalCode: toText(address.postalCode),
                town: toText(address.town),
                countryIso2: toText(get(address, "country.isoCode2", "")),
                countryName: toText(get(address, "country.name", ""))
            }
        };
    }

    /** Ist die Bestellung frisch genug, um sie zu melden? (verhindert Meldung beim späteren Öffnen) */
    function isFreshOrder(createdAt) {
        var time = Date.parse(createdAt);
        if (!isFinite(time)) {
            return true;
        }
        return (Date.now() - time) <= MAX_ORDER_AGE_MINUTES * 60 * 1000;
    }

    /** cfour-Format: allgemeine Seitendaten auf jeder Seite */
    var sendGlobalValues = safe("sendGlobalValues", function () {
        var items = get(store(), "state.basket.items", []);
        push({
            event: "globalValues",
            currency: currency(),
            lang: cfg.language || "de",
            pageType: templateType(),
            webstoreName: affiliation(),
            customerEmail: "",
            customerId: toNumber(get(store(), "state.user.userData.id", 0)),
            basketItems: map(items, function (basketItem) {
                return cfourProduct(productFromBasketItem(basketItem));
            }),
            basketData: [cfourBasketData()]
        });
        push({ event: "globalEvents" });
    });

    /* ------------------------------------------------------------------ */
    /* VERKABELUNG MIT PLENTYSHOP                                          */
    /* ------------------------------------------------------------------ */

    /** Variantendokument des gerade angezeigten Artikels */
    function currentItemDocument() {
        return get(store(), "getters.currentItemVariation", null);
    }

    /** Artikel der Detailseite inkl. Kategorie */
    function currentItemProduct() {
        var product = productFromDocument(currentItemDocument());
        if (product) {
            product.categoryPath = breadcrumbPath();
            product.category = currentCategoryName() || (product.categoryPath.length ? product.categoryPath[product.categoryPath.length - 1] : "");
        }
        return product;
    }

    /** Artikel zu einer Varianten-ID finden (Detailseite, Kacheln, Warenkorb) */
    function findProductByVariationId(variationId) {
        var id = parseInt(variationId, 10);
        var current = currentItemProduct();
        if (current && current.variationId === id) {
            return current;
        }
        var tiles = document.querySelectorAll(".cmp-product-thumb");
        for (var i = 0; i < tiles.length; i++) {
            var product = productFromDocument(tileDocument(tiles[i]));
            if (product && product.variationId === id) {
                product.categoryPath = breadcrumbPath();
                return product;
            }
        }
        var items = get(store(), "state.basket.items", []);
        for (var j = 0; j < items.length; j++) {
            if (items[j].variationId === id) {
                return productFromBasketItem(items[j]);
            }
        }
        return { variationId: id, itemId: 0, number: "", name: "", brand: "", price: 0, variant: "", category: "", categoryPath: [], quantity: 1 };
    }

    /* --- Warenkorb beobachten --- */

    var basketSnapshot = {};

    /**
     * Warenkorb-Positionen merken bzw. aktualisieren, OHNE verschwundene Positionen zu löschen.
     * (Grund: plentyShop schickt die neue Warenkorbliste teils schon, bevor das eigentliche
     * "Löschen" gemeldet wird – dann bräuchten wir die alten Daten noch.)
     */
    function upsertBasketSnapshot() {
        var items = get(store(), "state.basket.items", []);
        for (var i = 0; i < items.length; i++) {
            basketSnapshot[items[i].id] = {
                quantity: toNumber(items[i].quantity),
                product: productFromBasketItem(items[i])
            };
        }
    }

    /**
     * Warenkorb-Änderungen melden – NUR bei echten Kunden-Aktionen:
     * - "removeBasketItem":          Kunde hat eine Position gelöscht      => entfernt
     * - "updateBasketItemQuantity":  Kunde hat die Menge im Warenkorb geändert => Differenz
     * Hinzufügen per Button meldet das Ereignis "afterBasketItemAdded" (siehe unten).
     * Alle anderen Änderungen (Server-Antworten, Warenkorb nach der Bestellung geleert,
     * Zusammenführen beim Login, Bestandskorrektur) werden bewusst NICHT gemeldet.
     */
    var onStoreMutation = safe("onStoreMutation", function (mutation) {
        var type = mutation.type;
        var payload = mutation.payload;

        if (type === "addWishListId" && isEnabled("wishlist")) {
            sendAddToWishlist(findProductByVariationId(payload));
            return;
        }

        if (type === "removeBasketItem") {
            var removed = basketSnapshot[payload];
            if (removed && isEnabled("cart")) {
                removed.product.quantity = removed.quantity || 1;
                sendRemoveFromCart(removed.product);
            }
            delete basketSnapshot[payload];
            return;
        }

        if (type === "updateBasketItemQuantity" && payload) {
            var before = basketSnapshot[payload.id];
            var newQuantity = toNumber(payload.quantity);
            if (before && isEnabled("cart")) {
                var difference = newQuantity - before.quantity;
                if (difference !== 0) {
                    var product = before.product;
                    product.quantity = Math.abs(difference);
                    if (difference > 0) {
                        sendAddToCart(product, true);
                    } else {
                        sendRemoveFromCart(product);
                    }
                }
            }
            if (before) {
                before.quantity = newQuantity;
            }
            return;
        }

        // Alle übrigen Warenkorb-Änderungen: nur Daten merken
        if (/basket/i.test(type) && !/loading|notification|initially|netprices|coupon/i.test(type)) {
            upsertBasketSnapshot();
        }
    });

    /* "In den Warenkorb" geklickt (plentyShop meldet das nach erfolgreichem Hinzufügen) */
    document.addEventListener("afterBasketItemAdded", safe("afterBasketItemAdded", function (event) {
        if (!isEnabled("cart")) {
            return;
        }
        var detail = event.detail || {};
        var variationId = parseInt(detail.variationId, 10);
        var quantity = toNumber(detail.quantity) || 1;
        var current = templateType() === "item" ? currentItemProduct() : null;
        var fromList = !(current && current.variationId === variationId);
        var product = findProductByVariationId(variationId);
        // Preis bevorzugt aus dem Warenkorb (berücksichtigt Staffelpreise)
        var items = get(store(), "state.basket.items", []);
        for (var i = 0; i < items.length; i++) {
            if (items[i].variationId === variationId) {
                product.price = toNumber(items[i].price) || product.price;
                if (!product.name) {
                    product = productFromBasketItem(items[i]);
                }
                break;
            }
        }
        product.quantity = quantity;
        sendAddToCart(product, fromList);
    }));

    /* Versandart / Zahlungsart in der Kasse */
    document.addEventListener("afterShippingProfileChanged", safe("afterShippingProfileChanged", function (event) {
        if (!isEnabled("checkout")) {
            return;
        }
        var id = event.detail;
        var list = get(store(), "state.checkout.shipping.shippingProfileList", []);
        var name = String(id);
        for (var i = 0; i < list.length; i++) {
            if (list[i].parcelServicePresetId === id || list[i].id === id) {
                name = toText(list[i].parcelServicePresetName || list[i].parcelServiceName || list[i].name) || name;
                break;
            }
        }
        sendCheckoutOption("shipping", name);
    }));

    document.addEventListener("afterPaymentMethodChanged", safe("afterPaymentMethodChanged", function (event) {
        if (!isEnabled("checkout")) {
            return;
        }
        var id = event.detail;
        var list = get(store(), "state.checkout.payment.methodOfPaymentList", []);
        var name = String(id);
        for (var i = 0; i < list.length; i++) {
            if (list[i].id === id) {
                name = toText(list[i].name) || name;
                break;
            }
        }
        sendCheckoutOption("payment", name);
    }));

    /* Klick auf Artikelkacheln */
    document.addEventListener("click", safe("tileClick", function (event) {
        if (!isEnabled("productClick")) {
            return;
        }
        var target = event.target;
        if (!target || !target.closest) {
            return;
        }
        var link = target.closest("a[href]");
        var tile = target.closest(".cmp-product-thumb");
        if (!link || !tile) {
            return;
        }
        // Klicks auf "In den Warenkorb" oder "Wunschzettel" sind keine Produktklicks
        if (target.closest("button, .add-to-basket-container, .add-to-wish-list")) {
            return;
        }
        var product = productFromDocument(tileDocument(tile));
        if (!product) {
            return;
        }
        product.categoryPath = breadcrumbPath();
        var all = document.querySelectorAll(".cmp-product-thumb");
        var position = Array.prototype.indexOf.call(all, tile);
        sendProductClick(product, position, link.href);
    }), true);

    /* ------------------------------------------------------------------ */
    /* START                                                               */
    /* ------------------------------------------------------------------ */

    var start = safe("start", function () {
        log("Start", { formate: formats, ereignisse: enabledEvents, seitentyp: templateType(), plentyId: cfg.plentyId });

        // Consent-Stand aktualisieren (falls Consent Mode aktiv)
        if (typeof window.BermaroTrackingUpdateConsent === "function") {
            window.BermaroTrackingUpdateConsent();
        }

        // Felix-Format: Seitenaufruf-Ereignis wie beim alten Plugin
        if (USE_FELIX) {
            push({ event: "facebookEvent", event_id: newEventId(), facebookEventName: "PageView" });
        }

        // Store-Beobachtung starten
        waitFor(function () {
            return store() && typeof store().subscribe === "function";
        }, function () {
            upsertBasketSnapshot();
            store().subscribe(onStoreMutation);
        }, 40, 250);

        var type = templateType();

        // cfour-Format: allgemeine Seitendaten, sobald der Warenkorb geladen ist
        if (USE_CFOUR) {
            // Falls der Warenkorb nicht rechtzeitig lädt, trotzdem senden (mit den vorhandenen Daten)
            waitFor(function () {
                return get(store(), "state.basket.isBasketInitiallyLoaded", false);
            }, sendGlobalValues, 40, 250, sendGlobalValues);
        }

        // Bestellbestätigung
        if (isEnabled("purchase") && window.BermaroTrackingOrder) {
            sendPurchase(window.BermaroTrackingOrder);
        } else if (isEnabled("purchase") && type === "confirmation") {
            // Sicherheitsnetz: Bestellung aus der Seite lesen (siehe rawOrderFromPage)
            waitFor(function () {
                return rawOrderFromPage();
            }, function (rawOrder) {
                var order = buildOrderFromRaw(rawOrder);
                if (cfg.onlyOnce && !isFreshOrder(order.createdAt)) {
                    log("Bestellung " + order.orderId + " ist älter als " + MAX_ORDER_AGE_MINUTES + " Minuten – wird nicht gemeldet.");
                    return;
                }
                log("Bestellung aus der Seite gelesen", order);
                sendPurchase(order);
            }, 40, 250);
        }

        // Artikeldetailseite
        if (type === "item" && isEnabled("itemView")) {
            waitFor(function () {
                return currentItemProduct();
            }, function (product) {
                sendItemView(product);
                // Bei Wechsel der Variante (z. B. andere Größe) erneut melden
                if (store() && typeof store().watch === "function") {
                    store().watch(function () {
                        return get(currentItemDocument(), "variation.id", 0);
                    }, function () {
                        var changed = currentItemProduct();
                        if (changed) {
                            sendItemView(changed);
                        }
                    });
                }
            }, 40, 250);
        }

        // Produktlisten
        var listPage = type === "category" || type === "search" || cfg.itemListOnAllPages;
        if (listPage && isEnabled("itemList")) {
            // Warten, bis plentyShop alle Kacheln aufgebaut hat (Kacheln werden teils nachgeladen).
            // Klappt das nicht vollständig, werden nach Ablauf die bis dahin fertigen Kacheln gemeldet.
            waitFor(function () {
                return allTilesReady() ? collectTiles() : false;
            }, sendItemList, 20, 300, function () {
                sendItemList(collectTiles());
            });
        }

        // Warenkorbseite / Kasse
        if ((type === "basket" && isEnabled("viewCart")) || (type === "checkout" && isEnabled("checkout"))) {
            waitFor(function () {
                return get(store(), "state.basket.isBasketInitiallyLoaded", false) && get(store(), "state.basket.items", []).length;
            }, function () {
                sendCheckoutStep(type === "basket" ? 1 : 2);
            }, 40, 250);
        }
    });

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", start);
    } else {
        start();
    }
})(window, document);
