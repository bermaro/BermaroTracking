<?php

namespace BermaroTracking\Containers;

use BermaroTracking\Helpers\TrackingConfig;
use Plenty\Plugin\Log\Loggable;
use Plenty\Plugin\Templates\Twig;

/**
 * Inhalt für den Container "Ceres::PageDesign.AfterOpeningBodyTag".
 * Ersatz-Einbindung (<noscript>) des Tag Managers für Browser ohne JavaScript.
 */
class BodyContainer
{
    use Loggable;

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

            // Wenn der Tag Manager erst nach Einwilligung laden darf, gibt es keine noscript-Variante
            $consentMode = $trackingConfig->getText('consent.mode', 'off');
            if ($consentMode === 'basic' || $trackingConfig->getBool('consent.loadGtmOnlyAfterConsent', false)) {
                return '';
            }

            return $twig->render(
                'BermaroTracking::Body',
                [
                    'containerId' => $trackingConfig->getContainerId()
                ]
            );
        } catch (\Throwable $exception) {
            $this->getLogger(__METHOD__)->error('BermaroTracking::Log.bodyError', ['message' => $exception->getMessage()]);
            return '';
        }
    }
}
