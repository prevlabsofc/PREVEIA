'use client'

import { useEffect, useState } from 'react'
import { Loader2, Save } from 'lucide-react'
import type { DadosAdvogadoPeticao, EstiloPeticao } from '@/lib/peticao-export'
import { normalizarEstiloPeticao } from '@/lib/peticao-export'

const UFS = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG',
  'PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO',
]

type Props = {
  open: boolean
  initial: DadosAdvogadoPeticao
  estiloAtual: EstiloPeticao
  onClose: () => void
  onConfirm: (dados: DadosAdvogadoPeticao, estilo: EstiloPeticao, salvarNoPerfil: boolean) => void
  confirming?: boolean
  titulo?: string
  /** Texto do botão de confirmação (ex.: visualizar vs exportar). */
  confirmLabel?: string
}

export function ModalDadosExportacao({
  open,
  initial,
  estiloAtual,
  onClose,
  onConfirm,
  confirming = false,
  titulo = 'Dados do cabeçalho (somente desta exportação)',
  confirmLabel = 'Confirmar e exportar PDF',
}: Props) {
  const [form, setForm] = useState<DadosAdvogadoPeticao>(initial)
  const [estilo, setEstilo] = useState<EstiloPeticao>(estiloAtual)
  const [salvarPerfil, setSalvarPerfil] = useState(false)

  useEffect(() => {
    if (!open) return
    setForm({ ...initial })
    setEstilo(normalizarEstiloPeticao(estiloAtual))
    setSalvarPerfil(false)
  }, [open, initial, estiloAtual])

  if (!open) return null

  function set<K extends keyof DadosAdvogadoPeticao>(k: K, v: DadosAdvogadoPeticao[K]) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  const inputCls = 'w-full px-3 py-2 rounded-lg text-sm'
  const inputStyle = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.12)',
    color: '#eee',
  } as const

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.65)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl p-5 max-h-[90vh] overflow-y-auto"
        style={{ background: '#12120e', border: '1px solid rgba(212,175,55,0.3)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-bold mb-1" style={{ color: '#D4AF37' }}>
          Revisar dados antes de exportar
        </h3>
        <p className="text-xs mb-4" style={{ color: '#888' }}>
          {titulo}
        </p>

        <div className="space-y-3">
          <div>
            <label className="block text-[11px] mb-1" style={{ color: '#aaa' }}>Nome do advogado</label>
            <input
              className={inputCls}
              style={inputStyle}
              value={form.name || ''}
              onChange={(e) => set('name', e.target.value)} spellCheck={true} />
          </div>
          <div>
            <label className="block text-[11px] mb-1" style={{ color: '#aaa' }}>Nome do escritório</label>
            <input
              className={inputCls}
              style={inputStyle}
              value={form.office_name || ''}
              onChange={(e) => set('office_name', e.target.value)} spellCheck={true} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] mb-1" style={{ color: '#aaa' }}>OAB nº</label>
              <input
                className={inputCls}
                style={inputStyle}
                value={form.oab_number || ''}
                onChange={(e) => set('oab_number', e.target.value)} spellCheck={true} />
            </div>
            <div>
              <label className="block text-[11px] mb-1" style={{ color: '#aaa' }}>UF OAB</label>
              <select
                className={inputCls}
                style={inputStyle}
                value={form.oab_uf || 'SP'}
                onChange={(e) => set('oab_uf', e.target.value)}
              >
                {UFS.map((uf) => (
                  <option key={uf} value={uf} style={{ background: '#111' }}>{uf}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[11px] mb-1" style={{ color: '#aaa' }}>E-mail</label>
            <input
              className={inputCls}
              style={inputStyle}
              value={form.email || ''}
              onChange={(e) => set('email', e.target.value)} spellCheck={true} />
          </div>
          <div>
            <label className="block text-[11px] mb-1" style={{ color: '#aaa' }}>Telefone / WhatsApp</label>
            <input
              className={inputCls}
              style={inputStyle}
              value={form.whatsapp || form.phone || ''}
              onChange={(e) => {
                set('whatsapp', e.target.value)
                set('phone', e.target.value)
              }} spellCheck={true} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] mb-1" style={{ color: '#aaa' }}>Cidade</label>
              <input
                className={inputCls}
                style={inputStyle}
                value={form.cidade || ''}
                onChange={(e) => set('cidade', e.target.value)}
                placeholder="São Luís" spellCheck={true} />
            </div>
            <div>
              <label className="block text-[11px] mb-1" style={{ color: '#aaa' }}>UF (local)</label>
              <select
                className={inputCls}
                style={inputStyle}
                value={form.estado || form.oab_uf || 'SP'}
                onChange={(e) => set('estado', e.target.value)}
              >
                {UFS.map((uf) => (
                  <option key={uf} value={uf} style={{ background: '#111' }}>{uf}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] mb-1.5" style={{ color: '#aaa' }}>Estilo desta exportação</label>
            <div className="grid grid-cols-2 gap-2">
              {([
                { id: 'moderno' as const, label: 'Moderno' },
                { id: 'classico' as const, label: 'Clássico/Sóbrio' },
              ]).map((op) => {
                const ativo = estilo === op.id
                return (
                  <button
                    key={op.id}
                    type="button"
                    onClick={() => setEstilo(op.id)}
                    className="px-3 py-2 rounded-xl text-xs font-bold text-left"
                    style={{
                      background: ativo ? 'rgba(212,175,55,0.12)' : 'rgba(255,255,255,0.02)',
                      border: ativo ? '1px solid rgba(212,175,55,0.4)' : '1px solid rgba(255,255,255,0.08)',
                      color: ativo ? '#D4AF37' : '#ccc',
                    }}
                  >
                    {op.label}
                  </button>
                )
              })}
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: '#aaa' }}>
            <input
              type="checkbox"
              checked={salvarPerfil}
              onChange={(e) => setSalvarPerfil(e.target.checked)}
            />
            Também salvar estes dados em Configurações
          </label>
        </div>

        <div className="flex justify-end gap-2 mt-5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs"
            style={{ border: '1px solid rgba(255,255,255,0.12)', color: '#888' }}
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={confirming}
            onClick={() => onConfirm(form, estilo, salvarPerfil)}
            className="px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5"
            style={{ background: 'linear-gradient(135deg,#D4AF37,#F0D060)', color: '#000' }}
          >
            {confirming ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
