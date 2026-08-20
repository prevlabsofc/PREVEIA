'use client'

import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts'
import type { PontoSerie } from '@/lib/metrics/serie-temporal'

interface TrendLineChartProps {
  data: PontoSerie[]
  /** Campo numérico do ponto. Precisa bater com a `chave` de `serieTemporal`. */
  dataKey?: string
  /** Rótulo da série no tooltip. Sem ele o recharts mostra o próprio dataKey. */
  name?: string
  height?: number
  color?: string
}

export function TrendLineChart({
  data,
  dataKey = 'docs',
  name,
  height = 180,
  color = '#D4AF37',
}: TrendLineChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data}>
        <XAxis dataKey="dia" stroke="#555" fontSize={11} tickLine={false} axisLine={false} />
        <YAxis stroke="#555" fontSize={11} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={{
            background: 'rgba(20,18,10,0.95)',
            border: '1px solid rgba(212,175,55,0.3)',
            borderRadius: 12,
            color: '#fff',
          }}
        />
        <Line
          type="monotone"
          dataKey={dataKey}
          name={name}
          stroke={color}
          strokeWidth={3}
          dot={{ fill: color, r: 4 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
