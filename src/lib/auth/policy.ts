// Only local paths may be used after OAuth or login.
export function safeReturnTo(value: unknown): string {
    if (typeof value !== 'string' || value.length > 2048 || !value.startsWith('/') || value.startsWith('//') || /[\\\u0000-\u001f]/.test(value)) return '/tournament';
    try {
        const parsed = new URL(value, 'https://local.invalid');
        if (parsed.origin !== 'https://local.invalid' || parsed.pathname.startsWith('/api/')) return '/tournament';
        return parsed.pathname + parsed.search + parsed.hash;
    } catch { return '/tournament'; }
}

const HOST_PATTERN = /^(?:[a-z0-9-]+(?:\.[a-z0-9-]+)*|\[[0-9a-f:.]+\])(?::\d{1,5})?$/i;

// The origin the browser actually used. `request.url` alone is not reliable: `next start`
// reports its bind hostname (e.g. localhost) even when the page was opened via 127.0.0.1,
// and proxies forward the public host in X-Forwarded-Host. Mirrors the Next.js Server
// Actions origin check (X-Forwarded-Host, then Host).
export function requestOrigin(request: Request): string {
    const url = new URL(request.url);
    const first = (value: string | null) => value?.split(',')[0]?.trim() || '';
    const host = first(request.headers.get('x-forwarded-host')) || first(request.headers.get('host'));
    const protocol = first(request.headers.get('x-forwarded-proto')) || url.protocol.slice(0, -1);
    if (!HOST_PATTERN.test(host) || (protocol !== 'http' && protocol !== 'https')) return url.origin;
    return `${protocol}://${host.toLowerCase()}`;
}

export function isSameOrigin(request: Request): boolean {
    const origin = request.headers.get('origin');
    if (!origin) return false;
    return origin === requestOrigin(request) || origin === new URL(request.url).origin;
}
