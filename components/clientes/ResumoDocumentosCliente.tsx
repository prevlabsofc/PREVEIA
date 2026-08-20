'use client'

import { useMemo, useRef, useState } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  Circle,
  ClipboardList,
  Loader2,
  Upload,
} from 'lucide-react'
import { GlassCard } from '@/components/GlassCard'
import { createBrowserClient } from '@supabase/ssr'
import {
  CHECKLIST_ANEXO_AGENT_TYPE,
  TIPOS_BENEFICIO_CHECKLIST,
  avaliarChecklist,
  sugerirItemChecklist,
  type DocChecklist,
  type ResultadoChecklist,
} from '@/lib/checklist-inss'
import { SolicitarDocsWhatsApp } from '@/components/clientes/SolicitarDocsWhatsApp'
import {
  analisarQualidadeImagem,
  ehArquivoImagem,
  type ResultadoQualidade,
} from '@/lib/qualidade-imagem'
import {
  BadgeQualidadePendente,
  ModalQualidadeImagem,
} from '@/components/clientes/ValidacaoQualidadeImagem'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type PendenteQualidade = {
  file: File
  resultado: ResultadoQualidade
  userId: string
}

type Props = {
  clientId: string
  clientName?: string | null
  /** Preferir whatsapp; senão phone — usado no botão Solicitar via WhatsApp. */
  phone?: string | null
  tipoBeneficio?: string | null
  documentos: DocChecklist[]
  isLight?: boolean
  /** Permite gravar tipo_beneficio (cargo com acesso de edição). */
  podeEditarBeneficio?: boolean
  onTipoBeneficioChange?: (valor: string) => void
  /** Após upload bem-sucedido: novos docs + resumo recalculado. */
  onDocsAtualizados?: (docs: DocChecklist[], resumo: ResultadoChecklist) => void
}

/**
 * Resumo persistente da checklist INSS na ficha do cliente:
 * "Documentos recebidos: X/Y", lista de pendências e upload em lote.
 */
export function ResumoDocumentosCliente({
  clientId,
  clientName,
  phone,
  tipoBeneficio,
  documentos,
  isLight = false,
  podeEditarBeneficio = true,
  onTipoBeneficioChange,
  onDocsAtualizados,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [enviando, setEnviando] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [erro, setErro] = useState('')
  const [filaQualidade, setFilaQualidade] = useState<PendenteQualidade[]>([])
  const [docsAcumulados, setDocsAcumulados] = useState<DocChecklist[] | null>(null)

  const corTexto = isLight ? '#1E1E1E' : '#fff'
  const corMuted = isLight ? '#5E5E5E' : '#888'

  const resumo = useMemo(
    () => avaliarChecklist({ tipo_beneficio: tipoBeneficio }, documentos),
    [tipoBeneficio, documentos]
  )

  const pendenteAtual = filaQualidade[0] ?? null

  async function salvarTipoBeneficio(valor: string) {
    setErro('')
    onTipoBeneficioChange?.(valor)
    const { error } = await supabase
      .from('clients')
      .update({ tipo_beneficio: valor || null })
      .eq('id', clientId)
    if (error) {
      setErro(
        'Não foi possível salvar o tipo de benefício. Verifique se a coluna tipo_beneficio existe no banco.'
      )
    }
  }

  function finalizarLote(docsFinais: DocChecklist[], novosCount: number) {
    const novoResumo = avaliarChecklist({ tipo_beneficio: tipoBeneficio }, docsFinais)
    onDocsAtualizados?.(docsFinais, novoResumo)
    setDocsAcumulados(null)
    setFilaQualidade([])
    setEnviando(false)

    if (novoResumo.ok) {
      setToast(novoResumo.rotulo)
      setTimeout(() => setToast(null), 4000)
    } else if (novosCount > 0) {
      setToast(
        `${novosCount} arquivo(s) registrado(s). Defina o tipo de benefício para ver o progresso.`
      )
      setTimeout(() => setToast(null), 4500)
    }
  }

  async function registrarArquivo(
    file: File,
    userId: string,
    qualidadePendente: boolean
  ): Promise<DocChecklist | null> {
    const itens = resumo.ok ? resumo.obrigatorios : ([] as string[])
    const sugerido = itens.length ? sugerirItemChecklist(file.name, itens) : null
    const titulo = sugerido || file.name.replace(/\.[^.]+$/, '') || file.name

    const formData = {
      checklist_item: sugerido,
      file_name: file.name,
      mime: file.type || null,
      size: file.size,
      qualidade_pendente: qualidadePendente,
    }

    const row: Record<string, unknown> = {
      lawyer_id: userId,
      client_id: clientId,
      client_name: clientName || null,
      agent_type: CHECKLIST_ANEXO_AGENT_TYPE,
      title: titulo,
      content: `Anexo de checklist: ${file.name}`,
      status: 'uploaded',
      qualidade_pendente: qualidadePendente,
      mime_type: file.type || null,
      form_data: formData,
    }

    let { data, error } = await supabase
      .from('documents')
      .insert(row)
      .select('id, title, agent_type, form_data, status, created_at, qualidade_pendente')
      .single()

    // Migração ainda não aplicada: grava só form_data.
    if (error && /qualidade_pendente|mime_type|file_url/i.test(error.message)) {
      const fallback = { ...row }
      delete fallback.qualidade_pendente
      delete fallback.mime_type
      delete fallback.file_url
      const retry = await supabase
        .from('documents')
        .insert(fallback)
        .select('id, title, agent_type, form_data, status, created_at')
        .single()
      data = retry.data as typeof data
      error = retry.error
    }

    if (error) {
      setErro(`Falha ao registrar "${file.name}". ${error.message}`)
      return null
    }

    return {
      title: data?.title ?? titulo,
      agent_type: CHECKLIST_ANEXO_AGENT_TYPE,
      form_data: formData,
      file_name: file.name,
      qualidade_pendente: qualidadePendente,
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    e.target.value = ''
    if (!files.length) return

    setErro('')
    setEnviando(true)

    const { data: auth } = await supabase.auth.getUser()
    const user = auth.user
    if (!user) {
      setErro('Sessão expirada. Faça login novamente.')
      setEnviando(false)
      return
    }

    const novos: DocChecklist[] = []
    const fila: PendenteQualidade[] = []

    for (const file of files) {
      // PDF/DOC/etc.: pulam a análise de qualidade por completo.
      if (!ehArquivoImagem(file)) {
        const doc = await registrarArquivo(file, user.id, false)
        if (doc) novos.push(doc)
        continue
      }

      try {
        const resultado = await analisarQualidadeImagem(file)
        if (resultado.ok) {
          const doc = await registrarArquivo(file, user.id, false)
          if (doc) novos.push(doc)
        } else {
          fila.push({ file, resultado, userId: user.id })
        }
      } catch {
        fila.push({
          file,
          resultado: {
            ok: false,
            width: 0,
            height: 0,
            brilho: 0,
            contraste: 0,
            nitidez: 0,
            problemas: ['resolucao'],
          },
          userId: user.id,
        })
      }
    }

    const base = [...documentos, ...novos]
    if (fila.length === 0) {
      finalizarLote(base, novos.length)
      return
    }

    setDocsAcumulados(base)
    setFilaQualidade(fila)
    // Mantém enviando=true enquanto o modal da fila estiver aberto.
  }

  async function salvarMesmoAssim() {
    if (!pendenteAtual || !docsAcumulados) return
    setEnviando(true)
    const doc = await registrarArquivo(
      pendenteAtual.file,
      pendenteAtual.userId,
      true
    )
    const base = doc ? [...docsAcumulados, doc] : docsAcumulados
    const resto = filaQualidade.slice(1)
    if (resto.length === 0) {
      const novosCount = base.length - documentos.length
      finalizarLote(base, Math.max(0, novosCount))
      return
    }
    setDocsAcumulados(base)
    setFilaQualidade(resto)
  }

  function reenviarAtual() {
    // Descarta este arquivo e segue a fila (ou finaliza).
    const resto = filaQualidade.slice(1)
    if (resto.length === 0) {
      const base = docsAcumulados || documentos
      const novosCount = base.length - documentos.length
      finalizarLote(base, Math.max(0, novosCount))
      inputRef.current?.click()
      return
    }
    setFilaQualidade(resto)
  }

  return (
    <GlassCard intensity={0.3} style={{ padding: 24, marginBottom: 20 }}>
      <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
        <h3 className="font-bold flex items-center gap-2" style={{ color: corTexto }}>
          <ClipboardList size={18} color="#D4AF37" />
          Checklist de documentos
        </h3>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={enviando}
          className="btn-gold flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs"
        >
          {enviando ? (
            <>
              <Loader2 size={13} className="animate-spin" /> Enviando...
            </>
          ) : (
            <>
              <Upload size={13} /> Enviar documentos
            </>
          )}
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx,.txt"
          className="hidden"
          onChange={handleUpload}
        />
      </div>

      {podeEditarBeneficio && (
        <div className="mb-4">
          <label className="block text-[10px] mb-1" style={{ color: corMuted }}>
            Tipo de benefício / caso
          </label>
          <select
            value={tipoBeneficio || ''}
            onChange={(e) => salvarTipoBeneficio(e.target.value)}
            className="input-glass w-full px-3 text-sm"
            style={{ height: 40 }}
          >
            <option value="" style={{ background: '#111' }}>
              Selecionar...
            </option>
            {TIPOS_BENEFICIO_CHECKLIST.map((b) => (
              <option key={b} value={b} style={{ background: '#111' }}>
                {b}
              </option>
            ))}
          </select>
        </div>
      )}

      {!resumo.ok ? (
        <div
          className="flex items-start gap-2 p-3 rounded-xl text-sm"
          style={{
            background: 'rgba(245,158,11,0.08)',
            border: '1px solid rgba(245,158,11,0.25)',
            color: '#F59E0B',
          }}
        >
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          <span>{resumo.motivo}</span>
        </div>
      ) : (
        <>
          <div
            className="flex items-center justify-between gap-3 p-3 rounded-xl mb-4"
            style={{
              background:
                resumo.pendentes.length === 0
                  ? 'rgba(34,197,94,0.1)'
                  : 'rgba(212,175,55,0.08)',
              border: `1px solid ${
                resumo.pendentes.length === 0
                  ? 'rgba(34,197,94,0.3)'
                  : 'rgba(212,175,55,0.25)'
              }`,
            }}
          >
            <span
              className="text-sm font-bold"
              style={{
                color: resumo.pendentes.length === 0 ? '#22C55E' : '#D4AF37',
              }}
            >
              {resumo.rotulo}
            </span>
            <span className="text-[10px]" style={{ color: corMuted }}>
              {resumo.tipoBeneficio}
            </span>
          </div>

          {resumo.pendentes.length > 0 ? (
            <div>
              <p className="text-xs font-bold mb-2" style={{ color: '#EF4444' }}>
                Pendentes ({resumo.pendentes.length})
              </p>
              <ul className="space-y-1.5">
                {resumo.pendentes.map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-2 text-sm px-2.5 py-2 rounded-lg"
                    style={{
                      background: isLight ? '#F8F8F8' : 'rgba(255,255,255,0.02)',
                      color: corTexto,
                    }}
                  >
                    <Circle size={12} color="#EF4444" className="flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <SolicitarDocsWhatsApp
                pendingDocs={resumo.pendentes}
                phone={phone}
                clientName={clientName}
              />
            </div>
          ) : (
            <p className="text-sm flex items-center gap-2" style={{ color: '#22C55E' }}>
              <CheckCircle2 size={16} /> Toda a documentação obrigatória foi recebida.
            </p>
          )}

          {resumo.recebidos.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-bold mb-2" style={{ color: '#22C55E' }}>
                Recebidos ({resumo.recebidos.length})
              </p>
              <ul className="space-y-1">
                {resumo.recebidos.map((item) => {
                  const docMatch = documentos.find((d) => {
                    const fd = d.form_data
                    return (
                      (fd && typeof fd.checklist_item === 'string' && fd.checklist_item === item) ||
                      d.title === item
                    )
                  })
                  const qualidade =
                    Boolean(docMatch?.qualidade_pendente) ||
                    Boolean(docMatch?.form_data?.qualidade_pendente)
                  return (
                    <li
                      key={item}
                      className="flex items-center gap-2 text-xs px-2.5 py-1.5 rounded-lg flex-wrap"
                      style={{ color: corMuted }}
                    >
                      <CheckCircle2 size={12} color="#22C55E" className="flex-shrink-0" />
                      <span className="flex-1 min-w-0">{item}</span>
                      {qualidade && <BadgeQualidadePendente />}
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </>
      )}

      {erro && (
        <p className="text-xs mt-3" style={{ color: '#EF4444' }}>
          {erro}
        </p>
      )}

      {toast && (
        <div
          role="status"
          className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl text-xs font-medium max-w-sm"
          style={{
            background: 'rgba(10,30,15,0.96)',
            border: '1px solid rgba(34,197,94,0.45)',
            color: '#86EFAC',
            boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
          }}
        >
          {toast}
        </div>
      )}

      <ModalQualidadeImagem
        aberto={!!pendenteAtual}
        nomeArquivo={pendenteAtual?.file.name || ''}
        resultado={pendenteAtual?.resultado || null}
        salvando={enviando && !!pendenteAtual}
        onReenviar={reenviarAtual}
        onSalvarMesmoAssim={() => {
          void salvarMesmoAssim()
        }}
      />
    </GlassCard>
  )
}
