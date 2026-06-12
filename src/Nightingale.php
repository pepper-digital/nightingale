<?php

namespace pepperdigital\nightingale;

use Craft;
use craft\base\Plugin;
use craft\elements\Entry;
use craft\events\DefineHtmlEvent;
use craft\events\RegisterTemplateRootsEvent;
use craft\web\View;
use pepperdigital\nightingale\assetbundles\NightingaleAsset;
use yii\base\Event;

/**
 * Nightingale plugin.
 *
 * @method static Nightingale getInstance()
 *
 * @author Pepper Digital <hello@pepper.digital>
 * @since  1.0.0
 */
class Nightingale extends Plugin
{
    // =========================================================================
    // Static Properties
    // =========================================================================

    public string $schemaVersion = '1.0.0';
    public bool $hasCpSettings = false;
    public bool $hasCpSection = false;

    // =========================================================================
    // Public Methods
    // =========================================================================

    /**
     * @inheritdoc
     */
    public function init(): void
    {
        parent::init();

        Event::on(
            View::class,
            View::EVENT_REGISTER_CP_TEMPLATE_ROOTS,
            function(RegisterTemplateRootsEvent $event) {
                $event->roots['nightingale'] = __DIR__ . '/templates';
            }
        );

        $this->_registerSidebarHook();
    }

    // =========================================================================
    // Private Methods
    // =========================================================================

    /**
     * Appends the Nightingale audit widget to the entry editor sidebar.
     */
    private function _registerSidebarHook(): void
    {
        Event::on(
            Entry::class,
            Entry::EVENT_DEFINE_SIDEBAR_HTML,
            function(DefineHtmlEvent $event) {
                /** @var Entry $entry */
                $entry = $event->sender;

                if (!$entry->id || $entry->siteId === null) {
                    return;
                }

                $url = $entry->getUrl();

                if ($url === null) {
                    return;
                }

                $view = Craft::$app->getView();
                $bundle = $view->registerAssetBundle(NightingaleAsset::class);
                $axeUrl = $bundle->baseUrl . '/js/axe.min.js';

                $event->html .= $view->renderTemplate('nightingale/_components/entry-sidebar', [
                    'entry'    => $entry,
                    'entryUrl' => $url,
                    'axeUrl'   => $axeUrl,
                ], View::TEMPLATE_MODE_CP);
            }
        );
    }
}
