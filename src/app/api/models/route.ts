import { NextResponse } from 'next/server';
import { z } from 'zod';
import { isServiceModelEnabled } from '@/lib/ai/service';

const price = z.union([z.string().trim().min(1), z.number()]).transform(Number).pipe(z.number().finite().nonnegative());
const modelSchema = z.object({
    id: z.string(), name: z.string(), context_length: z.number(),
    architecture: z.object({ input_modalities: z.array(z.string()), output_modalities: z.array(z.string()) }),
    pricing: z.object({ prompt: price, completion: price }),
});

export async function GET() {
    try {
        const response = await fetch('https://openrouter.ai/api/v1/models', {
            next: { revalidate: 3600 }, signal: AbortSignal.timeout(15000),
        });
        if (!response.ok) throw new Error('Catalog unavailable');
        const payload = z.object({ data: z.array(z.unknown()) }).parse(await response.json());
        const models = payload.data.flatMap(item => {
            const parsed = modelSchema.safeParse(item);
            if (!parsed.success) return [];
            const model = parsed.data;
            if (!isServiceModelEnabled(model.id)) return [];
            if (!model.architecture.input_modalities.includes('text') || !model.architecture.output_modalities.includes('text') || model.id === 'openrouter/auto' || model.id.endsWith(':batch')) return [];
            return [{ id: model.id, name: model.name, contextLength: model.context_length, promptPrice: model.pricing.prompt, completionPrice: model.pricing.completion }];
        });
        return NextResponse.json({ models }, { headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600' } });
    } catch {
        return NextResponse.json({ error: 'AI 선수 목록을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.' }, { status: 502 });
    }
}
