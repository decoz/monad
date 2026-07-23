/**
 * MONO Tree View Web Component (<mono-tree>)
 * MONO 노드 아키텍처를 폴딩 가능한 인터랙티브 트리 구조로 시각화합니다.
 */
class MonoTree extends HTMLElement {
    static get observedAttributes() {
        return ['expr'];
    }

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this._mono = null;
    }

    connectedCallback() {
        if (!this._mono && this.getAttribute('expr')) {
            this.setExpr(this.getAttribute('expr'));
        } else {
            this.render();
        }
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'expr' && oldValue !== newValue) {
            this.setExpr(newValue);
        }
    }

    get mono() {
        return this._mono;
    }

    set mono(instance) {
        this._mono = instance;
        this.render();
    }

    setExpr(exprStr) {
        if (!exprStr) {
            this._mono = null;
            this.render();
            return;
        }

        try {
            const MonoClass = typeof Mono !== 'undefined' ? Mono : (window.Mono || null);
            if (MonoClass) {
                this._mono = new MonoClass(exprStr);
            } else {
                this._mono = null;
            }
        } catch (e) {
            console.error('<mono-tree> parse error:', e);
            this._mono = null;
        }
        this.render();
    }

    expandAll() {
        const detailsElements = this.shadowRoot.querySelectorAll('details');
        detailsElements.forEach(el => el.open = true);
    }

    collapseAll() {
        const detailsElements = this.shadowRoot.querySelectorAll('details');
        detailsElements.forEach(el => el.open = false);
    }

    render() {
        this.shadowRoot.innerHTML = `
        <style>
            :host {
                display: block;
                font-family: 'Fira Code', 'Consolas', 'Courier New', monospace;
                font-size: 13px;
                color: #f1f5f9;
                background-color: #0b0f19;
                border: 1px solid #1e293b;
                border-radius: 8px;
                overflow: hidden;
                box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4);
                tab-size: 4;
                -moz-tab-size: 4;
            }

            .toolbar {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 10px 14px;
                background-color: #161e2e;
                border-bottom: 1px solid #1e293b;
            }

            .toolbar-title {
                font-weight: 600;
                font-size: 12px;
                color: #38bdf8;
                letter-spacing: 0.5px;
                display: flex;
                align-items: center;
                gap: 6px;
            }

            .toolbar-actions {
                display: flex;
                gap: 6px;
            }

            .tool-btn {
                background-color: #1e293b;
                color: #94a3b8;
                border: 1px solid #334155;
                border-radius: 4px;
                padding: 4px 8px;
                font-size: 11px;
                font-family: inherit;
                cursor: pointer;
                transition: all 0.15s ease;
            }

            .tool-btn:hover {
                background-color: #334155;
                color: #f8fafc;
                border-color: #38bdf8;
            }

            .tree-container {
                padding: 12px 14px;
                max-height: 500px;
                overflow-y: auto;
            }

            /* Custom Scrollbar */
            .tree-container::-webkit-scrollbar {
                width: 6px;
                height: 6px;
            }
            .tree-container::-webkit-scrollbar-thumb {
                background: #334155;
                border-radius: 3px;
            }
            .tree-container::-webkit-scrollbar-track {
                background: #0b0f19;
            }

            /* Details & Summary (Folding Tree) */
            details {
                margin-left: 14px;
                position: relative;
            }

            details[open] > summary::before {
                transform: rotate(90deg);
            }

            summary {
                list-style: none;
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 4px 6px;
                margin: 2px 0;
                border-radius: 4px;
                cursor: pointer;
                user-select: none;
                transition: background-color 0.15s ease;
            }

            summary::-webkit-details-marker {
                display: none;
            }

            summary::before {
                content: '▶';
                display: inline-block;
                font-size: 9px;
                color: #64748b;
                transition: transform 0.15s ease;
                width: 12px;
                text-align: center;
            }

            summary:hover {
                background-color: #1e293b;
            }

            .leaf-item {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 4px 6px;
                margin: 2px 0 2px 14px;
                border-radius: 4px;
            }

            .leaf-item::before {
                content: '•';
                color: #475569;
                font-size: 14px;
                width: 12px;
                text-align: center;
            }

            .leaf-item:hover {
                background-color: #131c2e;
            }

            /* Badges & Labels */
            .idx-badge {
                background-color: #1e293b;
                color: #f59e0b;
                font-size: 10px;
                font-weight: 600;
                padding: 1px 5px;
                border-radius: 3px;
                border: 1px solid #78350f;
            }

            .key-label {
                color: #38bdf8;
                font-weight: 600;
            }

            .val-label {
                color: #34d399;
            }

            .type-badge {
                font-size: 10px;
                padding: 1px 5px;
                border-radius: 3px;
                font-weight: 500;
            }

            .type-subtree {
                background-color: #312e81;
                color: #a5b4fc;
            }

            .type-leaf {
                background-color: #064e3b;
                color: #6ee7b7;
            }

            .children-count {
                color: #64748b;
                font-size: 11px;
                margin-left: auto;
            }

            .empty-msg {
                color: #64748b;
                font-style: italic;
                padding: 12px;
                text-align: center;
            }

            .path-copy-btn {
                background: none;
                border: none;
                color: #475569;
                font-size: 11px;
                cursor: pointer;
                opacity: 0;
                transition: opacity 0.15s;
                padding: 0 4px;
            }

            summary:hover .path-copy-btn, .leaf-item:hover .path-copy-btn {
                opacity: 1;
            }

            .path-copy-btn:hover {
                color: #38bdf8;
            }
        </style>

        <div class="toolbar">
            <div class="toolbar-title">
                <span>🌲 MONO AST Tree View</span>
            </div>
            <div class="toolbar-actions">
                <button class="tool-btn" id="expandBtn">전체 펼치기</button>
                <button class="tool-btn" id="collapseBtn">전체 접기</button>
            </div>
        </div>

        <div class="tree-container">
            ${this._mono ? this._renderNode(this._mono, 0, '') : '<div class="empty-msg">MONO 표현식이 지정되지 않았습니다.</div>'}
        </div>
        `;

        const expandBtn = this.shadowRoot.getElementById('expandBtn');
        const collapseBtn = this.shadowRoot.getElementById('collapseBtn');
        if (expandBtn) expandBtn.addEventListener('click', () => this.expandAll());
        if (collapseBtn) collapseBtn.addEventListener('click', () => this.collapseAll());

        // Path copy button handlers
        this.shadowRoot.querySelectorAll('.path-copy-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const path = btn.getAttribute('data-path');
                if (path) {
                    navigator.clipboard.writeText(path);
                    btn.textContent = '✓ 복사됨';
                    setTimeout(() => btn.textContent = '📋', 1200);
                }
            });
        });
    }

    _renderNode(node, idx, parentPath) {
        const hasChildren = node.childrenOrder && node.childrenOrder.length > 0;
        const currentPath = parentPath
            ? `${parentPath}.${node.key ? node.key : `[${idx}]`}`
            : (node.key || '[0]');

        if (hasChildren) {
            return `
            <details open>
                <summary>
                    <span class="idx-badge">[${idx}]</span>
                    <span class="key-label">${this._escapeHtml(node.key || '(root)')}</span>
                    <span class="type-badge type-subtree">Subtree</span>
                    <span class="children-count">${node.childrenOrder.length} 자식 노드</span>
                    <button class="path-copy-btn" data-path="${this._escapeHtml(currentPath)}" title="쿼리 경로 복사">📋</button>
                </summary>
                <div>
                    ${node.childrenOrder.map((childNode, i) => this._renderNode(childNode, i, currentPath)).join('')}
                </div>
            </details>
            `;
        } else {
            return `
            <div class="leaf-item">
                <span class="idx-badge">[${idx}]</span>
                <span class="key-label">${this._escapeHtml(node.key)}</span>
                <span style="color: #64748b">:</span>
                <span class="val-label">"${this._escapeHtml(String(node.value !== null ? node.value : ''))}"</span>
                <span class="type-badge type-leaf">Leaf</span>
                <button class="path-copy-btn" data-path="${this._escapeHtml(currentPath)}" title="쿼리 경로 복사">📋</button>
            </div>
            `;
        }
    }

    _escapeHtml(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
}

customElements.define('mono-tree', MonoTree);

if (typeof module !== 'undefined') {
    module.exports = MonoTree;
}
