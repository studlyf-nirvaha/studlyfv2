/**
 * Plain text for cards / previews from rich-text HTML or escaped HTML strings.
 */
export function plainTextFromRichContent(raw: unknown, maxLen?: number): string {
    if (raw == null) return '';

    let s: string;
    if (typeof raw === 'object' && raw !== null) {
        const o = raw as Record<string, unknown>;
        const inner = o.html ?? o.content ?? o.text ?? o.description;
        if (typeof inner === 'string') {
            s = inner;
        } else {
            s = JSON.stringify(raw);
        }
    } else {
        s = typeof raw === 'string' ? raw : String(raw);
    }

    if (!s.trim()) return '';

    if (typeof document !== 'undefined') {
        for (let pass = 0; pass < 4; pass++) {
            try {
                const ta = document.createElement('textarea');
                ta.innerHTML = s;
                const decoded = ta.value;
                if (decoded === s && !s.includes('&lt;') && !s.includes('&#')) {
                    break;
                }
                s = decoded;
            } catch {
                break;
            }
        }

        try {
            const doc = new DOMParser().parseFromString(s, 'text/html');
            const text = doc.body?.textContent?.replace(/\s+/g, ' ').trim();
            if (text) {
                const out = maxLen != null ? text.slice(0, maxLen) : text;
                return stripResidualTags(out);
            }
        } catch {
            /* fall through */
        }
    }

    const stripped = stripResidualTags(
        s.replace(/<[\s\S]*?>/g, ' ').replace(/\s+/g, ' ').trim()
    );
    return maxLen != null ? stripped.slice(0, maxLen) : stripped;
}

function stripResidualTags(input: string): string {
    let out = input;
    for (let i = 0; i < 5 && /<[a-z!/]/i.test(out); i++) {
        out = out.replace(/<[\s\S]*?>/gi, ' ').replace(/\s+/g, ' ').trim();
    }
    return out;
}

/** Raw HTML string from API (string or { html, content, ... }). */
export function richHtmlFromOpportunityField(raw: unknown): string {
    if (raw == null) return '';
    if (typeof raw === 'object' && raw !== null) {
        const o = raw as Record<string, unknown>;
        const inner = o.html ?? o.content ?? o.text ?? o.description;
        if (typeof inner === 'string') return decodeHtmlEntities(inner);
    }
    return typeof raw === 'string' ? decodeHtmlEntities(raw) : '';
}

function decodeHtmlEntities(text: string): string {
    // Decode HTML entities like &lt;, &gt;, &amp;, etc.
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    return textarea.value;
}

/**
 * Strip dangerous tags/attributes for institution-authored HTML shown on learner pages.
 * Not a full XSS auditor; pair with CSP in production where possible.
 */
export function sanitizePresentationHtml(html: string): string {
    if (!html || !html.trim()) return '';
    const allowedTags = new Set(['p', 'br', 'strong', 'b', 'em', 'i', 'u', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'code', 'pre', 'a']);
    const allowedHref = /^(https?:|mailto:|tel:)/i;

    if (typeof document === 'undefined') {
        return html
            .replace(/<script[\s\S]*?<\/script>/gi, '')
            .replace(/<style[\s\S]*?<\/style>/gi, '')
            .replace(/\son\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
            .replace(/\s(?:src|srcdoc|style)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
            .replace(/href\s*=\s*(?:"|')?\s*(?:javascript:|data:)[^"'>\s]*/gi, 'href="#"');
    }

    const template = document.createElement('template');
    template.innerHTML = html;
    const walk = (node: Node) => {
        [...node.childNodes].forEach((child) => {
            if (child.nodeType === Node.ELEMENT_NODE) {
                const el = child as HTMLElement;
                const tag = el.tagName.toLowerCase();
                if (!allowedTags.has(tag)) {
                    el.replaceWith(document.createTextNode(el.textContent || ''));
                    return;
                }
                [...el.attributes].forEach((attr) => {
                    const name = attr.name.toLowerCase();
                    const value = attr.value || '';
                    if (name.startsWith('on') || name === 'style' || name === 'src' || name === 'srcdoc') {
                        el.removeAttribute(attr.name);
                        return;
                    }
                    if (tag === 'a' && name === 'href') {
                        if (!allowedHref.test(value)) {
                            el.setAttribute('href', '#');
                        }
                        el.setAttribute('rel', 'noopener noreferrer');
                        return;
                    }
                    if (!(tag === 'a' && (name === 'href' || name === 'rel' || name === 'target'))) {
                        el.removeAttribute(attr.name);
                    }
                });
            }
            walk(child);
        });
    };
    walk(template.content);
    return template.innerHTML;
}

/** Location label without a leading comma when city/venue is missing */
export function formatOpportunityLocation(loc: string | undefined | null): string {
    if (loc == null) return '';
    return String(loc).replace(/^\s*,\s*/, '').trim();
}

/** Resolve the effective deadline from an opportunity object with fallback chain */
export function getOpportunityDeadline(opp: any): string {
    return opp?.deadline || opp?.registrationDeadline || opp?.registration_deadline || '';
}
