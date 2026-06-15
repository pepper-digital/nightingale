<?php

namespace pepperdigital\nightingale\models;

use craft\base\Model;

/**
 * Nightingale settings.
 *
 * @author Pepper Digital <hello@pepper.digital>
 * @since  1.1.0
 */
class Settings extends Model
{
    /** @var string CSS selector for the content area to audit (falls back to whole page if not found) */
    public string $contentSelector = 'main';

    /** @var string Default WCAG conformance level — a, aa or aaa */
    public string $defaultLevel = 'aa';

    /** @var bool Whether the best-practices rules are on by default */
    public bool $defaultBestPractices = true;

    /** @var string Default viewport the audit runs at — desktop or mobile */
    public string $defaultViewport = 'desktop';

    /** @var string[] Entry type UIDs the Nightingale widget is enabled on */
    public array $enabledEntryTypes = [];

    /**
     * @return array<int, mixed>
     */
    protected function defineRules(): array
    {
        return array_merge(parent::defineRules(), [
            [['contentSelector'], 'required'],
            [['contentSelector'], 'string'],
            [['defaultLevel'], 'in', 'range' => ['a', 'aa', 'aaa']],
            [['defaultViewport'], 'in', 'range' => ['desktop', 'mobile']],
            [['defaultBestPractices'], 'boolean'],
            // Drop the empty string the checkbox-select hidden input posts.
            [['enabledEntryTypes'], 'filter', 'filter' => fn($value) => array_values(array_filter((array)$value))],
            [['enabledEntryTypes'], 'safe'],
        ]);
    }
}
