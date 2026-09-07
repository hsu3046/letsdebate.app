import { authJSON, getVerifiedUser } from '@/lib/auth/server';
import { getAccountUsage } from '@/lib/ai/access/account';

export async function GET() {
    try {
        const user = await getVerifiedUser();
        if (!user) return authJSON({ error: '로그인 후 확인할 수 있어요.' }, 401);
        return authJSON(await getAccountUsage(user.id));
    } catch { return authJSON({ error: '이용 내역을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.' }, 503); }
}
