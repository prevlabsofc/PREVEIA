'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Sparkles, Check, X } from 'lucide-react'
import { getModelosByAgente, type ModeloPeticao } from '@/lib/modelos-peticao'

interface Props {
  agentType: string
  onSelect: (descricao: string) => void
  isLight?: boolean
}

export function SeletorModelo({ agentType, onSelect, isLight = false }: Props) {
  const modelos = getModelosByAgente(agentType)
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)

  if (modelos.length === 0) return null

  function handleSelect(m: ModeloPeticao) {
    setSelected(m.id)
    onSelect(m.descricao)
    setOpen(false)
  }

  function handleClear() {
    setSelected(null)
    onSelect('')
  }

  return (
    <div className="mb-2">
      <button type="button" onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all"
        style={{
          background: selected
            ? (isLight ? 'rgba(34,197,94,0.08)' : 'rgba(34,197,94,0.06)')
            : (isLight ? 'rgba(212,175,55,0.08)' : 'rgba(212,175,55,0.06)'),
          border: `1px solid ${selected ? 'rgba(34,197,94,0.25)' : 'rgba(212,175,55,0.25)'}`,
        }}>
        <div className="flex items-center gap-2">
          <Sparkles size={14} color={selected ? '#22C55E' : '#D4AF37'} />
          <span className="text-sm font-medium"
            style={{ color: selected ? '#22C55E' : '#D4AF37' }}>
            {selected
              ? '✓ Modelo selecionado — clique para trocar'
              : `✨ Usar modelo pronto (${modelos.length} disponíveis)`}
          </span>
        </div>
        <ChevronDown size={14} color="#D4AF37"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: 'auto', marginTop: 6 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            className={`overflow-hidden rounded-xl ${isLight ? 'bg-white' : 'bg-[#080600]'}`}
            style={{ border: isLight ? '1px solid #EDEDED' : '1px solid #2A2A2A' }}>
            <p className={`text-[10px] px-4 py-2 border-b ${isLight ? 'text-gray-400 border-gray-100' : 'text-gray-600'}`}
              style={{ borderColor: isLight ? '#EDEDED' : '#1A1A1A' }}>
              Clique para preencher o contexto automaticamente
            </p>
            {modelos.map((m, i) => (
              <motion.button key={m.id} type="button"
                onClick={() => handleSelect(m)}
                whileHover={{ backgroundColor: isLight ? 'rgba(212,175,55,0.08)' : 'rgba(212,175,55,0.04)' }}
                className="w-full text-left px-4 py-3 transition-all"
                style={{
                  borderBottom: i < modelos.length - 1
                    ? (isLight ? '1px solid #F3F4F6' : '1px solid #111')
                    : 'none',
                  background: selected === m.id
                    ? (isLight ? 'rgba(212,175,55,0.1)' : 'rgba(212,175,55,0.07)')
                    : 'transparent',
                }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium" style={{ color: '#D4AF37' }}>{m.label}</span>
                      {selected === m.id && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full"
                          style={{ background: 'rgba(34,197,94,0.15)', color: '#22C55E' }}>
                          Selecionado
                        </span>
                      )}
                    </div>
                    <p className={`text-xs leading-relaxed ${isLight ? 'text-gray-500' : 'text-gray-500'}`}>
                      {m.descricao.slice(0, 100)}...
                    </p>
                  </div>
                  {selected === m.id && <Check size={14} color="#22C55E" className="flex-shrink-0 mt-1" />}
                </div>
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selected && !open && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="mt-1.5 flex items-center justify-between px-1">
            <p className={`text-[10px] ${isLight ? 'text-gray-400' : 'text-gray-600'}`}>Modelo aplicado ao contexto</p>
            <button type="button" onClick={handleClear}
              className={`flex items-center gap-1 text-[10px] transition-colors ${isLight ? 'text-gray-500 hover:text-red-500' : 'text-gray-500 hover:text-red-400'}`}>
              <X size={11} /> Limpar
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
