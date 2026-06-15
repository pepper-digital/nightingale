<?php

namespace pepperdigital\nightingale\migrations;

use craft\db\Migration;

/**
 * Creates the nightingale_audits table for installs upgrading from 1.0.0,
 * where the table didn't exist. Idempotent — fresh 1.1.0 installs already
 * have it from Install, so this guard skips them.
 *
 * @author Pepper Digital <hello@pepper.digital>
 * @since  1.1.0
 */
class m260615_090000_create_audits_table extends Migration
{
    /**
     * @inheritdoc
     */
    public function safeUp(): bool
    {
        if ($this->db->tableExists('{{%nightingale_audits}}')) {
            return true;
        }

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
