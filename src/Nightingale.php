<?php

namespace pepperdigital\nightingale;

use Craft;
use craft\base\Plugin;
use craft\elements\Entry;
use craft\events\DefineAttributeHtmlEvent;
use craft\events\DefineHtmlEvent;
use craft\events\RegisterElementTableAttributesEvent;
use craft\events\RegisterTemplateRootsEvent;
use craft\helpers\UrlHelper;
use craft\web\View;
use pepperdigital\nightingale\assetbundles\NightingaleAsset;
use pepperdigital\nightingale\models\Settings;
use pepperdigital\nightingale\services\AuditsService;
use yii\base\Event;

/**
 * Nightingale plugin.
 *
 * @method static Nightingale getInstance()
 * @method Settings getSettings()
 *
 * @author Pepper Digital <hello@pepper.digital>
 * @since  1.0.0
 */
class Nightingale extends Plugin
{
    // =========================================================================
    // Static Properties
    // =========================================================================

    public string $schemaVersion = '1.1.0';
    public bool $hasCpSettings = true;
    public bool $hasCpSection = false;

    private const TABLE_ATTRIBUTE = 'nightingaleAudit';

    // =========================================================================
    // Public Methods
    // =========================================================================

    /**
     * @inheritdoc
     */
    public function init(): void
    {
        parent::init();

        $this->setComponents([
            'audits' => AuditsService::class,
        ]);

        Event::on(
            View::class,
            View::EVENT_REGISTER_CP_TEMPLATE_ROOTS,
            function(RegisterTemplateRootsEvent $event) {
                $event->roots['nightingale'] = __DIR__ . '/templates';
            }
        );

        $this->_registerSidebarHook();
        $this->_registerElementIndexColumn();
    }

    /**
     * Returns the Audits service.
     */
    public function getAudits(): AuditsService
    {
        /** @var AuditsService */
        return $this->get('audits');
    }

    // =========================================================================
    // Protected Methods
    // =========================================================================

    /**
     * @inheritdoc
     */
    protected function createSettingsModel(): Settings
    {
        return new Settings();
    }

    /**
     * @inheritdoc
     */
    protected function settingsHtml(): ?string
    {
        return Craft::$app->getView()->renderTemplate('nightingale/cp/_settings-panel', [
            'settings' => $this->getSettings(),
            'entryTypes' => Craft::$app->getEntries()->getAllEntryTypes(),
        ]);
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

                // Opt-in: only show on entry types enabled in settings.
                if (!in_array($entry->getType()->uid, $this->getSettings()->enabledEntryTypes, true)) {
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
                    'entry' => $entry,
                    'entryUrl' => $url,
                    'axeUrl' => $axeUrl,
                    'settings' => $this->getSettings(),
                    'storeUrl' => UrlHelper::actionUrl('nightingale/audit/store'),
                    'summary' => $this->getAudits()->getSummary($entry->id, $entry->siteId),
                ], View::TEMPLATE_MODE_CP);
            }
        );
    }

    /**
     * Registers the "Accessibility" column on the entry index.
     */
    private function _registerElementIndexColumn(): void
    {
        Event::on(
            Entry::class,
            Entry::EVENT_REGISTER_TABLE_ATTRIBUTES,
            function(RegisterElementTableAttributesEvent $event) {
                $event->tableAttributes[self::TABLE_ATTRIBUTE] = [
                    'label' => Craft::t('nightingale', 'Accessibility'),
                ];
            }
        );

        Event::on(
            Entry::class,
            Entry::EVENT_DEFINE_ATTRIBUTE_HTML,
            function(DefineAttributeHtmlEvent $event) {
                if ($event->attribute !== self::TABLE_ATTRIBUTE) {
                    return;
                }

                /** @var Entry $entry */
                $entry = $event->sender;

                if (!$entry->id || $entry->siteId === null) {
                    $event->html = '';
                    return;
                }

                $summary = $this->getAudits()->getSummary($entry->id, $entry->siteId);

                $event->html = Craft::$app->getView()->renderTemplate(
                    'nightingale/_components/index-cell',
                    ['summary' => $summary],
                    View::TEMPLATE_MODE_CP
                );
            }
        );
    }
}
