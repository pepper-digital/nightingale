<?php

namespace pepperdigital\nightingale\services;

use Craft;
use craft\db\Query;
use craft\helpers\Db;
use craft\helpers\StringHelper;
use pepperdigital\nightingale\models\AuditSummary;
use yii\base\Component;

/**
 * Reads and writes stored audit summaries.
 *
 * @author Pepper Digital <hello@pepper.digital>
 * @since  1.1.0
 */
class AuditsService extends Component
{
    private const TABLE = '{{%nightingale_audits}}';

    // =========================================================================
    // Public Methods
    // =========================================================================

    /**
     * Stores (or replaces) the latest audit summary for an element + site.
     *
     * @param array<string, int|string> $counts
     */
    public function save(int $elementId, int $siteId, array $counts): bool
    {
        $now = Db::prepareDateForDb(new \DateTime());

        $values = [
            'level' => (string)($counts['level'] ?? 'aa'),
            'viewport' => (string)($counts['viewport'] ?? 'desktop'),
            'critical' => (int)($counts['critical'] ?? 0),
            'serious' => (int)($counts['serious'] ?? 0),
            'moderate' => (int)($counts['moderate'] ?? 0),
            'minor' => (int)($counts['minor'] ?? 0),
            'incomplete' => (int)($counts['incomplete'] ?? 0),
            'violations' => (int)($counts['violations'] ?? 0),
            'passes' => (int)($counts['passes'] ?? 0),
            'dateUpdated' => $now,
        ];

        $db = Craft::$app->getDb();
        $existing = (new Query())
            ->select(['id'])
            ->from(self::TABLE)
            ->where(['elementId' => $elementId, 'siteId' => $siteId])
            ->scalar();

        if ($existing !== false) {
            $db->createCommand()
                ->update(self::TABLE, $values, ['id' => $existing])
                ->execute();

            return true;
        }

        $db->createCommand()
            ->insert(self::TABLE, array_merge($values, [
                'elementId' => $elementId,
                'siteId' => $siteId,
                'dateCreated' => $now,
                'uid' => StringHelper::UUID(),
            ]))
            ->execute();

        return true;
    }

    /**
     * Returns the stored audit summary for an element + site, or null.
     */
    public function getSummary(int $elementId, int $siteId): ?AuditSummary
    {
        $row = (new Query())
            ->select([
                'critical', 'serious', 'moderate', 'minor',
                'incomplete', 'violations', 'passes', 'level', 'viewport', 'dateUpdated',
            ])
            ->from(self::TABLE)
            ->where(['elementId' => $elementId, 'siteId' => $siteId])
            ->one();

        if ($row === null) {
            return null;
        }

        return new AuditSummary(
            critical: (int)$row['critical'],
            serious: (int)$row['serious'],
            moderate: (int)$row['moderate'],
            minor: (int)$row['minor'],
            incomplete: (int)$row['incomplete'],
            violations: (int)$row['violations'],
            passes: (int)$row['passes'],
            level: (string)$row['level'],
            viewport: (string)$row['viewport'],
            dateUpdated: $row['dateUpdated'] !== null ? (string)$row['dateUpdated'] : null,
        );
    }
}
