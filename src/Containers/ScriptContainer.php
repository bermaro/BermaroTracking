<?php

namespace BermaroTracking\Containers;

use BermaroTracking\Helpers\OrderDataBuilder;
use BermaroTracking\Helpers\TrackingConfig;
use BermaroTracking\Providers\BermaroTrackingServiceProvider;
use IO\Helper\Utils;
use IO\Services\TemplateService;
use Plenty\Modules\Frontend\Session\Storage\Contracts\FrontendSessionStorageFactoryContract;
use Plenty\Modules\Webshop\Contracts\ContactRepositoryContract;
use Plenty\Plugin\Log\Loggable;
use Plenty\Plugin\Templates\Twig;

/**
 * Inhalt für den Container "Ceres::Script.AfterScriptsLoaded".
 * Bindet das Tracking-JavaScript ein und gibt auf der Bestellbestätigung die Bestelldaten mit.
 *
 * Schutz gegen doppelte Kaufmeldungen (drei Stufen):
 *  1. Nur auf der Bestellbestätigung und nicht im ShopBuilder-Bearbeitungsmodus.
 *  2. Server: Wurde die Bestellung in DIESER Sitzung angelegt (Merker aus dem ServiceProvider),
 *     wird sie gemeldet und der Merker gelöscht. Gibt es keinen Merker (z. B. weil eine
 *     Zahlungsart die Bestellung in einer anderen Sitzung anlegt), wird die Bestellung nur
 *     gemeldet, wenn sie höchstens 60 Minuten alt ist. Ein später geöffneter Link aus der
 *     Bestellmail löst also keine zweite Meldung aus.
 *  3. Browser: Jede Bestellnummer wird im Browser gemerkt und nicht erneut gemeldet.
 */
class ScriptContainer
{
    use Loggable;

    /** Name der Bestellbestätigungs-Vorlage in plentyShop */
    const CONFIRMATION_TEMPLATE = 'tpl.confirmation';

    /** Maximales Alter einer Bestellung (Minuten), wenn kein Sitzungs-Merker vorhanden ist */
    const MAX_ORDER_AGE_MINUTES = 60;

    /**
     * @param Twig $twig
     * @return string
     */
    public function call(Twig $twig)
    {
        try {
            /** @var TrackingConfig $trackingConfig */
            $trackingConfig = pluginApp(TrackingConfig::class);
            if (!$trackingConfig->isActive()) {
                return '';
            }

            $orderJson = 'null';
            if (in_array('purchase', $trackingConfig->getEvents(), true)) {
                $orderData = $this->getConfirmationOrder($trackingConfig);
                if (is_array($orderData)) {
                    $orderJson = TrackingConfig::toScriptJson($orderData);
                    if ($orderJson === 'null') {
                        $this->getLogger(__METHOD__)->error('BermaroTracking::Log.orderJsonError', ['orderId' => $orderData['orderId']]);
                    }
                }
            }

            return $twig->render(
                'BermaroTracking::Scripts',
                [
                    'orderJson' => $orderJson,
                    'version'   => TrackingConfig::VERSION
                ]
            );
        } catch (\Throwable $exception) {
            $this->getLogger(__METHOD__)->error('BermaroTracking::Log.scriptError', ['message' => $exception->getMessage()]);
            return '';
        }
    }

    /**
     * Bestellung der aktuell angezeigten Bestellbestätigung holen.
     * Auf allen anderen Seiten (und wenn die Bestellung nicht gemeldet werden soll) wird null zurückgegeben.
     *
     * @param TrackingConfig $trackingConfig
     * @return array|null
     */
    private function getConfirmationOrder(TrackingConfig $trackingConfig)
    {
        if (TemplateService::$currentTemplate !== self::CONFIRMATION_TEMPLATE) {
            return null;
        }

        // Im ShopBuilder (Seite bearbeiten) nie eine Bestellung melden
        try {
            if (Utils::isShopBuilder()) {
                return null;
            }
        } catch (\Throwable $exception) {
            // Prüfung nicht möglich – weiter
        }

        // Genau die Bestellung, die plentyShop auf dieser Seite anzeigt
        $templateData = TemplateService::$currentTemplateData;
        $localizedOrder = (is_array($templateData) && isset($templateData['data'])) ? $templateData['data'] : null;
        if (empty($localizedOrder)) {
            return null;
        }

        /** @var OrderDataBuilder $builder */
        $builder = pluginApp(OrderDataBuilder::class);
        $orderData = $builder->build(
            $localizedOrder,
            $trackingConfig->getBool('purchase.sendCustomerData', true)
        );
        if (!is_array($orderData)) {
            return null;
        }

        // Kundennummer ergänzen, falls sie nicht in der Bestellung stand
        if (empty($orderData['customer']['contactId'])) {
            try {
                /** @var ContactRepositoryContract $contactRepository */
                $contactRepository = pluginApp(ContactRepositoryContract::class);
                $contactId = (int)$contactRepository->getContactId();
                $orderData['customer']['contactId'] = $contactId;
                $orderData['customer']['isGuest'] = $contactId <= 0;
            } catch (\Throwable $exception) {
                // ohne Kundennummer weiter
            }
        }

        if ($trackingConfig->getBool('purchase.onlyOnce', true) && !$this->shouldReportOrder($orderData)) {
            return null;
        }

        return $orderData;
    }

    /**
     * Server-Schutz gegen doppelte Meldungen (siehe Klassenbeschreibung).
     *
     * @param array $orderData
     * @return bool
     */
    private function shouldReportOrder(array $orderData)
    {
        $orderId = (int)$orderData['orderId'];
        $sessionOrderId = 0;
        $sessionPlugin = null;

        try {
            /** @var FrontendSessionStorageFactoryContract $sessionStorage */
            $sessionStorage = pluginApp(FrontendSessionStorageFactoryContract::class);
            $sessionPlugin = $sessionStorage->getPlugin();
            $sessionOrderId = (int)$sessionPlugin->getValue(BermaroTrackingServiceProvider::SESSION_KEY_ORDER);
        } catch (\Throwable $exception) {
            $sessionPlugin = null;
        }

        // Fall 1: Bestellung wurde in dieser Sitzung angelegt => melden, Merker löschen
        if ($sessionOrderId > 0 && $sessionOrderId === $orderId) {
            try {
                $sessionPlugin->unsetKey(BermaroTrackingServiceProvider::SESSION_KEY_ORDER);
            } catch (\Throwable $exception) {
                // Merker konnte nicht gelöscht werden – der Browser-Schutz greift trotzdem
            }
            return true;
        }

        // Fall 2: kein passender Merker => nur ganz frische Bestellungen melden
        $createdAt = isset($orderData['createdAt']) ? (string)$orderData['createdAt'] : '';
        if (!strlen($createdAt)) {
            // Alter unbekannt: melden, der Browser-Schutz verhindert Wiederholungen im selben Browser
            return true;
        }
        $timestamp = strtotime($createdAt);
        if ($timestamp === false) {
            return true;
        }
        return (time() - $timestamp) <= self::MAX_ORDER_AGE_MINUTES * 60;
    }
}
