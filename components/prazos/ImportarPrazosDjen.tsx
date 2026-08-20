'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { AlertCircle, Info, Loader2, RefreshCw, Search, UserSearch } from 'lucide-react'

const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

const UFS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO']

type Modo = 'oab' | 'cpf'

/** Erros que valem "tentar de novo" (falha de comunicação) vs. limitação permanente da busca. */
const ERROS_RETENTAVEIS = ['indisponivel', 'limite_excedido']

type EstadoResultado = {
  encontradas: number
  novas: number
  jaImportadas: number
  parcial: boolean
} | null

interface Props {
  isLight?: boolean
  /** Chamado com os prazos recém-importados, para o pai atualizar a lista sem recarregar. */
  onImportado: (novos: any[]) => void
}

/**
 * Busca automática de prazos/andamentos por OAB, via API pública do DJEN/CNJ
 * (Comunica PJe) — cobre todos os tribunais do país, sem chave de API. Busca
 * por CPF não é suportada por nenhuma API pública de tribunal (ver
 * `lib/djen.ts`); ao tentar, o próprio backend explica a limitação em vez de
 * simular um resultado.
 */
export function ImportarPrazosDjen({ isLight = false, onImportado }: Props) {
  const [modo, setModo] = useState<Modo>('oab')
  const [oabNumero, setOabNumero] = useState('')
  const [oabUf, setOabUf] = useState('SP')
  const [tribunal, setTribunal] = useState('')
  const [cpf, setCpf] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<{ mensagem: string; podeRetentar: boolean; permanente?: boolean } | null>(null)
  const [resultado, setResultado] = useState<EstadoResultado>(null)

  async function buscar() {
    setErro(null)
    setResultado(null)

    if (modo === 'oab' && !oabNumero.trim()) {
      setErro({ mensagem: 'Informe o número da OAB.', podeRetentar: false })
      return
    }
    if (modo === 'cpf' && !cpf.trim()) {
      setErro({ mensagem: 'Informe o CPF.', podeRetentar: false })
      return
    }

    setCarregando(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        setErro({ mensagem: 'Faça login novamente para buscar.', podeRetentar: false })
        return
      }

      const res = await fetch('/api/importar-prazos-djen', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(
          modo === 'oab'
            ? { modo: 'oab', oabNumero: oabNumero.trim(), oabUf, tribunal: tribunal.trim() || undefined }
            : { modo: 'cpf', cpf: cpf.trim() },
        ),
      })

      let data: any = null
      try {
        data = await res.json()
      } catch {
        setErro({ mensagem: 'Não foi possível buscar agora. Tente novamente.', podeRetentar: true })
        return
      }

      if (!data?.ok) {
        const tipo: string | undefined = data?.erro
        setErro({
          mensagem: data?.mensagem || 'Não foi possível buscar agora. Tente novamente.',
          podeRetentar: tipo ? ERROS_RETENTAVEIS.includes(tipo) : true,
          permanente: tipo === 'cpf_nao_suportado' || tipo === 'geo_bloqueado',
        })
        return
      }

      setResultado({
        encontradas: data.encontradas ?? 0,
        novas: data.novas ?? 0,
        jaImportadas: data.jaImportadas ?? 0,
        parcial: Boolean(data.parcial),
      })
      if (Array.isArray(data.prazos) && data.prazos.length > 0) onImportado(data.prazos)
    } catch {
      setErro({ mensagem: 'Erro de conexão ao buscar. Tente novamente.', podeRetentar: true })
    } finally {
      setCarregando(false)
    }
  }

  const corTexto = isLight ? '#1E1E1E' : '#fff'
  const inputCls = 'input-glass w-full px-3 text-sm'

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <UserSearch size={16} color="#3B82F6" />
        <p className="text-xs font-bold" style={{ color: '#3B82F6' }}>Buscar prazos automaticamente (DJEN/CNJ)</p>
      </div>
      <p className="text-[10px] mb-3" style={{ color: '#888' }}>
        Traz intimações e citações de todos os tribunais para um advogado, direto para cá. É ferramenta de apoio —
        não substitui a contagem oficial do prazo nem a consulta ao diário do tribunal.
      </p>

      <div className="flex items-center gap-1.5 mb-3">
        {([
          { id: 'oab' as Modo, label: 'Por OAB' },
          { id: 'cpf' as Modo, label: 'Por CPF' },
        ]).map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => { setModo(id); setErro(null); setResultado(null) }}
            className="px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
            style={{
              background: modo === id ? 'rgba(59,130,246,0.15)' : 'transparent',
              color: modo === id ? '#3B82F6' : '#888',
              border: modo === id ? '1px solid rgba(59,130,246,0.35)' : '1px solid rgba(255,255,255,0.08)',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {modo === 'oab' ? (
        <div className="grid grid-cols-3 gap-2 mb-2">
          <div className="col-span-1">
            <label className="block text-[10px] text-gray-400 mb-1">Número da OAB</label>
            <input
              value={oabNumero}
              onChange={(e) => setOabNumero(e.target.value.replace(/\D/g, ''))}
              placeholder="123456"
              className={inputCls}
              style={{ height: 40 }} spellCheck={true} />
          </div>
          <div className="col-span-1">
            <label className="block text-[10px] text-gray-400 mb-1">UF</label>
            <select value={oabUf} onChange={(e) => setOabUf(e.target.value)} className={inputCls} style={{ height: 40 }}>
              {UFS.map((uf) => <option key={uf} value={uf} style={{ background: '#111' }}>{uf}</option>)}
            </select>
          </div>
          <div className="col-span-1">
            <label className="block text-[10px] text-gray-400 mb-1">Tribunal (opcional)</label>
            <input
              value={tribunal}
              onChange={(e) => setTribunal(e.target.value.toUpperCase())}
              placeholder="Ex: TJSP"
              className={inputCls}
              style={{ height: 40 }} spellCheck={true} />
          </div>
        </div>
      ) : (
        <div className="mb-2">
          <label className="block text-[10px] text-gray-400 mb-1">CPF</label>
          <input
            value={cpf}
            onChange={(e) => setCpf(e.target.value.replace(/\D/g, ''))}
            placeholder="000.000.000-00"
            className={inputCls}
            style={{ height: 40 }} spellCheck={true} />
        </div>
      )}

      <button
        onClick={buscar}
        disabled={carregando}
        className="btn-gold w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold mt-1"
      >
        {carregando ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
        {carregando ? 'Buscando...' : 'Buscar e importar prazos'}
      </button>

      {erro && (
        <div
          className="flex items-start gap-2 mt-3 p-2.5 rounded-lg"
          style={{
            background: erro.permanente ? 'rgba(245,158,11,0.08)' : 'rgba(239,68,68,0.08)',
            border: `1px solid ${erro.permanente ? 'rgba(245,158,11,0.25)' : 'rgba(239,68,68,0.25)'}`,
          }}
        >
          {erro.permanente ? (
            <Info size={14} color="#F59E0B" className="flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle size={14} color="#EF4444" className="flex-shrink-0 mt-0.5" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs" style={{ color: erro.permanente ? '#F59E0B' : '#EF4444' }}>{erro.mensagem}</p>
            {erro.podeRetentar && (
              <button
                type="button"
                onClick={buscar}
                disabled={carregando}
                className="flex items-center gap-1 mt-1.5 text-[11px] font-bold"
                style={{ color: '#EF4444' }}
              >
                <RefreshCw size={11} className={carregando ? 'animate-spin' : ''} /> Tentar novamente
              </button>
            )}
          </div>
        </div>
      )}

      {resultado && !erro && (
        <div className="mt-3 p-2.5 rounded-lg" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)' }}>
          {resultado.encontradas === 0 ? (
            <p className="text-xs" style={{ color: isLight ? '#3A3A3A' : '#ccc' }}>
              Nenhuma comunicação encontrada para essa OAB nos últimos 30 dias.
            </p>
          ) : (
            <p className="text-xs" style={{ color: '#22C55E' }}>
              {resultado.encontradas} comunicaç{resultado.encontradas === 1 ? 'ão encontrada' : 'ões encontradas'} —{' '}
              {resultado.novas} novo{resultado.novas === 1 ? '' : 's'} prazo{resultado.novas === 1 ? '' : 's'} importado{resultado.novas === 1 ? '' : 's'}
              {resultado.jaImportadas > 0 ? ` (${resultado.jaImportadas} já estava${resultado.jaImportadas === 1 ? '' : 'm'} na lista)` : ''}.
            </p>
          )}
          {resultado.parcial && (
            <p className="text-[10px] mt-1" style={{ color: '#F59E0B' }}>
              ⚠ Algumas variantes da consulta não responderam — o resultado pode estar incompleto. Busque novamente em instantes.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
