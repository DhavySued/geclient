export default function HealthBar({ score }) {
  const color =
    score >= 80 ? 'bg-emerald-500' :
    score >= 55 ? 'bg-yellow-400' :
    score >= 30 ? 'bg-orange-500' :
    'bg-red-600'

  return (
    <div className="mt-2">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs text-gray-500">Health Score</span>
        <span className={`text-xs font-bold ${
          score >= 80 ? 'text-emerald-400' :
          score >= 55 ? 'text-yellow-300' :
          score >= 30 ? 'text-orange-400' :
          'text-red-400'
        }`}>{score}</span>
      </div>
      <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all duration-300`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  )
}
