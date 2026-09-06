import { createAuthClient, authJSON } from '@/lib/auth/server';
import { isSameOrigin } from '@/lib/auth/policy';

export async function POST(request: Request) {
    if (!isSameOrigin(request)) return authJSON({ error: '요청한 페이지를 확인해 주세요.' }, 403);
    try {
        const client = await createAuthClient();
        const { error } = await client.auth.signOut({ scope: 'local' });
        if (error) throw new Error('SIGN_OUT_FAILED');
        return authJSON({ success: true });
    } catch { return authJSON({ error: '로그아웃하지 못했어요. 다시 시도해 주세요.' }, 503); }
}
