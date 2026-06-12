<?php

namespace pepperdigital\nightingale\assetbundles;

use craft\web\AssetBundle;
use craft\web\assets\cp\CpAsset;

class NightingaleAsset extends AssetBundle
{
    public function init(): void
    {
        $this->sourcePath = __DIR__ . '/../web/assets';
        $this->depends    = [CpAsset::class];
        $this->js         = ['js/nightingale.js'];
        $this->css        = ['css/nightingale.css'];

        parent::init();
    }
}
