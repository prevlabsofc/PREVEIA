'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader2, Search, Gavel, AlertCircle, RefreshCw, ShieldQuestion } from 'lucide-react'
import type { ProcessoDatajud, TipoErroConsulta } from '@/lib/datajud'

function mascaraProcesso(valor: string) {
  const n = valor.replace(/\D/g, '').slice(0, 20)
  return n
    .replace(/^(\d{7})(\d)/, '$1-$2')
    .replace(/^(\d{7}-\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{7}-\d{2}\.\d{4})(\d)/, '$1.$2')
    .replace(/^(\d{7}-\d{2}\.\d{4}\.\d)(\d)/, '$1.$2')
    .replace(/^(\d{7}-\d{2}\.\d{4}\.\d\.\d{2})(\d)/, '$1.$2')
}

function dataBr(valor: string | null) {
  if (!valor) return '—'
  const d = new Date(valor)
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('pt-BR')
}

/**
 * Erros vindos da API pública (indisponibilidade, limite, chave recusada) são
 * falhas reais de comunicação — retentar pode funcionar. Erros de entrada
 * (número inválido, tribunal sem índice) não mudam sozinhos: retentar sem
 * corrigir o número não adianta.
 */
const ERROS_RETENTAVEIS: TipoErroConsulta[] = ['indisponivel', 'nao_autorizado', 'limite_excedido']

type ErroConsulta = { mensagem: string; podeRetentar: boolean }

interface Props {
  isLight?: boolean
  /** Pré-preenche o campo, p.ex. com o número de um processo já cadastrado. */
  numeroInicial?: string
}

/**
 * Consulta processual dentro do sistema, via API Pública do Datajud (CNJ).
 * A busca é por número único CNJ — a API não permite busca por CPF/nome
 * (ver limitações documentadas em `lib/datajud.ts`).
 */
export function ConsultaProcessoDatajud({ isLight = false, numeroInicial = '' }: Props) {
  const [numero, setNumero] = useState(() => mascaraProcesso(numeroInicial))
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<ErroConsulta | null>(null)
  const [aviso, setAviso] = useState('')
  const [processos, setProcessos] = useState<ProcessoDatajud[] | null>(null)

  // Sem sobrescrever o que o advogado já digitou: só reage a uma sugestão nova.
  const ultimaSugestao = useRef(numeroInicial)
  useEffect(() => {
    if (numeroInicial && numeroInicial !== ultimaSugestao.current) {
      ultimaSugestao.current = numeroInicial
      setNumero(mascaraProcesso(numeroInicial))
    }
  }, [numeroInicial])

  async function consultar() {
    const digitos = numero.replace(/\D/g, '')
    if (digitos.length !== 20) {
      setErro({ mensagem: 'Informe os 20 dígitos do número único CNJ.', podeRetentar: false })
      return
    }
    setCarregando(true)
    setErro(null)
    setAviso('')
    setProcessos(null)
    try {
      const res = await fetch('/api/consulta-processo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ numeroProcesso: digitos }),
      })
      let data: any = null
      try {
        data = await res.json()
      } catch {
        setErro({
          mensagem: 'Não foi possível consultar o tribunal agora. Tente novamente.',
          podeRetentar: true,
        })
        return
      }
      if (!res.ok || !data?.ok) {
        const tipo: TipoErroConsulta | undefined = data?.erro
        setErro({
          mensagem: data?.mensagem || 'Não foi possível consultar o tribunal agora. Tente novamente.',
          podeRetentar: tipo ? ERROS_RETENTAVEIS.includes(tipo) : true,
        })
        return
      }
      setProcessos(data.processos)
      if (data.avisoDigitoVerificador) {
        setAviso('O dígito verificador do número não confere — confirme a digitação.')
      }
    } catch {
      // Falha de rede/timeout ao chegar na nossa própria API — distinta de uma
      // resposta bem-sucedida do CNJ que apenas não achou o processo.
      setErro({
        mensagem: 'Não foi possível consultar o tribunal agora. Tente novamente.',
        podeRetentar: true,
      })
    } finally {
      setCarregando(false)
    }
  }

  const corTexto = isLight ? '#1E1E1E' : '#fff'

  return (
    <div className="p-4 rounded-xl mb-4" style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.2)' }}>
      <div className="flex items-center gap-2 mb-1">
        <Gavel size={16} color="#3B82F6" />
        <p className="text-xs font-bold" style={{ color: '#3B82F6' }}>Consulta processual no sistema (API Pública do CNJ — Datajud)</p>
      </div>
      <p className="text-[10px] mb-3" style={{ color: '#888' }}>
        Traz capa e movimentações direto para cá, sem sair do Marple. A API do CNJ só aceita busca por número único —
        não existe consulta por CPF nem emissão de certidão de antecedentes.
      </p>

      <div className="flex items-center gap-2">
        <input
          value={numero}
          onChange={e => setNumero(mascaraProcesso(e.target.value))}
          onKeyDown={e => { if (e.key === 'Enter') consultar() }}
          placeholder="0000000-00.0000.0.00.0000"
          className="input-glass flex-1 px-4 text-sm"
          style={{ height: 40 }} spellCheck={true} />
        <button
          onClick={consultar}
          disabled={carregando}
          className="btn-gold px-4 rounded-xl text-xs font-bold flex items-center gap-1.5"
          style={{ height: 40 }}
        >
          {carregando ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
          Consultar
        </button>
      </div>

      {erro && (
        <div className="flex items-start gap-2 mt-3 p-2.5 rounded-lg" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
          <AlertCircle size={14} color="#EF4444" className="flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-xs" style={{ color: '#EF4444' }}>
              {erro.mensagem} {!erro.podeRetentar && 'Se preferir, use os portais oficiais listados abaixo.'}
            </p>
            {erro.podeRetentar && (
              <button
                type="button"
                onClick={consultar}
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

      {aviso && <p className="text-[10px] mt-2" style={{ color: '#F59E0B' }}>⚠ {aviso}</p>}

      {processos?.length === 0 && !erro && (
        <div className="flex items-start gap-2 mt-3 p-2.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <ShieldQuestion size={14} color="#888" className="flex-shrink-0 mt-0.5" />
          <p className="text-xs" style={{ color: '#888' }}>
            Processo não encontrado ou protegido por segredo de justiça. A base pública do CNJ não distingue processos
            inexistentes dos que estão sob sigilo — se tiver certeza do número, confirme diretamente no portal do
            tribunal.
          </p>
        </div>
      )}

      {processos?.map(p => (
        <div key={p.numeroProcesso} className="mt-3 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-sm font-bold" style={{ color: corTexto }}>{p.numeroFormatado}</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: 'rgba(59,130,246,0.15)', color: '#3B82F6' }}>
              {p.tribunal}{p.grau ? ` · ${p.grau}` : ''}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 mb-3">
            {[
              { label: 'Classe', valor: p.classe || '—' },
              { label: 'Órgão julgador', valor: p.orgaoJulgador || '—' },
              { label: 'Ajuizamento', valor: dataBr(p.dataAjuizamento) },
              { label: 'Última atualização', valor: dataBr(p.ultimaAtualizacao) },
            ].map(({ label, valor }) => (
              <div key={label}>
                <div className="text-[10px]" style={{ color: '#666' }}>{label}</div>
                <div className="text-xs" style={{ color: corTexto }}>{valor}</div>
              </div>
            ))}
          </div>
          {p.assuntos.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {p.assuntos.map(a => (
                <span key={a} className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(212,175,55,0.12)', color: '#D4AF37' }}>{a}</span>
              ))}
            </div>
          )}
          {p.movimentos.length > 0 && (
            <>
              <div className="text-[10px] font-bold mb-1.5" style={{ color: '#888' }}>MOVIMENTAÇÕES ({p.movimentos.length})</div>
              <div className="space-y-1 max-h-48 overflow-auto pr-1">
                {p.movimentos.map((m, i) => (
                  <div key={`${m.dataHora}-${i}`} className="flex items-start gap-2 text-xs">
                    <span className="flex-shrink-0" style={{ color: '#666' }}>{dataBr(m.dataHora)}</span>
                    <span style={{ color: isLight ? '#3A3A3A' : '#ccc' }}>{m.nome}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  )
}
