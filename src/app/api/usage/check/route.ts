import { authJSON, getVerifiedUser } from '@/lib/auth/server';
import { getAccountUsage } from '@/lib/ai/access/account';
import { isSameOrigin } from '@/lib/auth/policy';

export async function POST(request: Request) {
    if (!isSameOrigin(request)) return authJSON({ error: '요청한 페이지를 확인해 주세요.' }, 403);
    try {
        const user = await getVerifiedUser();
        if (!user) return authJSON({ error: '로그인 후 이용할 수 있어요.', success: false }, 401);
        const usage = await getAccountUsage(user.id);
        return authJSON({ ...usage.assist, resetAt: usage.resetAt, success: true });
    } catch { return authJSON({ error: '이용 한도를 확인하지 못했어요.', success: false }, 503); }
}
