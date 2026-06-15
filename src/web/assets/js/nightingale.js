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

    const VIEWPORTS = {
        desktop: { width: 1280, height: 900 },
        mobile:  { width: 390,  height: 844 },
    };

    // =========================================================================
    // Panel
    // =========================================================================

    let _panel = null;
    let _iframe = null;
    let _lastConfig = null;

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
                '<div class="nightingale-panel__actions">' +
                    '<button type="button" class="nightingale-panel__rerun" data-nightingale-rerun hidden>Run again</button>' +
                    '<button type="button" class="nightingale-panel__close" aria-label="Close audit panel">&#x2715;</button>' +
                '</div>' +
            '</div>' +
            '<div class="nightingale-panel__body"></div>';

        panel.querySelector('.nightingale-panel__close').addEventListener('click', closePanel);
        panel.querySelector('[data-nightingale-rerun]').addEventListener('click', function () {
            if (_lastConfig) {
                runAudit(_lastConfig);
            }
        });
        document.body.appendChild(panel);
        _panel = panel;

        return panel;
    }

    function openPanel(subtitle) {
        createPanel();
        _panel.querySelector('.nightingale-panel__title').textContent =
            subtitle ? 'Nightingale — ' + subtitle : 'Nightingale';
        // Force reflow before adding open class so CSS transition fires
        _panel.getBoundingClientRect();
        _panel.classList.add('nightingale-panel--open');
    }

    function closePanel() {
        if (_panel) {
            _panel.classList.remove('nightingale-panel--open');
            _panel.querySelector('[data-nightingale-rerun]').hidden = true;
        }
        cleanupIframe();
    }

    function setPanelBody(html) {
        if (_panel) {
            _panel.querySelector('.nightingale-panel__body').innerHTML = html;
        }
    }

    function showRerun() {
        if (_panel) {
            _panel.querySelector('[data-nightingale-rerun]').hidden = false;
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

    function runAudit(config) {
        _lastConfig = config;
        cleanupIframe();

        setPanelBody(
            '<div class="nightingale-loading">' +
                '<div class="nightingale-loading__spinner"></div>' +
                '<p>Loading page and running audit…</p>' +
            '</div>'
        );

        const dims = VIEWPORTS[config.viewport] || VIEWPORTS.desktop;
        const iframe = document.createElement('iframe');
        iframe.setAttribute('aria-hidden', 'true');
        // Off-screen but real viewport size so layout-dependent rules work correctly
        iframe.style.cssText =
            'position:fixed;top:0;left:-100vw;width:' + dims.width + 'px;height:' + dims.height +
            'px;opacity:0;pointer-events:none;';
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
            script.src = config.axeUrl;
            script.addEventListener('load', function () {
                const tags = (LEVEL_TAGS[config.level] || LEVEL_TAGS.aa).slice();
                if (config.bestPractices) {
                    tags.push('best-practice');
                }

                const adoc = iframe.contentDocument;
                // [data-nightingale-ignore] regions are never audited, in any mode.
                const ignoreNodes = Array.prototype.slice.call(
                    adoc.querySelectorAll('[data-nightingale-ignore]')
                );

                let context;
                let scopeNotice = null;

                if (config.scope === 'document') {
                    context = ignoreNodes.length ? { exclude: ignoreNodes } : adoc;
                } else {
                    // Prefer in-template [data-nightingale] markers, then fall back
                    // to the global content selector from plugin settings.
                    let includeNodes = Array.prototype.slice.call(
                        adoc.querySelectorAll('[data-nightingale]')
                    );

                    if (!includeNodes.length) {
                        const selector = config.contentSelector || 'main';
                        let el = null;
                        try {
                            el = adoc.querySelector(selector);
                        } catch (e) {
                            el = null;
                        }
                        if (el) {
                            includeNodes = [el];
                        }
                    }

                    if (includeNodes.length) {
                        context = { include: includeNodes };
                        if (ignoreNodes.length) {
                            context.exclude = ignoreNodes;
                        }
                    } else {
                        scopeNotice = 'No "' + (config.contentSelector || 'main') +
                            '" element or [data-nightingale] marker found — audited the whole page instead.';
                        context = ignoreNodes.length ? { exclude: ignoreNodes } : adoc;
                    }
                }
                iframe.contentWindow.axe.run(context, {
                    runOnly: { type: 'tag', values: tags },
                    // Keep live element references so the copy-prompt can include
                    // each failing element's full inner HTML, not just its opening tag.
                    elementRef: true,
                }).then(function (results) {
                    renderResults(results, scopeNotice);
                    storeResults(config, results);
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

        iframe.src = config.entryUrl;
    }

    // =========================================================================
    // Storing results
    // =========================================================================

    function impactCounts(violations) {
        const counts = { critical: 0, serious: 0, moderate: 0, minor: 0 };
        violations.forEach(function (v) {
            const key = v.impact && counts[v.impact] !== undefined ? v.impact : 'minor';
            counts[key]++;
        });
        return counts;
    }

    function storeResults(config, results) {
        if (!config.storeUrl || !config.elementId || !window.Craft) {
            return;
        }

        const violations = results.violations || [];
        const counts = impactCounts(violations);

        const body = new FormData();
        body.append(Craft.csrfTokenName, Craft.csrfTokenValue);
        body.append('elementId', config.elementId);
        body.append('siteId', config.siteId);
        body.append('level', config.level);
        body.append('viewport', config.viewport);
        body.append('critical', counts.critical);
        body.append('serious', counts.serious);
        body.append('moderate', counts.moderate);
        body.append('minor', counts.minor);
        body.append('incomplete', (results.incomplete || []).length);
        body.append('violations', violations.length);
        body.append('passes', (results.passes || []).length);

        fetch(config.storeUrl, {
            method: 'POST',
            headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
            body: body,
        }).then(function () {
            updateWidgetLast(config, violations.length);
        }).catch(function () {
            // Storing is best-effort — never block the editor on it.
        });
    }

    function updateWidgetLast(config, count) {
        const widget = document.querySelector(
            '[data-nightingale-widget][data-element-id="' + config.elementId + '"]'
        );
        if (!widget) {
            return;
        }
        let last = widget.querySelector('[data-nightingale-last]');
        if (!last) {
            last = document.createElement('p');
            last.className = 'nightingale-widget__last';
            last.setAttribute('data-nightingale-last', '');
            widget.appendChild(last);
        }
        last.textContent = count === 0
            ? 'Last run: no issues'
            : 'Last run: ' + count + ' issue' + (count !== 1 ? 's' : '');
    }

    // =========================================================================
    // Rendering
    // =========================================================================

    const IMPACT_ORDER = ['critical', 'serious', 'moderate', 'minor'];
    const IMPACT_LABEL = { critical: 'Critical', serious: 'Serious', moderate: 'Moderate', minor: 'Minor' };

    function renderResults(results, scopeNotice) {
        const violations = results.violations || [];
        const passes     = results.passes || [];
        const incomplete = results.incomplete || [];
        const notice     = scopeNotice
            ? '<p class="nightingale-notice">' + esc(scopeNotice) + '</p>'
            : '';

        showRerun();

        if (violations.length === 0 && incomplete.length === 0) {
            setPanelBody(notice + renderAllPassed(passes.length));
            return;
        }

        let html = notice + renderSummary(violations, incomplete.length);

        const grouped = {};
        IMPACT_ORDER.forEach(function (i) { grouped[i] = []; });
        violations.forEach(function (v) {
            if (grouped[v.impact]) {
                grouped[v.impact].push(v);
            } else {
                grouped.minor.push(v);
            }
        });

        IMPACT_ORDER.forEach(function (impact) {
            if (grouped[impact].length > 0) {
                html += renderGroup(impact, grouped[impact]);
            }
        });

        if (incomplete.length > 0) {
            html += renderIncompleteSection(incomplete);
        }

        if (passes.length > 0) {
            html += renderPassesSection(passes);
        }

        setPanelBody(html);
        bindAccordions();
        bindCopyButtons();
    }

    function renderSummary(violations, incompleteCount) {
        const counts = impactCounts(violations);

        const pills = IMPACT_ORDER
            .filter(function (i) { return counts[i] > 0; })
            .map(function (i) {
                return '<span class="nightingale-pill nightingale-pill--' + i + '">' +
                    counts[i] + ' ' + IMPACT_LABEL[i] +
                '</span>';
            });

        if (incompleteCount > 0) {
            pills.push(
                '<span class="nightingale-pill nightingale-pill--review">' +
                    incompleteCount + ' Needs review' +
                '</span>'
            );
        }

        const headline = violations.length === 0
            ? 'No clear issues found'
            : violations.length + ' issue' + (violations.length !== 1 ? 's' : '') + ' found';

        return '<div class="nightingale-summary">' +
            '<p class="nightingale-summary__count">' + headline + '</p>' +
            '<div class="nightingale-summary__pills">' + pills.join('') + '</div>' +
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
        const prompt = buildPrompt(v);

        return '<div class="nightingale-violation">' +
            '<button type="button" class="nightingale-violation__toggle" aria-expanded="false">' +
                '<span class="nightingale-violation__title">' + esc(v.help) + '</span>' +
                '<span class="nightingale-violation__count">' + count + ' element' + (count !== 1 ? 's' : '') + '</span>' +
            '</button>' +
            '<div class="nightingale-violation__detail" hidden>' +
                '<p class="nightingale-violation__desc">' + esc(v.description) + '</p>' +
                '<div class="nightingale-violation__nodes">' + nodes + '</div>' +
                '<div class="nightingale-violation__footer">' +
                    '<a href="' + esc(v.helpUrl) + '" target="_blank" rel="noopener noreferrer" class="nightingale-violation__learn">Learn more ↗</a>' +
                    '<button type="button" class="nightingale-violation__copy" data-nightingale-copy="' + esc(prompt) + '">Copy fix prompt</button>' +
                '</div>' +
            '</div>' +
        '</div>';
    }

    // axe's node.html is only the element's opening tag. When a live element
    // reference is available (elementRef: true), use its full outerHTML so the
    // prompt includes the children — e.g. the icon or image inside a link.
    function promptHtml(node) {
        let html = node.html || '';
        if (node.element && node.element.outerHTML) {
            html = node.element.outerHTML;
        }
        const MAX = 800;
        if (html.length > MAX) {
            html = html.slice(0, MAX) + '…';
        }
        return html;
    }

    function buildPrompt(v) {
        const snippets = (v.nodes || []).slice(0, 5).map(promptHtml)
            .filter(Boolean).join('\n');

        return 'I have an accessibility issue flagged by axe-core on my website.\n\n' +
            'Rule: ' + (v.help || '') + '\n' +
            'Description: ' + (v.description || '') + '\n' +
            'Impact: ' + (v.impact || 'unknown') + '\n' +
            'Reference: ' + (v.helpUrl || '') + '\n\n' +
            'Failing HTML:\n' + snippets + '\n\n' +
            'Explain in plain English what is wrong and how to fix it.';
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

    function renderIncompleteSection(incomplete) {
        const items = incomplete.map(function (v) {
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
        }).join('');

        return '<div class="nightingale-group nightingale-group--review">' +
            '<h3 class="nightingale-group__heading">' +
                '<span class="nightingale-impact nightingale-impact--review">Needs review</span>' +
            '</h3>' +
            '<p class="nightingale-group__note">Nightingale spotted these but can\'t decide on its own — a person needs to check them.</p>' +
            items +
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
    // Accordions & copy buttons
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

    function bindCopyButtons() {
        if (!_panel) {
            return;
        }

        _panel.querySelectorAll('[data-nightingale-copy]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                const text = this.getAttribute('data-nightingale-copy');
                const original = this.textContent;
                const self = this;

                function done() {
                    self.textContent = 'Copied ✓';
                    setTimeout(function () { self.textContent = original; }, 1600);
                }

                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(text).then(done, done);
                } else {
                    done();
                }
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

        const widget = btn.closest('[data-nightingale-widget]');
        if (!widget) {
            return;
        }

        const levelEl    = widget.querySelector('[data-nightingale-level]');
        const bpEl       = widget.querySelector('[data-nightingale-best-practices]');
        const scopeEl    = widget.querySelector('[data-nightingale-scope]');
        const viewportEl = widget.querySelector('[data-nightingale-viewport]');

        const config = {
            entryUrl:        widget.getAttribute('data-entry-url'),
            axeUrl:          widget.getAttribute('data-axe-url'),
            contentSelector: widget.getAttribute('data-content-selector') || 'main',
            storeUrl:        widget.getAttribute('data-store-url'),
            elementId:       widget.getAttribute('data-element-id'),
            siteId:          widget.getAttribute('data-site-id'),
            level:           levelEl ? levelEl.value : 'aa',
            bestPractices:   bpEl ? bpEl.checked : true,
            scope:           scopeEl ? scopeEl.value : 'main',
            viewport:        viewportEl ? viewportEl.value : 'desktop',
        };

        if (!config.entryUrl || !config.axeUrl) {
            return;
        }

        const subtitle = LEVEL_LABEL[config.level] +
            (config.viewport === 'mobile' ? ' · Mobile' : '') +
            (config.bestPractices ? ' + Best practices' : '');

        openPanel(subtitle);
        runAudit(config);
    });

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && _panel && _panel.classList.contains('nightingale-panel--open')) {
            closePanel();
        }
    });
}());
