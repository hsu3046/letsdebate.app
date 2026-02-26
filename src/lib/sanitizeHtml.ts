/**
 * DOMPurify 래퍼 - XSS 방지를 위한 HTML sanitization
 */
import DOMPurify from 'isomorphic-dompurify';

/**
 * HTML 문자열에서 위험한 요소 제거
 * @param html 정화할 HTML 문자열
 * @returns 안전한 HTML 문자열
 */
export function sanitizeHtml(html: string): string {
    return DOMPurify.sanitize(html, {
        // 허용할 태그
        ALLOWED_TAGS: [
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            'p', 'br', 'hr',
            'ul', 'ol', 'li',
            'strong', 'b', 'em', 'i', 'u', 's',
            'a', 'span', 'div',
            'table', 'thead', 'tbody', 'tr', 'th', 'td',
            'blockquote', 'pre', 'code',
            'img',
        ],
        // 허용할 속성
        ALLOWED_ATTR: [
            'href', 'target', 'rel',
            'class', 'id', 'style',
            'src', 'alt', 'width', 'height',
        ],
        // href에서 javascript: 프로토콜 차단
        FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
        // data: URI 차단
        ALLOW_DATA_ATTR: false,
    });
}

/**
 * 텍스트만 추출 (모든 HTML 태그 제거)
 * @param html HTML 문자열
 * @returns 순수 텍스트
 */
export function stripHtml(html: string): string {
    return DOMPurify.sanitize(html, { ALLOWED_TAGS: [] });
}
