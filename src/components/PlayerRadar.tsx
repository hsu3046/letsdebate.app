import { playerRatings, RADAR_AXES, type Player } from '@/lib/players';

const point = (axis: number, value: number, radius = 67) => {
  const angle = (axis * 72 - 90) * Math.PI / 180;
  return [130 + Math.cos(angle) * radius * value / 100, 103 + Math.sin(angle) * radius * value / 100];
};
const coordinates = (axis: number, value: number, radius?: number) => point(axis, value, radius).join(',');

export default function PlayerRadar({ player }: { player: Player }) {
  const ratings = playerRatings(player);
  const complete = ratings.every(value => value !== null);
  return (
    <svg className="player-radar" viewBox="0 0 260 211" role="img" aria-label={`${player.name} 능력치 · ${RADAR_AXES.map((label, index) => `${label} ${ratings[index] ?? '미공개'}`).join(' · ')} · 왈가왈부 자체 평가`}>
      {[25, 50, 75, 100].map(value => <polygon key={value} points={RADAR_AXES.map((_, index) => coordinates(index, value)).join(' ')} className="radar-grid" />)}
      {RADAR_AXES.map((label, index) => <line key={label} x1="130" y1="103" x2={point(index, 100)[0]} y2={point(index, 100)[1]} className={`radar-spoke ${ratings[index] === null ? 'missing' : ''}`} />)}
      {complete && <polygon points={ratings.map((value, index) => coordinates(index, value!)).join(' ')} className="radar-fill" />}
      {/* Missing data leaves a real gap rather than plotting an invented zero or midpoint. */}
      {ratings.map((value, index) => {
        const next = (index + 1) % 5;
        const end = ratings[next];
        return value !== null && end !== null ? <line key={index} x1={point(index, value)[0]} y1={point(index, value)[1]} x2={point(next, end)[0]} y2={point(next, end)[1]} className="radar-value" /> : null;
      })}
      {ratings.map((value, index) => value === null ? null : <circle key={index} cx={point(index, value)[0]} cy={point(index, value)[1]} r="3.2" className="radar-dot" />)}
      {RADAR_AXES.map((label, index) => {
        const [x, y] = point(index, 100, 98);
        return <text key={label} x={x} y={y} textAnchor="middle" className="radar-label">{label}<tspan x={x} dy="15" className="radar-score">{ratings[index] ?? '미공개'}</tspan></text>;
      })}
    </svg>
  );
}
