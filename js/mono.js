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
            if (t.startsWith('(') && t.endsWith(')')) {
                // 익명 서브트리 (b,c) -> 오토 인덱스 Key 부여
                const sub = new Mono(String(idx));
                const subToks = this._tokenize(t.slice(1, -1));
                for (let st of subToks) {
                    if (st.includes('(')) {
                        sub.addChild(new Mono(st));
                    } else {
                        sub.addChild(new Mono(st, st));
                    }
                }
                this.addChild(sub);
            } else if (t.includes('(')) {
                // 이름 있는 서브트리 (예: sub(x, y))
                this.addChild(new Mono(t));
            } else {
                // 단말 노드 -> Key와 Value를 동일하게 적재
                this.addChild(new Mono(t, t));
            }
            idx++;
        }
    }

    /**
     * 중첩 괄호 및 쉼표 구분 토크나이저
     * @private
     */
    _tokenize(s) {
        const toks = [];
        let cur = '';
        let d = 0;

        for (let i = 0; i < s.length; i++) {
            const c = s[i];
            if (c === '(') d++;
            else if (c === ')') d--;

            if (c === ',' && d === 0) {
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