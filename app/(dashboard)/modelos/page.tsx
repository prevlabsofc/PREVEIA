'use client'

import { useEffect, useMemo, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { motion } from 'framer-motion'
import Link from 'next/link'
import {
  BookTemplate,
  Copy,
  Edit2,
  Eye,
  FileText,
  Loader2,
  Plus,
  Shield,
  Trash2,
  Briefcase,
  Scale,
} from 'lucide-react'
import { GlassCard } from '@/components/GlassCard'
import {
  listarModelosEscritorio,
  listarModelosUnificados,
  duplicarModelo,
  excluirModeloEscritorio,
  TIPOS_MODELO,
  rotuloTipoModelo,
  type ModeloListagem,
  type TipoModeloDocumento,
} from '@/lib/modelos'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const ICONE_TIPO: Record<TipoModeloDocumento, typeof FileText> = {
  peticao: Scale,
  contrato_servicos: Briefcase,
  contrato_honorarios: FileText,
}

export default function ModelosPage() {
  const [isLight, setIsLight] = useState(false)
  const [lawyerId, setLawyerId] = useState('')
  const [itens, setItens] = useState<ModeloListagem[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState<TipoModeloDocumento | 'todos'>('todos')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [toast, setToast] = useState('')

  useEffect(() => {
    const check = () => setIsLight(document.documentElement.classList.contains('light'))
    check()
    const observer = new MutationObserver(check)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  async function carregar(uid?: string) {
    const id = uid || lawyerId
    if (!id) return
    setLoading(true)
    const { data } = await listarModelosEscritorio(supabase, id)
    setItens(listarModelosUnificados(data))
    setLoading(false)
  }

  useEffect(() => {
    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return
      setLawyerId(user.id)
      await carregar(user.id)
    }
    init()
  }, [])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(''), 2800)
    return () => clearTimeout(t)
  }, [toast])

  const filtrados = useMemo(
    () => (filtro === 'todos' ? itens : itens.filter((i) => i.tipo === filtro)),
    [itens, filtro]
  )

  async function handleDuplicar(m: ModeloListagem) {
    if (!lawyerId) return
    setBusyId(m.id)
    const { data, error } = await duplicarModelo(supabase, lawyerId, m)
    setBusyId(null)
    if (error || !data) {
      setToast(error || 'Não foi possível duplicar.')
      return
    }
    setToast('Cópia criada no escritório.')
    await carregar()
  }

  async function handleExcluir(m: ModeloListagem) {
    if (m.protegido) return
    if (!confirm(`Excluir o modelo "${m.nome}"? Esta ação não apaga o padrão do sistema.`)) return
    setBusyId(m.id)
    const { error } = await excluirModeloEscritorio(supabase, lawyerId, m.id)
    setBusyId(null)
    if (error) {
      setToast(error)
      return
    }
    setToast('Modelo excluído.')
    setItens((prev) => prev.filter((x) => x.id !== m.id))
  }

  const corTexto = isLight ? '#1E1E1E' : '#fff'
  const corSec = isLight ? '#5E5E5E' : '#9ca3af'

  return (
    <div className="p-8 max-w-6xl mx-auto" style={{ background: isLight ? '#F8F8F8' : 'transparent' }}>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-black mb-1 flex items-center gap-2">
              <BookTemplate size={28} color="#D4AF37" />
              <span style={{ color: corTexto }}>Modelos</span>
              <span className="text-gradient-gold">de documento</span>
            </h1>
            <p className="text-sm" style={{ color: corSec }}>
              Padrões do sistema protegidos + cópias editáveis do escritório com variáveis {'{{dinamicas}}'}.
            </p>
          </div>
          <Link
            href="/modelos/novo"
            className="btn-gold inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold"
          >
            <Plus size={16} /> Novo modelo
          </Link>
        </div>

        <div className="flex flex-wrap gap-2 mb-5">
          <button
            type="button"
            onClick={() => setFiltro('todos')}
            className="text-xs px-3 py-1.5 rounded-full font-medium"
            style={{
              background: filtro === 'todos' ? 'rgba(212,175,55,0.14)' : isLight ? '#F3F3F3' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${filtro === 'todos' ? 'rgba(212,175,55,0.4)' : isLight ? '#EDEDED' : 'rgba(255,255,255,0.07)'}`,
              color: filtro === 'todos' ? '#D4AF37' : corSec,
            }}
          >
            Todos ({itens.length})
          </button>
          {TIPOS_MODELO.map((t) => {
            const n = itens.filter((i) => i.tipo === t.id).length
            const ativo = filtro === t.id
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setFiltro(t.id)}
                className="text-xs px-3 py-1.5 rounded-full font-medium"
                style={{
                  background: ativo ? 'rgba(212,175,55,0.14)' : isLight ? '#F3F3F3' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${ativo ? 'rgba(212,175,55,0.4)' : isLight ? '#EDEDED' : 'rgba(255,255,255,0.07)'}`,
                  color: ativo ? '#D4AF37' : corSec,
                }}
              >
                {t.rotulo} ({n})
              </button>
            )
          })}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin" size={24} color="#D4AF37" />
          </div>
        ) : (
          <div className="grid gap-3">
            {filtrados.map((m) => {
              const Icon = ICONE_TIPO[m.tipo] || FileText
              const busy = busyId === m.id
              return (
                <GlassCard key={m.id} intensity={0.35} style={{ padding: 20 }}>
                  <div className="flex items-start gap-4">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: 'rgba(212,175,55,0.12)' }}
                    >
                      <Icon size={18} color="#D4AF37" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-bold truncate" style={{ color: corTexto }}>
                          {m.nome}
                        </h3>
                        {m.protegido ? (
                          <span
                            className="text-[10px] px-2 py-0.5 rounded-full font-bold inline-flex items-center gap-1"
                            style={{ background: 'rgba(212,175,55,0.12)', color: '#D4AF37' }}
                          >
                            <Shield size={10} /> Padrão
                          </span>
                        ) : (
                          <span
                            className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                            style={{ background: 'rgba(34,197,94,0.12)', color: '#22C55E' }}
                          >
                            Personalizado
                          </span>
                        )}
                        <span
                          className="text-[10px] px-2 py-0.5 rounded-full"
                          style={{
                            background: isLight ? '#F3F3F3' : 'rgba(255,255,255,0.06)',
                            color: corSec,
                          }}
                        >
                          {rotuloTipoModelo(m.tipo)}
                        </span>
                      </div>
                      <p className="text-xs line-clamp-2" style={{ color: corSec }}>
                        {m.descricao || m.conteudo.slice(0, 160).replace(/\s+/g, ' ') + '…'}
                      </p>
                      <p className="text-[10px] mt-1" style={{ color: '#777' }}>
                        {m.atualizadoEm
                          ? `Última edição: ${new Date(m.atualizadoEm).toLocaleString('pt-BR')}`
                          : 'Modelo padrão do sistema'}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <Link
                        href={`/modelos/${encodeURIComponent(m.id)}?ver=1`}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5"
                        style={{ border: '1px solid rgba(255,255,255,0.1)', color: corSec }}
                        title="Visualizar"
                      >
                        <Eye size={12} /> Visualizar
                      </Link>
                      <Link
                        href={`/modelos/${encodeURIComponent(m.id)}`}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5"
                        style={{ border: '1px solid rgba(212,175,55,0.35)', color: '#D4AF37' }}
                        title={m.protegido ? 'Editar cria cópia automática' : 'Editar'}
                      >
                        <Edit2 size={12} /> Editar
                      </Link>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => handleDuplicar(m)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 disabled:opacity-50"
                        style={{ border: '1px solid rgba(255,255,255,0.1)', color: corSec }}
                        title="Duplicar"
                      >
                        {busy ? <Loader2 size={12} className="animate-spin" /> : <Copy size={12} />}
                        Duplicar
                      </button>
                      {!m.protegido && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleExcluir(m)}
                          className="p-1.5 rounded-lg disabled:opacity-50"
                          style={{ color: '#EF4444' }}
                          title="Excluir"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </GlassCard>
              )
            })}
            {filtrados.length === 0 && (
              <div className="text-center py-16" style={{ color: corSec }}>
                Nenhum modelo neste filtro.
              </div>
            )}
          </div>
        )}
      </motion.div>

      {toast && (
        <div
          className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl text-xs font-medium"
          style={{
            background: 'rgba(40,30,10,0.96)',
            border: '1px solid rgba(212,175,55,0.45)',
            color: '#F0D060',
          }}
        >
          {toast}
        </div>
      )}
    </div>
  )
}
