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
        if (typeof expr === 'string' && expr.includes('(')) {
            this._parseExpression(expr.trim());
        } else {
            this.key = expr;
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
}

if (typeof module !== 'undefined') {
    module.exports = Mono;
}