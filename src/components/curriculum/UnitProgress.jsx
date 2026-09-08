export function UnitProgress({
  completed,
  total,
  size = 56,
  strokeWidth = 5,
  color = '#f97316',
  label = null,
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const ratio = total > 0 ? completed / total : 0;
  const strokeDashoffset = circumference * (1 - ratio);
  const fontSize = Math.round(size * 0.22);

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative">
        <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            strokeLinecap="round"
            className="transition-all duration-500"
          />
          <text
            x="50%"
            y="50%"
            dominantBaseline="middle"
            textAnchor="middle"
            fill="currentColor"
            fontSize={fontSize}
            className="font-bold text-gray-800"
          >
            {completed}/{total}
          </text>
        </svg>
      </div>
      {label ? <div className="text-xs text-gray-500">{label}</div> : null}
    </div>
  );
}

export default UnitProgress;
