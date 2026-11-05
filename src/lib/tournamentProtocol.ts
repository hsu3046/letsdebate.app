import { z } from 'zod';

export const verdictSchema = z.object({
    winner: z.enum(['a', 'b']),
    scores: z.object({ a: z.number().min(0).max(100), b: z.number().min(0).max(100) }),
    reason: z.string().min(1).max(3000),
    highlights: z.object({ a: z.string().min(1).max(1000), b: z.string().min(1).max(1000) }),
}).refine(result => result.scores[result.winner] >= result.scores[result.winner === 'a' ? 'b' : 'a'], '승자는 점수와 일치해야 합니다.');

// Judges are other LLMs: they often wrap JSON in prose or a code fence, send numbers as
// strings or use upper-case sides. Normalise those, but never invent a missing field.
const looseScore = z.union([z.number(), z.string().trim().regex(/^\d{1,3}(?:\.\d+)?$/).transform(Number)]);
const looseVerdictSchema = z.object({
    winner: z.string().trim().toLowerCase().pipe(z.enum(['a', 'b'])),
    scores: z.object({ a: looseScore, b: looseScore }),
    reason: z.string().trim(),
    highlights: z.object({ a: z.string().trim(), b: z.string().trim() }),
});

export function parseVerdict(text: string) {
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
    const source = fenced ?? text;
    const start = source.indexOf('{'), end = source.lastIndexOf('}');
    if (start < 0 || end <= start) throw new SyntaxError('NO_JSON_OBJECT');
    const loose = looseVerdictSchema.parse(JSON.parse(source.slice(start, end + 1)));
    return verdictSchema.parse({
        ...loose,
        scores: { a: Math.round(loose.scores.a), b: Math.round(loose.scores.b) },
    });
}

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
