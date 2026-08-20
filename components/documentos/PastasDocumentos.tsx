'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { ChevronDown, Folder, FolderOpen, FileText, Hash } from 'lucide-react'
import { GlassCard } from '@/components/GlassCard'
import {
  CHAVE_SEM_PROTOCOLO,
  ROTULO_SEM_CLIENTE,
  agruparDocumentosEmPastas,
  type ClienteParaPasta,
  type DocParaPasta,
  type ProcessoParaPasta,
} from '@/lib/documentos-pastas'

type Props = {
  documentos: DocParaPasta[]
  clientes: ClienteParaPasta[]
  processos: ProcessoParaPasta[]
  isLight?: boolean
  /** Ficha do cliente: omite o nível Cliente e mostra só Protocolo → docs. */
  modoCliente?: boolean
  clientIdFiltro?: string | null
  /** Com busca ativa, abre pastas que contêm resultados. */
  buscaAtiva?: boolean
  renderDocumento: (doc: DocParaPasta, index: number) => ReactNode
  emptyMessage?: string
}

function CabecalhoPasta({
  aberto,
  onToggle,
  icon,
  titulo,
  subtitulo,
  contagem,
  isLight,
}: {
  aberto: boolean
  onToggle: () => void
  icon: ReactNode
  titulo: string
  subtitulo?: string | null
  contagem: number
  isLight: boolean
}) {
  const corTexto = isLight ? '#1E1E1E' : '#fff'
  const corMuted = isLight ? '#5E5E5E' : '#888'

  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-white/5 rounded-xl"
      aria-expanded={aberto}
    >
      <span className="flex-shrink-0" style={{ color: '#D4AF37' }}>
        {icon}
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-semibold truncate" style={{ color: corTexto }}>
          {titulo}
        </span>
        {subtitulo ? (
          <span className="block text-xs truncate mt-0.5" style={{ color: corMuted }}>
            {subtitulo}
          </span>
        ) : null}
      </span>
      <span
        className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
        style={{ background: 'rgba(212,175,55,0.12)', color: '#D4AF37' }}
      >
        {contagem}
      </span>
      <ChevronDown
        size={16}
        className="flex-shrink-0 transition-transform"
        style={{
          color: corMuted,
          transform: aberto ? 'rotate(180deg)' : 'rotate(0deg)',
        }}
      />
    </button>
  )
}

/**
 * Árvore/acordeão Cliente → Protocolo → documentos.
 * Em mobile o acordeão aninhado funciona melhor que uma árvore profunda.
 */
export function PastasDocumentos({
  documentos,
  clientes,
  processos,
  isLight = false,
  modoCliente = false,
  clientIdFiltro = null,
  buscaAtiva = false,
  renderDocumento,
  emptyMessage = 'Nenhum documento nesta pasta',
}: Props) {
  const pastas = useMemo(
    () =>
      agruparDocumentosEmPastas({
        documentos,
        clientes,
        processos,
        clientIdFiltro: modoCliente ? clientIdFiltro : null,
      }),
    [documentos, clientes, processos, modoCliente, clientIdFiltro]
  )

  const [abertosCliente, setAbertosCliente] = useState<Set<string>>(new Set())
  const [abertosProt, setAbertosProt] = useState<Set<string>>(new Set())

  // Busca: abre pastas com resultado. Sem busca: mantém estado manual.
  useEffect(() => {
    if (!buscaAtiva) return
    const cli = new Set<string>()
    const prot = new Set<string>()
    for (const p of pastas) {
      if (p.documentosTotal > 0) cli.add(p.chave)
      for (const pr of p.protocolos) {
        if (pr.documentos.length > 0) prot.add(`${p.chave}::${pr.chave}`)
      }
    }
    setAbertosCliente(cli)
    setAbertosProt(prot)
  }, [buscaAtiva, pastas])

  // Ficha do cliente: abre "Sem protocolo" e o primeiro protocolo com docs.
  useEffect(() => {
    if (!modoCliente || buscaAtiva) return
    const pasta = pastas[0]
    if (!pasta) return
    const iniciais = new Set<string>()
    for (const pr of pasta.protocolos) {
      if (pr.documentos.length > 0 || pr.chave === CHAVE_SEM_PROTOCOLO) {
        iniciais.add(`${pasta.chave}::${pr.chave}`)
      }
    }
    if (iniciais.size === 0 && pasta.protocolos[0]) {
      iniciais.add(`${pasta.chave}::${pasta.protocolos[0].chave}`)
    }
    setAbertosProt(iniciais)
  }, [modoCliente, buscaAtiva, pastas])

  function toggleCliente(chave: string) {
    setAbertosCliente((prev) => {
      const next = new Set(prev)
      if (next.has(chave)) next.delete(chave)
      else next.add(chave)
      return next
    })
  }

  function toggleProt(chaveComposta: string) {
    setAbertosProt((prev) => {
      const next = new Set(prev)
      if (next.has(chaveComposta)) next.delete(chaveComposta)
      else next.add(chaveComposta)
      return next
    })
  }

  const corMuted = isLight ? '#5E5E5E' : '#888'

  if (pastas.length === 0) {
    return (
      <GlassCard intensity={0.3} style={{ padding: 32 }}>
        <div className="text-center">
          <FileText size={32} color="#333" className="mx-auto mb-2" />
          <p className="text-sm" style={{ color: corMuted }}>
            {emptyMessage}
          </p>
        </div>
      </GlassCard>
    )
  }

  return (
    <div className="space-y-2">
      {pastas.map((pastaCliente) => {
        const abertoCli = modoCliente || abertosCliente.has(pastaCliente.chave) || buscaAtiva
        const subCpf = pastaCliente.cpfFormatado
          ? `CPF ${pastaCliente.cpfFormatado}`
          : pastaCliente.chave === ROTULO_SEM_CLIENTE || !pastaCliente.clientId
            ? null
            : 'CPF não informado'

        const corpoProtocolos = (
          <div className={modoCliente ? 'space-y-2' : 'space-y-1.5 pl-1 sm:pl-3'}>
            {pastaCliente.protocolos.map((prot) => {
              const chaveProt = `${pastaCliente.chave}::${prot.chave}`
              const abertoP = abertosProt.has(chaveProt) || (buscaAtiva && prot.documentos.length > 0)
              const semProt = prot.chave === CHAVE_SEM_PROTOCOLO

              return (
                <div
                  key={chaveProt}
                  className="rounded-xl"
                  style={{
                    border: '1px solid rgba(255,255,255,0.06)',
                    background: isLight ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.02)',
                  }}
                >
                  <CabecalhoPasta
                    aberto={abertoP}
                    onToggle={() => toggleProt(chaveProt)}
                    icon={
                      semProt ? (
                        <Folder size={16} color="#888" />
                      ) : (
                        <Hash size={16} color="#D4AF37" />
                      )
                    }
                    titulo={prot.rotulo}
                    subtitulo={
                      prot.tribunal && !semProt
                        ? undefined
                        : semProt
                          ? 'Documentos sem número de processo vinculado'
                          : null
                    }
                    contagem={prot.documentos.length}
                    isLight={isLight}
                  />
                  {abertoP && (
                    <div className="px-2 pb-2 space-y-2">
                      {prot.documentos.length === 0 ? (
                        <p className="text-xs px-3 py-2" style={{ color: corMuted }}>
                          Nenhum documento neste protocolo ainda
                        </p>
                      ) : (
                        prot.documentos.map((doc, i) => (
                          <div key={doc.id}>{renderDocumento(doc, i)}</div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )

        if (modoCliente) {
          return (
            <div key={pastaCliente.chave} className="space-y-2">
              {corpoProtocolos}
            </div>
          )
        }

        return (
          <GlassCard key={pastaCliente.chave} intensity={0.45} style={{ padding: 8 }}>
            <CabecalhoPasta
              aberto={abertoCli}
              onToggle={() => toggleCliente(pastaCliente.chave)}
              icon={
                abertoCli ? (
                  <FolderOpen size={18} color="#D4AF37" />
                ) : (
                  <Folder size={18} color="#D4AF37" />
                )
              }
              titulo={pastaCliente.nome}
              subtitulo={subCpf}
              contagem={pastaCliente.documentosTotal}
              isLight={isLight}
            />
            {abertoCli && <div className="px-1 pb-2">{corpoProtocolos}</div>}
          </GlassCard>
        )
      })}
    </div>
  )
}
