<?php

namespace pepperdigital\nightingale\controllers;

use Craft;
use craft\web\Controller;
use pepperdigital\nightingale\Nightingale;
use yii\web\Response;

/**
 * Receives audit results from the CP widget and stores the summary.
 *
 * @author Pepper Digital <hello@pepper.digital>
 * @since  1.1.0
 */
class AuditController extends Controller
{
    /**
     * @inheritdoc
     */
    public function beforeAction($action): bool
    {
        $this->requireLogin();
        $this->requireAcceptsJson();

        return parent::beforeAction($action);
    }

    /**
     * Stores the latest audit summary for an element + site.
     */
    public function actionStore(): Response
    {
        $this->requirePostRequest();

        $request = Craft::$app->getRequest();
        $elementId = (int)$request->getRequiredBodyParam('elementId');
        $siteId = (int)$request->getRequiredBodyParam('siteId');

        // Only let editors store audits for elements they can actually see.
        $element = Craft::$app->getElements()->getElementById($elementId, null, $siteId);

        if ($element === null) {
            return $this->asJson(['success' => false, 'message' => Craft::t('nightingale', 'Element not found.')]);
        }

        $counts = [
            'level' => (string)$request->getBodyParam('level', 'aa'),
            'viewport' => (string)$request->getBodyParam('viewport', 'desktop'),
            'critical' => (int)$request->getBodyParam('critical', 0),
            'serious' => (int)$request->getBodyParam('serious', 0),
            'moderate' => (int)$request->getBodyParam('moderate', 0),
            'minor' => (int)$request->getBodyParam('minor', 0),
            'incomplete' => (int)$request->getBodyParam('incomplete', 0),
            'violations' => (int)$request->getBodyParam('violations', 0),
            'passes' => (int)$request->getBodyParam('passes', 0),
        ];

        Nightingale::getInstance()->getAudits()->save($elementId, $siteId, $counts);

        return $this->asJson(['success' => true]);
    }
}
