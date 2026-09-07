import 'server-only';
import { createAdminClient } from '@/lib/auth/server';
import { dailyLimit } from './guard';

export async function getAccountUsage(userId: string) {
    const admin = createAdminClient();
    const kstDate = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
    const start = new Date(`${kstDate}T00:00:00+09:00`);
    const resetAt = start.getTime() + 86400000;
    const [matches, assists, recent] = await Promise.all([
        admin.from('debate_ai_executions').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('operation', 'match').gte('created_at', start.toISOString()),
        admin.from('debate_ai_executions').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('operation', 'assist').gte('created_at', start.toISOString()),
        admin.from('debate_ai_executions').select('id,operation,status,created_at,expires_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(10),
    ]);
    if (matches.error || assists.error || recent.error || matches.count === null || assists.count === null) throw new Error('USAGE_UNAVAILABLE');
    return {
        match: { limit: dailyLimit('match'), remaining: Math.max(0, dailyLimit('match') - matches.count) },
        assist: { limit: dailyLimit('assist'), remaining: Math.max(0, dailyLimit('assist') - assists.count) },
        resetAt,
        recent: (recent.data || []).map(item => ({ id: item.id as string, operation: item.operation as string, status: item.status === 'running' && Date.parse(item.expires_at) <= Date.now() ? 'failed' : item.status as string, createdAt: item.created_at as string })),
    };
}
