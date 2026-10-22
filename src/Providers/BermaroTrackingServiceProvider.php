<?php

namespace BermaroTracking\Providers;

use BermaroTracking\Helpers\TrackingConfig;
use Plenty\Modules\Frontend\Session\Storage\Contracts\FrontendSessionStorageFactoryContract;
use Plenty\Modules\Order\Events\OrderCreated;
use Plenty\Modules\Webshop\Consent\Contracts\ConsentRepositoryContract;
use Plenty\Plugin\Events\Dispatcher;
use Plenty\Plugin\Log\Loggable;
use Plenty\Plugin\ServiceProvider;

/**
 * Start-Klasse des Plugins.
 *
 * 1. Registriert die Einträge im Cookie-Banner (Consent) von plentyShop.
 *    WICHTIG für den Umstieg: Die Schlüssel (z. B. "googleanalytics" in der Gruppe "Statistik")
 *    müssen genauso heißen wie beim bisherigen Plugin. Dann bleiben die Einwilligungen
 *    der Besucher gültig und Shoplytics bzw. die Tag-Manager-Regeln funktionieren weiter.
 *
 * 2. Merkt sich beim Anlegen einer Bestellung im Shop deren Nummer in der Sitzung des Kunden.
 *    So wird der Kauf nur auf der Bestellbestätigung direkt nach dem Bestellen gemeldet –
 *    nicht noch einmal, wenn der Kunde später den Link aus der Bestellmail öffnet.
 */
class BermaroTrackingServiceProvider extends ServiceProvider
{
    use Loggable;

    /** Name des Merkers in der Kunden-Sitzung */
    const SESSION_KEY_ORDER = 'BERMARO_TRACKING_ORDER_ID';

    /**
     * Dienste registrieren (hier nichts zu tun).
     */
    public function register()
    {
    }

    /**
     * Wird bei jedem Aufruf gestartet.
     *
     * @param Dispatcher $dispatcher
     */
    public function boot(Dispatcher $dispatcher)
    {
        try {
            /** @var TrackingConfig $trackingConfig */
            $trackingConfig = pluginApp(TrackingConfig::class);

            // Ist das Plugin für diesen Shop ausgeschaltet, nichts tun
            if (!$trackingConfig->getBool('general.active', true)) {
                return;
            }

            $this->registerConsents($trackingConfig);
        } catch (\Throwable $exception) {
            $this->getLogger(__METHOD__)->error('BermaroTracking::Log.bootError', ['message' => $exception->getMessage()]);
        }

        // Neue Bestellung: Nummer in der Sitzung merken (wie im offiziellen Google-Analytics-Plugin)
        $dispatcher->listen(OrderCreated::class, function ($event) {
            try {
                $order = $event->getOrder();
                $orderId = is_object($order) ? (int)$order->id : 0;
                if ($orderId <= 0) {
                    return;
                }
                /** @var FrontendSessionStorageFactoryContract $sessionStorage */
                $sessionStorage = pluginApp(FrontendSessionStorageFactoryContract::class);
                $sessionStorage->getPlugin()->setValue(self::SESSION_KEY_ORDER, $orderId);
            } catch (\Throwable $exception) {
                // Bestellungen außerhalb des Shops (z. B. Amazon-Import) haben keine Kunden-Sitzung – das ist in Ordnung
            }
        }, 0);
    }

    /**
     * Cookie-Banner-Einträge für Google Analytics, Google Ads und Microsoft Advertising (Bing).
     *
     * @param TrackingConfig $trackingConfig
     */
    private function registerConsents(TrackingConfig $trackingConfig)
    {
        /** @var ConsentRepositoryContract $consentRepository */
        $consentRepository = pluginApp(ConsentRepositoryContract::class);

        $services = [
            'analytics' => [
                'defaultGroup' => 'tracking',
                'defaultKey'   => 'googleanalytics',
                'position'     => 410,
                'cookieNames'  => ['/^_ga/', '_ga', '_gid', '_gat']
            ],
            'ads' => [
                'defaultGroup' => 'marketing',
                'defaultKey'   => 'googleads',
                'position'     => 420,
                'cookieNames'  => ['/^_gcl/', '_gcl_au', '_gcl_aw', '_gcl_dc']
            ],
            'bing' => [
                'defaultGroup' => 'tracking',
                'defaultKey'   => 'bingads',
                'position'     => 430,
                'cookieNames'  => ['/^_uet/', '_uetsid', '_uetvid', 'MUID']
            ]
        ];

        foreach ($services as $type => $service) {
            $settingName = 'consent.register' . ucfirst($type);
            if (!$trackingConfig->getBool($settingName, true)) {
                continue;
            }

            $group = $trackingConfig->getText('consent.' . $type . 'Group', $service['defaultGroup']);
            $key = $trackingConfig->getText('consent.' . $type . 'Key', $service['defaultKey']);
            if (!in_array($group, ['tracking', 'marketing'], true) || !strlen($key)) {
                continue;
            }

            $consentRepository->registerConsent(
                $key,
                'BermaroTracking::Consent.' . $type . 'Label',
                [
                    'description' => 'BermaroTracking::Consent.' . $type . 'Description',
                    'provider'    => 'BermaroTracking::Consent.' . $type . 'Provider',
                    'lifespan'    => 'BermaroTracking::Consent.' . $type . 'Lifespan',
                    'policyUrl'   => 'BermaroTracking::Consent.' . $type . 'PolicyUrl',
                    'group'       => $group,
                    'necessary'   => false,
                    'isOptOut'    => false,
                    'position'    => $service['position'],
                    'cookieNames' => $service['cookieNames']
                ]
            );
        }
    }
}
