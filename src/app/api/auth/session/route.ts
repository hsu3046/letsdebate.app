import { getVerifiedUser, isAuthConfigured, authJSON, AUTH_UNAVAILABLE } from '@/lib/auth/server';
import { isAIServiceConfigured } from '@/lib/ai/service';

export async function GET() {
    // `ai` only says whether matches can run right now; it reveals no configuration detail.
    const ai = isAIServiceConfigured() && !!process.env.SUPABASE_SECRET_KEY?.trim();
    if (!isAuthConfigured()) return authJSON({ configured: false, ai: false, user: null });
    try {
        const user = await getVerifiedUser();
        return authJSON({ configured: true, ai, user: user ? { id: user.id, name: String(user.user_metadata.full_name || user.user_metadata.name || '토론 팬').slice(0,80) } : null });
    } catch { return authJSON({ error: AUTH_UNAVAILABLE }, 503); }
}
