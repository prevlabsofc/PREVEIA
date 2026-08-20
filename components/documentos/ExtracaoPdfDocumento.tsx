'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import {
  FileSearch,
  Loader2,
  Upload,
  Scale,
  Mail,
  AlertCircle,
  CheckCircle2,
  FileText,
} from 'lucide-react'
import { GlassCard } from '@/components/GlassCard'
import { inserirNaPeticaoOuCopiar } from '@/lib/peticao-sessao'
import {
  EXTRACAO_PDF_AGENT_TYPE,
  EXTRACAO_PDF_MAX_BYTES,
  EXTRACAO_PDF_MAX_PAGINAS,
  formatarExtracaoParaNewsletter,
  formatarExtracaoParaPeticao,
  mapearExtracaoParaFormulario,
  normalizarExtracao,
  salvarContextoNewsletter,
  salvarContextoPeticao,
  type ExtracaoDocumentoPdf,
} from '@/lib/extracao-documento-pdf'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Fase = 'idle' | 'upload' | 'extracao' | 'ok' | 'erro'

type Props = {
  clientId?: string | null
  clientName?: string | null
  clientCpf?: string | null
  isLight?: boolean
  /** Extração já persistida (ex.: reabrir na lista de documentos). */
  extracaoInicial?: ExtracaoDocumentoPdf | null
  documentIdInicial?: string | null
  onConcluido?: (payload: {
    documentId: string
    extracao: ExtracaoDocumentoPdf
    title: string
  }) => void
}

function ProgressBar({ pct, label }: { pct: number; label: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-[11px]" style={{ color: '#888' }}>
        <span>{label}</span>
        <span>{Math.min(100, Math.round(pct))}%</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${Math.min(100, pct)}%`,
            background: 'linear-gradient(90deg, #D4AF37, #F0D060)',
          }}
        />
      </div>
    </div>
  )
}

function BlocoExtracao({
  extracao,
  isLight,
}: {
  extracao: ExtracaoDocumentoPdf
  isLight: boolean
}) {
  const cor = isLight ? '#1E1E1E' : '#fff'
  const muted = isLight ? '#5E5E5E' : '#888'
  return (
    <div className="space-y-4 text-sm">
      {extracao.numero_processo && (
        <div>
          <div className="text-[10px] uppercase tracking-wide mb-1" style={{ color: muted }}>Processo</div>
          <div className="font-medium" style={{ color: cor }}>{extracao.numero_processo}</div>
        </div>
      )}
      {extracao.partes.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-wide mb-1.5" style={{ color: muted }}>Partes</div>
          <ul className="space-y-1">
            {extracao.partes.map((p, i) => (
              <li key={`${p.nome}-${i}`} style={{ color: cor }}>
                <span style={{ color: '#D4AF37' }}>{p.papel}</span>
                <span style={{ color: muted }}> — </span>
                {p.nome}
              </li>
            ))}
          </ul>
        </div>
      )}
      {extracao.teses.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-wide mb-1.5" style={{ color: muted }}>Teses</div>
          <ol className="list-decimal pl-4 space-y-1" style={{ color: cor }}>
            {extracao.teses.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ol>
        </div>
      )}
      {extracao.decisao && (
        <div>
          <div className="text-[10px] uppercase tracking-wide mb-1" style={{ color: muted }}>Decisão</div>
          <p className="leading-relaxed whitespace-pre-wrap" style={{ color: cor }}>{extracao.decisao}</p>
        </div>
      )}
      {(extracao.datas.distribuicao || extracao.datas.julgamento || extracao.datas.publicacao || (extracao.datas.outras?.length ?? 0) > 0) && (
        <div>
          <div className="text-[10px] uppercase tracking-wide mb-1.5" style={{ color: muted }}>Datas</div>
          <ul className="space-y-0.5" style={{ color: cor }}>
            {extracao.datas.distribuicao && <li>Distribuição: {extracao.datas.distribuicao}</li>}
            {extracao.datas.julgamento && <li>Julgamento: {extracao.datas.julgamento}</li>}
            {extracao.datas.publicacao && <li>Publicação: {extracao.datas.publicacao}</li>}
            {(extracao.datas.outras || []).map((o, i) => (
              <li key={i}>{o.rotulo}: {o.data}</li>
            ))}
          </ul>
        </div>
      )}
      {extracao.resumo && (
        <div>
          <div className="text-[10px] uppercase tracking-wide mb-1" style={{ color: muted }}>Resumo</div>
          <p className="leading-relaxed whitespace-pre-wrap" style={{ color: cor }}>{extracao.resumo}</p>
        </div>
      )}
    </div>
  )
}

/**
 * Upload de PDF longo → Storage → Claude (document block) → resumo estruturado.
 * Usado na ficha do cliente e em /documentos.
 */
export function ExtracaoPdfDocumento({
  clientId,
  clientName,
  clientCpf,
  isLight = false,
  extracaoInicial = null,
  documentIdInicial = null,
  onConcluido,
}: Props) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [fase, setFase] = useState<Fase>(extracaoInicial ? 'ok' : 'idle')
  const [progresso, setProgresso] = useState(0)
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')
  const [feedback, setFeedback] = useState('')
  const [extracao, setExtracao] = useState<ExtracaoDocumentoPdf | null>(extracaoInicial)
  const [documentId, setDocumentId] = useState<string | null>(documentIdInicial)
  const [nomeArquivo, setNomeArquivo] = useState('')

  const corTexto = isLight ? '#1E1E1E' : '#fff'
  const corMuted = isLight ? '#5E5E5E' : '#888'
  const ocupado = fase === 'upload' || fase === 'extracao'

  async function processarArquivo(file: File) {
    setErro('')
    setAviso('')
    setFeedback('')
    setNomeArquivo(file.name)

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setFase('erro')
      setErro('Envie apenas arquivos PDF.')
      return
    }
    if (file.size > EXTRACAO_PDF_MAX_BYTES) {
      setFase('erro')
      setErro(
        `Arquivo com ${(file.size / (1024 * 1024)).toFixed(1)} MB. Limite: ${EXTRACAO_PDF_MAX_BYTES / (1024 * 1024)} MB (Claude ~32 MB no request com base64).`
      )
      return
    }

    const { data: auth } = await supabase.auth.getSession()
    const session = auth.session
    if (!session?.user || !session.access_token) {
      setFase('erro')
      setErro('Sessão expirada. Faça login novamente.')
      return
    }
    const userId = session.user.id

    setFase('upload')
    setProgresso(8)

    const safeName = file.name.replace(/[^\w.\-]+/g, '_').slice(0, 80)
    const path = `${userId}/${Date.now()}-${safeName}`

    const { error: upErr } = await supabase.storage
      .from('provas')
      .upload(path, file, { contentType: 'application/pdf', upsert: false })

    if (upErr) {
      setFase('erro')
      setErro(
        upErr.message.includes('Bucket not found')
          ? 'Bucket de armazenamento "provas" não encontrado. Rode a migration de documentos/provas no Supabase.'
          : `Falha no upload: ${upErr.message}`
      )
      return
    }
    setProgresso(35)

    const { data: pub } = supabase.storage.from('provas').getPublicUrl(path)
    const fileUrl = pub.publicUrl
    const titulo = file.name.replace(/\.pdf$/i, '') || 'Documento PDF'

    const row: Record<string, unknown> = {
      lawyer_id: userId,
      client_id: clientId || null,
      client_name: clientName || null,
      agent_type: EXTRACAO_PDF_AGENT_TYPE,
      title: titulo,
      content: `PDF para extração: ${file.name}`,
      status: 'uploaded',
      file_url: fileUrl,
      mime_type: 'application/pdf',
      form_data: {
        file_name: file.name,
        size: file.size,
        origem: 'extracao-pdf',
        storage_bucket: 'provas',
        storage_path: path,
      },
    }

    let { data: doc, error: insErr } = await supabase
      .from('documents')
      .insert(row)
      .select('id')
      .single()

    if (insErr && /file_url|mime_type/i.test(insErr.message)) {
      const fallback = { ...row }
      delete fallback.file_url
      delete fallback.mime_type
      const retry = await supabase.from('documents').insert(fallback).select('id').single()
      doc = retry.data
      insErr = retry.error
      if (!insErr) {
        setAviso('Arquivo no Storage, mas file_url não pôde ser gravado (migration pendente). A extração pode falhar.')
      }
    }

    if (insErr || !doc?.id) {
      setFase('erro')
      setErro(`Falha ao registrar o documento: ${insErr?.message || 'erro desconhecido'}`)
      return
    }

    setDocumentId(doc.id)
    setProgresso(45)
    setFase('extracao')

    // Progresso estimado enquanto a IA analisa (PDFs longos: 30–120s+).
    let tick = 45
    const timer = setInterval(() => {
      tick = Math.min(92, tick + 2)
      setProgresso(tick)
    }, 1200)

    try {
      const res = await fetch('/api/extrair-documento-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ document_id: doc.id, storage_path: path }),
      })
      const data = await res.json().catch(() => ({}))
      clearInterval(timer)

      if (!res.ok || !data.ok) {
        setFase('erro')
        setErro(data.error || 'Não foi possível extrair o PDF. Tente novamente.')
        setProgresso(0)
        return
      }

      const extr = normalizarExtracao(data.extracao)
      if (!extr) {
        setFase('erro')
        setErro('Resposta da extração inválida.')
        return
      }

      setExtracao(extr)
      setProgresso(100)
      setFase('ok')
      if (data.aviso) setAviso(data.aviso)
      if (data.paginas != null) {
        setFeedback(`Análise concluída (${data.paginas} página${data.paginas === 1 ? '' : 's'}).`)
      } else {
        setFeedback('Análise concluída.')
      }
      onConcluido?.({ documentId: doc.id, extracao: extr, title: titulo })
    } catch {
      clearInterval(timer)
      setFase('erro')
      setErro('Falha de rede na extração. Verifique a conexão e tente de novo.')
      setProgresso(0)
    }
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (file) void processarArquivo(file)
  }

  async function usarNaPeticao() {
    if (!extracao) return
    setFeedback('')
    const texto = formatarExtracaoParaPeticao(extracao)
    const formPrefill = mapearExtracaoParaFormulario(extracao, {
      clienteId: clientId || undefined,
      clienteNome: clientName || undefined,
      clienteCPF: clientCpf || undefined,
    })
    salvarContextoPeticao({
      extracao,
      texto,
      formPrefill,
      clientId,
      clientName,
    })
    const resultado = await inserirNaPeticaoOuCopiar(texto)
    if (resultado === 'inserido') {
      setFeedback('Contexto enviado à petição ativa. Abrindo Agentes…')
    } else {
      setFeedback('Nenhuma petição ativa — texto copiado. Abrindo Agentes com pré-preenchimento…')
    }
    const qs = new URLSearchParams()
    if (clientId) qs.set('clienteId', clientId)
    if (clientName) qs.set('clienteNome', clientName)
    if (clientCpf) qs.set('clienteCPF', clientCpf)
    if (extracao.numero_processo) qs.set('numeroProcesso', extracao.numero_processo)
    router.push(`/agentes${qs.toString() ? `?${qs}` : ''}`)
  }

  function usarNaNewsletter() {
    if (!extracao) return
    const rascunho = formatarExtracaoParaNewsletter(extracao)
    salvarContextoNewsletter(rascunho)
    setFeedback('Contexto enviado à newsletter. Abrindo…')
    router.push('/newsletter')
  }

  return (
    <GlassCard intensity={0.4} style={{ padding: 24 }}>
      <div className="flex items-start gap-3 mb-4">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(212,175,55,0.12)' }}
        >
          <FileSearch size={18} color="#D4AF37" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold" style={{ color: corTexto }}>
            Extrair PDF jurídico
          </h3>
          <p className="text-xs mt-0.5" style={{ color: corMuted }}>
            Sentenças, acórdãos e petições (até {EXTRACAO_PDF_MAX_PAGINAS} páginas /{' '}
            {EXTRACAO_PDF_MAX_BYTES / (1024 * 1024)} MB). A IA lê o PDF nativo e devolve partes,
            processo, teses, decisão e datas.
          </p>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={onPick}
      />

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <button
          type="button"
          disabled={ocupado}
          onClick={() => inputRef.current?.click()}
          className="btn-gold flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm disabled:opacity-50"
        >
          {ocupado ? (
            <>
              <Loader2 size={15} className="animate-spin" /> Processando…
            </>
          ) : (
            <>
              <Upload size={15} /> Enviar PDF
            </>
          )}
        </button>
        {nomeArquivo && (
          <span className="text-xs truncate max-w-[220px]" style={{ color: corMuted }}>
            <FileText size={12} className="inline mr-1" />
            {nomeArquivo}
          </span>
        )}
        {documentId && (
          <span className="text-[10px]" style={{ color: '#666' }}>
            id: {documentId.slice(0, 8)}…
          </span>
        )}
      </div>

      {(fase === 'upload' || fase === 'extracao') && (
        <div className="mb-4">
          <ProgressBar
            pct={progresso}
            label={fase === 'upload' ? 'Enviando para o armazenamento…' : 'Analisando com Claude (pode levar 1–3 min em PDFs longos)…'}
          />
        </div>
      )}

      {erro && (
        <div
          className="flex items-start gap-2 text-xs rounded-xl px-3 py-2.5 mb-3"
          style={{ background: 'rgba(239,68,68,0.1)', color: '#F87171', border: '1px solid rgba(239,68,68,0.25)' }}
        >
          <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
          <span>{erro}</span>
        </div>
      )}

      {aviso && (
        <div
          className="flex items-start gap-2 text-xs rounded-xl px-3 py-2.5 mb-3"
          style={{ background: 'rgba(245,158,11,0.1)', color: '#FBBF24', border: '1px solid rgba(245,158,11,0.25)' }}
        >
          <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
          <span>{aviso}</span>
        </div>
      )}

      {feedback && !erro && (
        <div
          className="flex items-start gap-2 text-xs rounded-xl px-3 py-2.5 mb-3"
          style={{ background: 'rgba(34,197,94,0.1)', color: '#4ADE80', border: '1px solid rgba(34,197,94,0.25)' }}
        >
          <CheckCircle2 size={14} className="flex-shrink-0 mt-0.5" />
          <span>{feedback}</span>
        </div>
      )}

      {extracao && (
        <>
          <div
            className="rounded-xl p-4 mb-4"
            style={{ border: '1px solid rgba(255,255,255,0.08)', background: isLight ? '#F8F8F8' : 'rgba(255,255,255,0.02)' }}
          >
            <BlocoExtracao extracao={extracao} isLight={isLight} />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void usarNaPeticao()}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-opacity hover:opacity-90"
              style={{ background: 'linear-gradient(135deg,#D4AF37,#F0D060)', color: '#000' }}
            >
              <Scale size={15} /> Usar na petição
            </button>
            <button
              type="button"
              onClick={usarNaNewsletter}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors hover:bg-[rgba(212,175,55,0.08)]"
              style={{ border: '1px solid rgba(212,175,55,0.35)', color: '#D4AF37' }}
            >
              <Mail size={15} /> Usar na newsletter
            </button>
          </div>
        </>
      )}
    </GlassCard>
  )
}
