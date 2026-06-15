<?php

namespace pepperdigital\nightingale\migrations;

use craft\db\Migration;

/**
 * Install migration.
 *
 * @author Pepper Digital <hello@pepper.digital>
 * @since  1.1.0
 */
class Install extends Migration
{
    /**
     * @inheritdoc
     */
    public function safeUp(): bool
    {
        if (!$this->db->tableExists('{{%nightingale_audits}}')) {
            $this->createTable('{{%nightingale_audits}}', [
                'id' => $this->primaryKey(),
                'elementId' => $this->integer()->notNull(),
                'siteId' => $this->integer()->notNull(),
                'level' => $this->string(8)->notNull()->defaultValue('aa'),
                'viewport' => $this->string(16)->notNull()->defaultValue('desktop'),
                'critical' => $this->integer()->notNull()->defaultValue(0),
                'serious' => $this->integer()->notNull()->defaultValue(0),
                'moderate' => $this->integer()->notNull()->defaultValue(0),
                'minor' => $this->integer()->notNull()->defaultValue(0),
                'incomplete' => $this->integer()->notNull()->defaultValue(0),
                'violations' => $this->integer()->notNull()->defaultValue(0),
                'passes' => $this->integer()->notNull()->defaultValue(0),
                'dateCreated' => $this->dateTime()->notNull(),
                'dateUpdated' => $this->dateTime()->notNull(),
                'uid' => $this->uid(),
            ]);

            // One stored audit per element + site — the latest run upserts over it.
            $this->createIndex(null, '{{%nightingale_audits}}', ['elementId', 'siteId'], true);

            $this->addForeignKey(
                null,
                '{{%nightingale_audits}}',
                ['elementId'],
                '{{%elements}}',
                ['id'],
                'CASCADE',
                null
            );

            $this->addForeignKey(
                null,
                '{{%nightingale_audits}}',
                ['siteId'],
                '{{%sites}}',
                ['id'],
                'CASCADE',
                'CASCADE'
            );
        }

        return true;
    }

    /**
     * @inheritdoc
     */
    public function safeDown(): bool
    {
        $this->dropTableIfExists('{{%nightingale_audits}}');
        return true;
    }
}
