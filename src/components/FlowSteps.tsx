import { Check } from 'lucide-react';

export default function FlowSteps({ current }: { current: 1 | 2 | 3 }) {
    return <ol className="flow-steps" aria-label="토론 준비 단계">{['주제 정하기', '토론자 고르기', '토론 시작'].map((label, index) => <li key={label} className={index + 1 <= current ? 'active' : ''} aria-current={index + 1 === current ? 'step' : undefined}><span>{index + 1 < current ? <Check size={13} /> : `0${index + 1}`}</span>{label}</li>)}</ol>;
}
