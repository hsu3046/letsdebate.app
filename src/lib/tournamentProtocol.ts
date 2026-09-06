import { z } from 'zod';

export const verdictSchema = z.object({
    winner: z.enum(['a', 'b']),
    scores: z.object({ a: z.number().min(0).max(100), b: z.number().min(0).max(100) }),
    reason: z.string().min(1).max(3000),
    highlights: z.object({ a: z.string().min(1).max(1000), b: z.string().min(1).max(1000) }),
}).refine(result => result.scores[result.winner] >= result.scores[result.winner === 'a' ? 'b' : 'a'], '승자는 점수와 일치해야 합니다.');

export const matchEventSchema = z.discriminatedUnion('type', [
    z.object({ type: z.literal('turn'), id: z.string(), side: z.enum(['a', 'b']), round: z.number() }),
    z.object({ type: z.literal('delta'), text: z.string() }),
    z.object({ type: z.literal('message'), id: z.string(), side: z.enum(['a', 'b']), round: z.number(), content: z.string() }),
    z.object({ type: z.literal('judging') }),
    z.object({ type: z.literal('verdict'), verdict: verdictSchema }),
    z.object({ type: z.literal('error'), message: z.string() }),
    z.object({ type: z.literal('done') }),
]);
export type MatchEvent = z.infer<typeof matchEventSchema>;

export function parseMatchEvent(frame: string): MatchEvent | null {
    const data = frame.split('\n').filter(line => line.startsWith('data:')).map(line => line.slice(5).trimStart()).join('\n');
    if (!data) return null;
    return matchEventSchema.parse(JSON.parse(data));
}
