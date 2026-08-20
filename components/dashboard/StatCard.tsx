'use client'

import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import { GlassCard } from '@/components/GlassCard'

export interface StatCardProps {
  icon: LucideIcon
  label: string
  value: ReactNode
  /** Linha de apoio abaixo do rótulo (variação, contexto do número). */
  growth?: ReactNode
  color: string
  /** Verde por padrão; use outra cor quando o indicador for de atenção. */
  growthColor?: string
  /** Posição na grade — apenas escalona a animação de entrada. */
  index?: number
}

export function StatCard({
  icon: Icon,
  label,
  value,
  growth,
  color,
  growthColor = '#22C55E',
  index = 0,
}: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
    >
      <GlassCard intensity={1.2} style={{ padding: 18 }}>
        <div className="flex items-start justify-between mb-3">
          <div className="text-2xl font-black text-white">{value}</div>
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: `${color}1A`, border: `1px solid ${color}33` }}
          >
            <Icon size={18} color={color} />
          </div>
        </div>
        <div className="text-xs font-medium text-gray-300 mb-1">{label}</div>
        <div className="text-[10px] font-bold" style={{ color: growthColor }}>
          {growth}
        </div>
      </GlassCard>
    </motion.div>
  )
}
