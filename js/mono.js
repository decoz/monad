/**
 * MONO (Monad Object Notation) 파서 & 노드 클래스
 */
class Mono {
    /**
     * @param {string} expr - 노드 Key 또는 "a((b,c), d)" 형태의 MONO 표현식
     * @param {any} [val=null] - Leaf 노드 값
     */
    constructor(expr, val = null) {
        this.key = null;
        this.value = val;
        this.children = new Map();       // Key 기반 Map (a.1)
        this.childrenOrder = [];         // 순서 기반 Array (a[1])

        // 문자열 표현식이 들어온 경우 파싱 실행
        if (typeof expr === 'string') {
            const trimmed = expr.trim();
            if (trimmed.includes('\n')) {
                this._parseMultiline(trimmed);
            } else if (trimmed.includes('(')) {
                this._parseExpression(trimmed);
            } else {
                this.key = trimmed;
            }
        }
    }

    /**
     * 자식 노드 추가 (Map과 Order Array 동시 유지)
     */
    addChild(n) {
        this.children.set(n.key, n);
        this.childrenOrder.push(n);
    }

    /**
     * 표준 쿼리 핸들러
     * - 명시적 Key: get("1") -> key가 "1"인 노드
     * - 순서 Index: get("[1]") -> 1번 인덱스 위치의 자식 노드
     * - 루트 포함 Key 및 Index: get("a[0]"), get("a.b"), get("[0].[0]")
     */
    get(q) {
        if (!q) return this;

        const parts = q.split('.');
        let cur = this;

        for (let i = 0; i < parts.length; i++) {
            if (!cur) return null;
            const p = parts[i];

            // 1. 순서 Index 접근 ([0])
            const pureIdxMatch = p.match(/^\[(\d+)\]$/);
            if (pureIdxMatch) {
                const idx = parseInt(pureIdxMatch[1], 10);
                cur = cur.childrenOrder[idx] || null;
                continue;
            }

            // 2. Key + Index 접근 (a[0], skills[1])
            const arrAccessMatch = p.match(/^([^\[]+)\[(\d+)\]$/);
            if (arrAccessMatch) {
                const keyPart = arrAccessMatch[1];
                const idx = parseInt(arrAccessMatch[2], 10);

                if (i === 0 && keyPart === cur.key) {
                    cur = cur.childrenOrder[idx] || null;
                } else {
                    cur = cur.children.get(keyPart);
                    if (cur) cur = cur.childrenOrder[idx] || null;
                }
                continue;
            }

            // 3. 단일 Key 접근 (a, b)
            if (i === 0 && p === cur.key) {
                continue;
            }
            cur = cur.children.get(p) || null;
        }

        return cur;
    }

    /**
     * MONO 표현식 파서
     * @private
     */
    _parseExpression(expr) {
        this._isGroupParent = true;
        const fp = expr.indexOf('(');
        this.key = expr.slice(0, fp).trim();
        const body = expr.slice(fp + 1, expr.lastIndexOf(')')).trim();

        const toks = this._tokenize(body);
        let idx = 0;

        for (let t of toks) {
            this._addToken(this, t, idx++);
        }
    }

    /**
     * 경로/서브트리/단말 노드 토큰 적재
     * @private
     */
    _addToken(parent, t, autoIdx) {
        if (!t) return;

        // 1. 따옴표로 감싸진 리터럴 문자열 ("b.c")
        if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
            const rawVal = t.slice(1, -1);
            parent.addChild(new Mono(rawVal, rawVal));
            return;
        }

        // 2. 익명 서브트리 (b,c)
        if (t.startsWith('(') && t.endsWith(')')) {
            const sub = new Mono(String(autoIdx));
            sub._isGroupParent = true;
            const subToks = this._tokenize(t.slice(1, -1));
            let subIdx = 0;
            for (let st of subToks) {
                this._addToken(sub, st, subIdx++);
            }
            parent.addChild(sub);
            return;
        }

        // 3. 점(.) 구분을 통한 계층화 노드 (예: b.c, d.e, b.c(x,y))
        const parts = this._splitDotPath(t);
        if (parts.length > 1) {
            let curParent = parent;
            for (let i = 0; i < parts.length; i++) {
                const part = parts[i];
                if (i === parts.length - 1) {
                    this._addToken(curParent, part, 0);
                } else {
                    let existing = curParent.children.get(part);
                    if (!existing) {
                        existing = new Mono(part);
                        curParent.addChild(existing);
                    }
                    curParent = existing;
                }
            }
            return;
        }

        // 4. 이름 있는 서브트리 (예: sub(x,y))
        if (t.includes('(')) {
            parent.addChild(new Mono(t));
            return;
        }

        // 5. 단말 노드 (예: b)
        parent.addChild(new Mono(t, t));
    }

    /**
     * 괄호/따옴표 바깥의 점(.) 분할 헬퍼
     * @private
     */
    _splitDotPath(t) {
        if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
            return [t];
        }
        const parts = [];
        let cur = '';
        let depth = 0;
        let inQuotes = false;

        for (let i = 0; i < t.length; i++) {
            const c = t[i];
            if (c === '"' || c === "'") inQuotes = !inQuotes;
            if (!inQuotes) {
                if (c === '(') depth++;
                else if (c === ')') depth--;
            }

            if (c === '.' && depth === 0 && !inQuotes) {
                if (cur.trim()) parts.push(cur.trim());
                cur = '';
            } else {
                cur += c;
            }
        }
        if (cur.trim()) parts.push(cur.trim());
        return parts;
    }

    /**
     * 중첩 괄호 및 쉼표 구분 토크나이저
     * @private
     */
    _tokenize(s) {
        const toks = [];
        let cur = '';
        let d = 0;
        let inQuotes = false;

        for (let i = 0; i < s.length; i++) {
            const c = s[i];
            if (c === '"' || c === "'") inQuotes = !inQuotes;
            if (!inQuotes) {
                if (c === '(') d++;
                else if (c === ')') d--;
            }

            if (c === ',' && d === 0 && !inQuotes) {
                if (cur.trim()) toks.push(cur.trim());
                cur = '';
            } else {
                cur += c;
            }
        }
        if (cur.trim()) toks.push(cur.trim());
        return toks;
    }

    /**
     * 멀티라인 탭/공백 들여쓰기 기반 블록 표현식 파서
     * @private
     */
    _parseMultiline(str) {
        const rawLines = str.split(/\r?\n/);
        const lines = [];

        for (let line of rawLines) {
            if (!line.trim()) continue;

            const leadingMatch = line.match(/^[ \t]*/)[0];
            let indent = 0;
            for (let ch of leadingMatch) {
                indent += (ch === '\t') ? 4 : 1;
            }

            lines.push({ indent, text: line.trim() });
        }

        if (lines.length === 0) return;

        const stack = [];
        let rootNode = null;

        for (let { indent, text } of lines) {
            while (stack.length > 0 && stack[stack.length - 1].indent >= indent) {
                stack.pop();
            }

            const parsed = this._parseLineToChain(text);
            if (!parsed) continue;

            if (stack.length === 0) {
                if (!rootNode) {
                    rootNode = parsed.root;
                } else {
                    rootNode.addChild(parsed.root);
                }
                stack.push({ indent, root: parsed.root, lastTarget: parsed.lastTarget });
            } else {
                const parentItem = stack[stack.length - 1];
                parentItem.lastTarget.addChild(parsed.root);
                stack.push({ indent, root: parsed.root, lastTarget: parsed.lastTarget });
            }
        }

        if (rootNode) {
            this.key = rootNode.key;
            this.value = rootNode.value;
            this.children = rootNode.children;
            this.childrenOrder = rootNode.childrenOrder;
        }
    }

    /**
     * 단일 라인 텍스트를 노드 체인으로 파싱
     * @private
     */
    _parseLineToChain(text) {
        if (!text) return null;

        const tokens = this._tokenizeLine(text);
        if (tokens.length === 0) return null;

        let root = null;
        let lastTarget = null;

        for (let tok of tokens) {
            const temp = new Mono();
            temp._addToken(temp, tok, 0);

            const parsedNode = temp.childrenOrder[0];
            if (!parsedNode) continue;

            if (!root) {
                root = parsedNode;
                lastTarget = this._findDeepestTarget(parsedNode);
            } else {
                lastTarget.addChild(parsedNode);
                lastTarget = this._findDeepestTarget(parsedNode);
            }
        }

        return { root, lastTarget };
    }

    /**
     * 하위 들여쓰기 노드가 결합될 최하위/단일 대상 노드 검색
     * @private
     */
    _findDeepestTarget(node) {
        let cur = node;
        while (cur) {
            if (cur._isGroupParent) {
                break;
            }
            if (cur.childrenOrder.length === 1) {
                cur = cur.childrenOrder[0];
            } else if (cur.childrenOrder.length > 1) {
                break;
            } else {
                break;
            }
        }
        return cur;
    }

    /**
     * 라인 내 공백/탭 분할 토크나이저 (괄호 및 따옴표 보호)
     * @private
     */
    _tokenizeLine(line) {
        const toks = [];
        let cur = '';
        let depth = 0;
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const c = line[i];
            if (c === '"' || c === "'") inQuotes = !inQuotes;
            if (!inQuotes) {
                if (c === '(') depth++;
                else if (c === ')') depth--;
            }

            if ((c === ' ' || c === '\t') && depth === 0 && !inQuotes) {
                if (cur.trim()) toks.push(cur.trim());
                cur = '';
            } else {
                cur += c;
            }
        }
        if (cur.trim()) toks.push(cur.trim());
        return toks;
    }
}

if (typeof module !== 'undefined') {
    module.exports = Mono;
}