<?php

namespace BermaroTracking\Helpers;

use IO\Helper\Utils;
use Plenty\Plugin\ConfigRepository;

/**
 * Liest die Plugin-Einstellungen aus und bereitet sie auf.
 *
 * Mandantenfähigkeit:
 * - Jeder Mandant (Shop) hat in plentymarkets ein eigenes Plugin-Set. Alle Einstellungen
 *   werden pro Plugin-Set gespeichert, d. h. jeder Shop kann eigene Werte haben.
 * - Zusätzlich gibt es das Feld "Mandanten-Zuordnung". Damit kann man in EINEM Plugin-Set
 *   pro Mandant (plentyId) eine eigene Container-ID und ein eigenes Datenformat festlegen,
 *   falls sich mehrere Shops ein Plugin-Set teilen.
 *   Schreibweise: plentyId=GTM-XXXXXXX:format1+format2 ; nächster Eintrag ...
 *   Beispiel:     22871=GTM-PKMRNKBW:felixries ; 12345=GTM-ABCDEFG:cfour
 */
class TrackingConfig
{
    /** Name des Plugins (Präfix für alle Konfigurationsschlüssel) */
    const PLUGIN = 'BermaroTracking';

    /** Plugin-Version, wird zum Neuladen der JS-Datei (Cache) verwendet */
    const VERSION = '1.0.7';

    /** Alle möglichen Datenformate */
    const FORMATS = ['felixries', 'cfour', 'ga4'];

    /** Alle möglichen Ereignis-Gruppen */
    const EVENTS = ['itemList', 'productClick', 'itemView', 'cart', 'wishlist', 'viewCart', 'checkout', 'purchase'];

    /** @var ConfigRepository */
    private $config;

    /** @var array|null Zwischenspeicher für die Mandanten-Zuordnung des aktuellen Mandanten */
    private $clientEntry = null;

    /** @var bool Wurde die Mandanten-Zuordnung schon ausgewertet? */
    private $clientEntryLoaded = false;

    /**
     * @param ConfigRepository $config
     */
    public function __construct(ConfigRepository $config)
    {
        $this->config = $config;
    }

    /**
     * Rohwert einer Einstellung holen.
     *
     * @param string $key
     * @param mixed $default
     * @return mixed
     */
    public function get($key, $default = null)
    {
        $value = $this->config->get(self::PLUGIN . '.' . $key, $default);
        if ($value === null) {
            return $default;
        }
        return $value;
    }

    /**
     * Einstellung als Text holen (leere Werte => Standardwert).
     *
     * @param string $key
     * @param string $default
     * @return string
     */
    public function getText($key, $default = '')
    {
        $value = $this->get($key, $default);
        if (is_array($value)) {
            return $default;
        }
        $value = trim((string)$value);
        return strlen($value) ? $value : $default;
    }

    /**
     * Einstellung als Ja/Nein holen.
     *
     * @param string $key
     * @param bool $default
     * @return bool
     */
    public function getBool($key, $default = false)
    {
        $value = $this->get($key, null);
        if ($value === true || $value === 'true' || $value === '1' || $value === 1) {
            return true;
        }
        if ($value === false || $value === 'false' || $value === '0' || $value === 0) {
            return false;
        }
        return $default;
    }

    /**
     * Mehrfachauswahl (multiCheckBox) als Liste holen.
     * plentymarkets speichert "all" (alles ausgewählt) oder "wert1, wert2".
     *
     * @param string $key
     * @param array $possibleValues
     * @param array $default
     * @return array
     */
    public function getMultiSelect($key, array $possibleValues, array $default)
    {
        $value = $this->get($key, null);

        if (is_array($value)) {
            $list = $value;
        } else {
            $value = trim((string)$value);
            if ($value === 'all') {
                return $possibleValues;
            }
            if (!strlen($value)) {
                return $default;
            }
            $list = explode(',', $value);
        }

        $result = [];
        foreach ($list as $entry) {
            $entry = trim((string)$entry);
            if (strlen($entry) && in_array($entry, $possibleValues, true) && !in_array($entry, $result, true)) {
                $result[] = $entry;
            }
        }
        return count($result) ? $result : $default;
    }

    /**
     * plentyId (Mandanten-ID) des aktuellen Shops.
     *
     * @return int
     */
    public function getPlentyId()
    {
        try {
            return (int)Utils::getPlentyId();
        } catch (\Throwable $e) {
            return 0;
        }
    }

    /**
     * Sprache des aktuellen Shops (z. B. "de").
     *
     * @return string
     */
    public function getLanguage()
    {
        try {
            return (string)Utils::getLang();
        } catch (\Throwable $e) {
            return 'de';
        }
    }

    /**
     * Eintrag aus der Mandanten-Zuordnung für den aktuellen Mandanten holen.
     * Rückgabe: ['containerId' => 'GTM-...', 'formats' => [...]] oder null.
     *
     * @return array|null
     */
    public function getClientEntry()
    {
        if ($this->clientEntryLoaded) {
            return $this->clientEntry;
        }
        $this->clientEntryLoaded = true;

        $raw = $this->getText('general.clientMapping', '');
        if (!strlen($raw)) {
            return null;
        }

        $plentyId = $this->getPlentyId();
        // Trennzeichen vereinheitlichen: Semikolon, Komma, Zeilenumbruch
        $raw = str_replace([',', "\r\n", "\n", "\r"], ';', $raw);

        foreach (explode(';', $raw) as $part) {
            $part = trim($part);
            if (!strlen($part) || strpos($part, '=') === false) {
                continue;
            }
            list($idPart, $valuePart) = explode('=', $part, 2);
            if ((int)trim($idPart) !== $plentyId || $plentyId === 0) {
                continue;
            }

            $valuePart = trim($valuePart);
            $formats = [];
            if (strpos($valuePart, ':') !== false) {
                list($containerPart, $formatPart) = explode(':', $valuePart, 2);
                foreach (explode('+', $formatPart) as $format) {
                    $format = strtolower(trim($format));
                    if (in_array($format, self::FORMATS, true) && !in_array($format, $formats, true)) {
                        $formats[] = $format;
                    }
                }
            } else {
                $containerPart = $valuePart;
            }

            $this->clientEntry = [
                'containerId' => $this->cleanContainerId($containerPart),
                'formats'     => $formats
            ];
            return $this->clientEntry;
        }

        return null;
    }

    /**
     * Container-ID bereinigen (Großbuchstaben, nur erlaubte Zeichen).
     *
     * @param string $value
     * @return string
     */
    public function cleanContainerId($value)
    {
        $value = strtoupper(trim((string)$value));
        $allowed = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-';
        $clean = '';
        $length = strlen($value);
        for ($i = 0; $i < $length; $i++) {
            if (strpos($allowed, $value[$i]) !== false) {
                $clean .= $value[$i];
            }
        }
        // Nur gültige Tag-Manager-IDs zulassen (beginnen mit "GTM-")
        return strpos($clean, 'GTM-') === 0 ? $clean : '';
    }

    /**
     * Gültige Container-ID für den aktuellen Mandanten.
     *
     * @return string
     */
    public function getContainerId()
    {
        $entry = $this->getClientEntry();
        if (is_array($entry) && strlen($entry['containerId'])) {
            return $entry['containerId'];
        }
        return $this->cleanContainerId($this->getText('general.containerId', ''));
    }

    /**
     * Ist das Tracking für diesen Shop eingeschaltet und eine Container-ID vorhanden?
     *
     * @return bool
     */
    public function isActive()
    {
        return $this->getBool('general.active', true) && strlen($this->getContainerId()) > 0;
    }

    /**
     * Aktive Datenformate.
     *
     * @return array
     */
    public function getFormats()
    {
        $entry = $this->getClientEntry();
        if (is_array($entry) && count($entry['formats'])) {
            return $entry['formats'];
        }
        return $this->getMultiSelect('general.formats', self::FORMATS, ['felixries']);
    }

    /**
     * Aktive Ereignis-Gruppen.
     *
     * @return array
     */
    public function getEvents()
    {
        return $this->getMultiSelect('events.enabled', self::EVENTS, self::EVENTS);
    }

    /**
     * Vollständiger Consent-Schlüssel "gruppe.schluessel" für einen der drei Dienste.
     *
     * @param string $type analytics | ads | bing
     * @return string
     */
    public function getConsentKey($type)
    {
        $defaults = [
            'analytics' => ['tracking', 'googleanalytics'],
            'ads'       => ['marketing', 'googleads'],
            'bing'      => ['tracking', 'bingads']
        ];
        if (!isset($defaults[$type])) {
            return '';
        }
        $group = $this->getText('consent.' . $type . 'Group', $defaults[$type][0]);
        $key = $this->getText('consent.' . $type . 'Key', $defaults[$type][1]);
        return $group . '.' . $key;
    }

    /**
     * Technische Schlüssel (ohne Gruppe) der Dienste, die im Cookie-Banner registriert werden,
     * z. B. ["googleanalytics", "googleads", "bingads"].
     * Wird für das Felix-Cookie "consentActiveStatus" gebraucht (siehe Head.twig).
     *
     * @return array
     */
    public function getActiveConsentKeys()
    {
        $keys = [];
        foreach (['analytics', 'ads', 'bing'] as $type) {
            if (!$this->getBool('consent.register' . ucfirst($type), true)) {
                continue;
            }
            $full = $this->getConsentKey($type);
            $position = strpos($full, '.');
            $key = $position === false ? $full : substr($full, $position + 1);
            if (strlen($key) && !in_array($key, $keys, true)) {
                $keys[] = $key;
            }
        }
        return $keys;
    }

    /**
     * Ganzzahl-Einstellung mit Unter- und Obergrenze.
     *
     * @param string $key
     * @param int $default
     * @param int $min
     * @param int $max
     * @return int
     */
    public function getInt($key, $default, $min, $max)
    {
        $value = (int)$this->getText($key, (string)$default);
        if ($value < $min || $value > $max) {
            return $default;
        }
        return $value;
    }

    /**
     * Alle Einstellungen, die das JavaScript im Browser braucht.
     * WICHTIG: Hier stehen keine Geheimnisse drin – alles ist für Besucher sichtbar.
     *
     * @return array
     */
    public function toFrontendArray()
    {
        $consentMode = $this->getText('consent.mode', 'off');
        if (!in_array($consentMode, ['off', 'basic', 'advanced'], true)) {
            $consentMode = 'off';
        }

        $valueBasis = $this->getText('purchase.valueBasis', 'itemSumNet');
        if (!in_array($valueBasis, ['itemSumNet', 'itemSumGross', 'totalNet', 'totalGross'], true)) {
            $valueBasis = 'itemSumNet';
        }

        $idSource = $this->getText('general.idSource', 'variationId');
        if (!in_array($idSource, ['variationId', 'itemId', 'variationNumber'], true)) {
            $idSource = 'variationId';
        }

        return [
            'active'                  => $this->isActive(),
            'version'                 => self::VERSION,
            'containerId'             => $this->getContainerId(),
            'plentyId'                => $this->getPlentyId(),
            'language'                => $this->getLanguage(),
            'formats'                 => $this->getFormats(),
            'events'                  => $this->getEvents(),
            'idSource'                => $idSource,
            'affiliation'             => $this->getText('general.affiliation', ''),
            'debug'                   => $this->getBool('general.debug', false),
            'itemListOnAllPages'      => $this->getBool('events.itemListOnAllPages', false),
            'maxListItems'            => $this->getInt('events.maxListItems', 24, 1, 200),
            'valueBasis'              => $valueBasis,
            'onlyOnce'                => $this->getBool('purchase.onlyOnce', true),
            'consentMode'             => $consentMode,
            'loadGtmOnlyAfterConsent' => $this->getBool('consent.loadGtmOnlyAfterConsent', false),
            'pushConsentChanged'      => $this->getBool('consent.pushConsentChanged', true),
            'consentKeys'             => [
                'analytics' => $this->getConsentKey('analytics'),
                'ads'       => $this->getConsentKey('ads'),
                'bing'      => $this->getConsentKey('bing')
            ],
            'activeConsentKeys'       => $this->getActiveConsentKeys()
        ];
    }

    /**
     * Daten sicher als JSON für ein <script>-Tag umwandeln.
     * Die Flags verhindern, dass z. B. ein Artikelname mit "</script>" das Skript beendet.
     *
     * @param mixed $data
     * @return string
     */
    public static function toScriptJson($data)
    {
        $json = json_encode(
            $data,
            JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE
        );
        return $json === false ? 'null' : $json;
    }
}
