<?php

namespace BermaroTracking\Containers;

use BermaroTracking\Helpers\TrackingConfig;
use Plenty\Plugin\Log\Loggable;
use Plenty\Plugin\Templates\Twig;

/**
 * Inhalt für den Container "Ceres::PageDesign.AfterOpeningHeadTag".
 * Lädt den Google Tag Manager so früh wie möglich im <head>.
 */
class HeadContainer
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

            return $twig->render(
                'BermaroTracking::Head',
                [
                    'configJson' => TrackingConfig::toScriptJson($trackingConfig->toFrontendArray())
                ]
            );
        } catch (\Throwable $exception) {
            // Ein Fehler im Tracking darf den Shop niemals lahmlegen
            $this->getLogger(__METHOD__)->error('BermaroTracking::Log.headError', ['message' => $exception->getMessage()]);
            return '';
        }
    }
}
