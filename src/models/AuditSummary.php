<?php

namespace pepperdigital\nightingale\models;

/**
 * A stored audit summary for a single element + site.
 *
 * @author Pepper Digital <hello@pepper.digital>
 * @since  1.1.0
 */
class AuditSummary
{
    public function __construct(
        public readonly int $critical = 0,
        public readonly int $serious = 0,
        public readonly int $moderate = 0,
        public readonly int $minor = 0,
        public readonly int $incomplete = 0,
        public readonly int $violations = 0,
        public readonly int $passes = 0,
        public readonly string $level = 'aa',
        public readonly string $viewport = 'desktop',
        public readonly ?string $dateUpdated = null,
    ) {
    }

    /**
     * Returns true if the last audit found no violations.
     */
    public function isClean(): bool
    {
        return $this->violations === 0;
    }

    /**
     * Returns the highest impact level present, or null if clean.
     */
    public function topImpact(): ?string
    {
        return match (true) {
            $this->critical > 0 => 'critical',
            $this->serious > 0 => 'serious',
            $this->moderate > 0 => 'moderate',
            $this->minor > 0 => 'minor',
            default => null,
        };
    }
}
