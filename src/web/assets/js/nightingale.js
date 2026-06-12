(function () {
    'use strict';

    // =========================================================================
    // axe-core tag sets per WCAG conformance level
    // =========================================================================

    const LEVEL_TAGS = {
        a:   ['wcag2a', 'wcag21a'],
        aa:  ['wcag2a', 'wcag21a', 'wcag2aa', 'wcag21aa', 'wcag22aa'],
        aaa: ['wcag2a', 'wcag21a', 'wcag2aa', 'wcag21aa', 'wcag22aa', 'wcag2aaa'],
    };

    const LEVEL_LABEL = { a: 'WCAG A', aa: 'WCAG AA', aaa: 'WCAG AAA' };

    // =========================================================================
    // Panel
    // =========================================================================

    let _panel = null;
    let _iframe = null;

    function createPanel() {
        if (_panel) {
            return _panel;
        }

        const panel = document.createElement('div');
        panel.className = 'nightingale-panel';
        panel.setAttribute('role', 'dialog');
        panel.setAttribute('aria-label', 'Nightingale accessibility audit');
        panel.innerHTML =
            '<div class="nightingale-panel__header">' +
                '<h2 class="nightingale-panel__title">Nightingale</h2>' +
                '<button type="button" class="nightingale-panel__close" aria-label="Close audit panel">&#x2715;</button>' +
            '</div>' +
            '<div class="nightingale-panel__body"></div>';

        panel.querySelector('.nightingale-panel__close').addEventListener('click', closePanel);
        document.body.appendChild(panel);
        _panel = panel;

        return panel;
    }

    function openPanel(subtitle) {
        createPanel();
        if (subtitle) {
            _panel.querySelector('.nightingale-panel__title').textContent = 'Nightingale — ' + subtitle;
        }
        // Force reflow before adding open class so CSS transition fires
        _panel.getBoundingClientRect();
        _panel.classList.add('nightingale-panel--open');
    }

    function closePanel() {
        if (_panel) {
            _panel.classList.remove('nightingale-panel--open');
        }
        cleanupIframe();
    }

    function setPanelBody(html) {
        if (_panel) {
            _panel.querySelector('.nightingale-panel__body').innerHTML = html;
        }
    }

    // =========================================================================
    // Iframe
    // =========================================================================

    function cleanupIframe() {
        if (_iframe) {
            _iframe.remove();
            _iframe = null;
        }
    }

    function runAudit(entryUrl, axeUrl, level, bestPractices, scope) {
        cleanupIframe();

        setPanelBody(
            '<div class="nightingale-loading">' +
                '<div class="nightingale-loading__spinner"></div>' +
                '<p>Loading page and running audit…</p>' +
            '</div>'
        );

        const iframe = document.createElement('iframe');
        iframe.setAttribute('aria-hidden', 'true');
        // Off-screen but full viewport size so layout-dependent rules work correctly
        iframe.style.cssText = 'position:fixed;top:0;left:-100vw;width:1280px;height:900px;opacity:0;pointer-events:none;';
        document.body.appendChild(iframe);
        _iframe = iframe;

        let loaded = false;

        iframe.addEventListener('load', function () {
            if (loaded) return;
            loaded = true;

            let doc;
            try {
                doc = iframe.contentDocument;
            } catch (e) {
                showError('The page is on a different domain and cannot be audited from here.');
                return;
            }

            if (!doc) {
                showError('Could not access the page.');
                return;
            }

            const script = doc.createElement('script');
            script.src = axeUrl;
            script.addEventListener('load', function () {
                const tags = (LEVEL_TAGS[level] || LEVEL_TAGS.aa).slice();
                if (bestPractices) {
                    tags.push('best-practice');
                }

                let context = iframe.contentDocument;
                let scopeNotice = null;
                if (scope !== 'document') {
                    const mainEl = iframe.contentDocument.querySelector('main');
                    if (mainEl) {
                        context = mainEl;
                    } else {
                        scopeNotice = 'No <main> element found — audited the whole page instead.';
                    }
                }
                iframe.contentWindow.axe.run(context, {
                    runOnly: { type: 'tag', values: tags },
                }).then(function (results) {
                    renderResults(results, scopeNotice);
                }).catch(function (err) {
                    showError('Audit failed: ' + err.message);
                });
            });
            script.addEventListener('error', function () {
                showError('Could not load the axe-core library.');
            });
            doc.head.appendChild(script);
        });

        iframe.addEventListener('error', function () {
            showError('The page could not be loaded.');
        });

        // Detect if the page refuses to frame (X-Frame-Options / CSP frame-ancestors)
        // We can't catch that directly, so set a timeout fallback
        const timeout = setTimeout(function () {
            if (!loaded) {
                showError('The page did not load. It may be blocked by X-Frame-Options or CSP frame-ancestors headers.');
            }
        }, 15000);

        iframe.addEventListener('load', function () {
            clearTimeout(timeout);
        });

        iframe.src = entryUrl;
    }

    // =========================================================================
    // Rendering
    // =========================================================================

    const IMPACT_ORDER = ['critical', 'serious', 'moderate', 'minor'];
    const IMPACT_LABEL = { critical: 'Critical', serious: 'Serious', moderate: 'Moderate', minor: 'Minor' };

    function renderResults(results, scopeNotice) {
        const violations = results.violations || [];
        const passes     = results.passes || [];
        const notice     = scopeNotice
            ? '<p class="nightingale-notice">' + esc(scopeNotice) + '</p>'
            : '';

        if (violations.length === 0) {
            setPanelBody(notice + renderAllPassed(passes.length));
            return;
        }

        const grouped = {};
        IMPACT_ORDER.forEach(function (i) { grouped[i] = []; });
        violations.forEach(function (v) {
            if (grouped[v.impact]) {
                grouped[v.impact].push(v);
            } else {
                grouped.minor.push(v);
            }
        });

        let html = notice + renderSummary(violations);

        IMPACT_ORDER.forEach(function (impact) {
            if (grouped[impact].length > 0) {
                html += renderGroup(impact, grouped[impact]);
            }
        });

        if (passes.length > 0) {
            html += renderPassesSection(passes);
        }

        setPanelBody(html);
        bindAccordions();
    }

    function renderSummary(violations) {
        const counts = {};
        IMPACT_ORDER.forEach(function (i) { counts[i] = 0; });
        violations.forEach(function (v) {
            const key = v.impact && counts[v.impact] !== undefined ? v.impact : 'minor';
            counts[key]++;
        });

        const pills = IMPACT_ORDER
            .filter(function (i) { return counts[i] > 0; })
            .map(function (i) {
                return '<span class="nightingale-pill nightingale-pill--' + i + '">' +
                    counts[i] + ' ' + IMPACT_LABEL[i] +
                '</span>';
            })
            .join('');

        return '<div class="nightingale-summary">' +
            '<p class="nightingale-summary__count">' +
                violations.length + ' issue' + (violations.length !== 1 ? 's' : '') + ' found' +
            '</p>' +
            '<div class="nightingale-summary__pills">' + pills + '</div>' +
        '</div>';
    }

    function renderGroup(impact, violations) {
        return '<div class="nightingale-group">' +
            '<h3 class="nightingale-group__heading">' +
                '<span class="nightingale-impact nightingale-impact--' + impact + '">' + IMPACT_LABEL[impact] + '</span>' +
            '</h3>' +
            violations.map(renderViolation).join('') +
        '</div>';
    }

    function renderViolation(v) {
        const count = v.nodes ? v.nodes.length : 0;
        const nodes = v.nodes ? v.nodes.map(renderNode).join('') : '';

        return '<div class="nightingale-violation">' +
            '<button type="button" class="nightingale-violation__toggle" aria-expanded="false">' +
                '<span class="nightingale-violation__title">' + esc(v.help) + '</span>' +
                '<span class="nightingale-violation__count">' + count + ' element' + (count !== 1 ? 's' : '') + '</span>' +
            '</button>' +
            '<div class="nightingale-violation__detail" hidden>' +
                '<p class="nightingale-violation__desc">' + esc(v.description) + '</p>' +
                '<div class="nightingale-violation__nodes">' + nodes + '</div>' +
                '<a href="' + esc(v.helpUrl) + '" target="_blank" rel="noopener noreferrer" class="nightingale-violation__learn">Learn more ↗</a>' +
            '</div>' +
        '</div>';
    }

    function renderFailureSummary(text) {
        const lines = text.split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
        if (lines.length === 0) return '';

        let html = '';
        let pending = [];

        function flushItems() {
            if (pending.length === 0) return;
            html += '<ul class="nightingale-node__summary-list">' +
                pending.map(function (i) { return '<li>' + esc(i) + '</li>'; }).join('') +
                '</ul>';
            pending = [];
        }

        lines.forEach(function (line) {
            if (/^Fix (all|any) of the following:/i.test(line)) {
                flushItems();
                html += '<p class="nightingale-node__summary">' + esc(line) + '</p>';
            } else {
                pending.push(line);
            }
        });

        flushItems();
        return html;
    }

    function renderNode(node) {
        const summary = node.failureSummary
            ? renderFailureSummary(node.failureSummary)
            : '';
        return '<div class="nightingale-node">' +
            '<code class="nightingale-node__html">' + esc(node.html || '') + '</code>' +
            summary +
        '</div>';
    }

    function renderAllPassed(passCount) {
        return '<div class="nightingale-all-pass">' +
            '<div class="nightingale-all-pass__icon" aria-hidden="true">✓</div>' +
            '<p class="nightingale-all-pass__headline">No issues found</p>' +
            '<p class="nightingale-all-pass__sub">' + passCount + ' rule' + (passCount !== 1 ? 's' : '') + ' passed.</p>' +
        '</div>';
    }

    function renderPassesSection(passes) {
        const items = passes.map(function (p) {
            return '<li>' + esc(p.help) + '</li>';
        }).join('');

        return '<div class="nightingale-passes">' +
            '<button type="button" class="nightingale-passes__toggle" aria-expanded="false">' +
                passes.length + ' rule' + (passes.length !== 1 ? 's' : '') + ' passed' +
            '</button>' +
            '<ul class="nightingale-passes__list" hidden>' + items + '</ul>' +
        '</div>';
    }

    function showError(message) {
        setPanelBody(
            '<div class="nightingale-error">' +
                '<p class="nightingale-error__heading">Audit could not run</p>' +
                '<p class="nightingale-error__detail">' + esc(message) + '</p>' +
            '</div>'
        );
    }

    function esc(str) {
        return String(str || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    // =========================================================================
    // Accordions
    // =========================================================================

    function bindAccordions() {
        if (!_panel) {
            return;
        }

        _panel.querySelectorAll('.nightingale-violation__toggle').forEach(function (btn) {
            btn.addEventListener('click', function () {
                const expanded = this.getAttribute('aria-expanded') === 'true';
                this.setAttribute('aria-expanded', String(!expanded));
                this.nextElementSibling.hidden = expanded;
            });
        });

        _panel.querySelectorAll('.nightingale-passes__toggle').forEach(function (btn) {
            btn.addEventListener('click', function () {
                const expanded = this.getAttribute('aria-expanded') === 'true';
                this.setAttribute('aria-expanded', String(!expanded));
                this.nextElementSibling.hidden = expanded;
            });
        });
    }

    // =========================================================================
    // Init
    // =========================================================================

    document.addEventListener('click', function (e) {
        const btn = e.target.closest('[data-nightingale-run]');
        if (!btn) {
            return;
        }

        const widget   = btn.closest('[data-nightingale-widget]');
        const entryUrl = widget ? widget.getAttribute('data-entry-url') : btn.getAttribute('data-entry-url');
        const axeUrl   = widget ? widget.getAttribute('data-axe-url')   : btn.getAttribute('data-axe-url');

        if (!entryUrl || !axeUrl) {
            return;
        }

        const levelEl = widget ? widget.querySelector('[data-nightingale-level]') : null;
        const bpEl    = widget ? widget.querySelector('[data-nightingale-best-practices]') : null;
        const scopeEl = widget ? widget.querySelector('[data-nightingale-scope]') : null;
        const level   = levelEl ? levelEl.value : 'aa';
        const bp      = bpEl ? bpEl.checked : true;
        const scope   = scopeEl ? scopeEl.value : 'main';

        const subtitle = LEVEL_LABEL[level] + (bp ? ' + Best practices' : '');

        openPanel(subtitle);
        runAudit(entryUrl, axeUrl, level, bp, scope);
    });

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && _panel && _panel.classList.contains('nightingale-panel--open')) {
            closePanel();
        }
    });
}());
