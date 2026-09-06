// Only local paths may be used after OAuth or login.
export function safeReturnTo(value: unknown): string {
    if (typeof value !== 'string' || value.length > 2048 || !value.startsWith('/') || value.startsWith('//') || /[\\\u0000-\u001f]/.test(value)) return '/tournament';
    try {
        const parsed = new URL(value, 'https://local.invalid');
        if (parsed.origin !== 'https://local.invalid' || parsed.pathname.startsWith('/api/')) return '/tournament';
        return parsed.pathname + parsed.search + parsed.hash;
    } catch { return '/tournament'; }
}

export function isSameOrigin(request: Request): boolean {
    const origin = request.headers.get('origin');
    return !!origin && origin === new URL(request.url).origin;
}
