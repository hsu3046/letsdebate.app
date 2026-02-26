/**
 * 입력 검증 유틸리티 - Zod 스키마 기반
 */
import { z } from 'zod';

// 공통 텍스트 정리 함수
export function sanitizeText(text: string): string {
    return text
        .trim()
        .replace(/\s+/g, ' ')           // 연속 공백 → 단일 공백
        .replace(/[\u200B-\u200D\uFEFF]/g, ''); // 제로폭 문자 제거
}

// ========== Zod 스키마 정의 ==========

// 토론 주제 (필수, 2-200자)
export const topicSchema = z
    .string()
    .min(2, '주제는 가능한 한 구체적으로 입력해주세요.')
    .max(200, '주제는 200자 이내로 입력해주세요.')
    .transform(sanitizeText);

// 배경 설명 (선택, 0-500자)
export const contextSchema = z
    .string()
    .max(500, '배경 설명은 500자 이내로 입력해주세요.')
    .transform(sanitizeText)
    .optional()
    .default('');

// 채팅 메시지 (필수, 1-1000자)
export const chatMessageSchema = z
    .string()
    .min(1, '메시지를 입력해주세요.')
    .max(1000, '메시지는 1000자 이내로 입력해주세요.')
    .transform(sanitizeText);

// ========== 검증 함수 ==========

export type ValidationResult = {
    success: boolean;
    data?: string;
    error?: string;
};

export function validateTopic(topic: string): ValidationResult {
    const result = topicSchema.safeParse(topic);
    if (result.success) {
        return { success: true, data: result.data };
    }
    return { success: false, error: result.error.issues[0]?.message };
}

export function validateContext(context: string): ValidationResult {
    const result = contextSchema.safeParse(context);
    if (result.success) {
        return { success: true, data: result.data };
    }
    return { success: false, error: result.error.issues[0]?.message };
}

export function validateChatMessage(message: string): ValidationResult {
    const result = chatMessageSchema.safeParse(message);
    if (result.success) {
        return { success: true, data: result.data };
    }
    return { success: false, error: result.error.issues[0]?.message };
}
