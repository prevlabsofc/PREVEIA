'use client'

import { Suspense, useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'
import { motion } from 'framer-motion'
import { ArrowLeft, Loader2, Save, Shield, Copy, Eye } from 'lucide-react'
import { ModeloEditor } from '@/components/modelos/ModeloEditor'
import {
  obterModeloPorId,
  salvarCopiaModelo,
  TIPOS_MODELO,
  isTipoModelo,
  variaveisDesconhecidas,
  destacarVariaveisHtml,
  type TipoModeloDocumento,
  type ModeloListagem,
} from '@/lib/modelos'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function EditarModeloPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader2 className="animate-spin" size={24} color="#D4AF37" />
        </div>
      }
    >
      <EditarModeloContent />
    </Suspense>
  )
}

function EditarModeloContent() {
  const { id: idParam } = useParams()
  const id = decodeURIComponent(String(idParam || ''))
  const router = useRouter()
  const searchParams = useSearchParams()
  const isNovo = id === 'novo'
  const soVisualizar = searchParams.get('ver') === '1' && !isNovo

  const [isLight, setIsLight] = useState(false)
  const [lawyerId, setLawyerId] = useState('')
  const [loading, setLoading] = useState(!isNovo)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [ok, setOk] = useState('')
  const [avisoVars, setAvisoVars] = useState('')
  const [modelo, setModelo] = useState<ModeloListagem | null>(null)
  const [nome, setNome] = useState('')
  const [tipo, setTipo] = useState<TipoModeloDocumento>('peticao')
  const [conteudo, setConteudo] = useState('')
  const [idSalvo, setIdSalvo] = useState<string | null>(isNovo ? null : null)

  useEffect(() => {
    const check = () => setIsLight(document.documentElement.classList.contains('light'))
    check()
    const observer = new MutationObserver(check)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return
      setLawyerId(user.id)

      if (isNovo) {
        setNome('Novo modelo do escritório')
        setTipo('peticao')
        setConteudo(
          'EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A)\n\n{{nome_cliente}}, CPF {{cpf_cliente}}, residente em {{endereco_cliente}}, vem propor a presente ação.\n\n{{comarca}}, {{data_hoje}}.\n\n{{nome_advogado}}\nOAB {{oab}}\n'
        )
        setLoading(false)
        return
      }

      const m = await obterModeloPorId(supabase, user.id, id)
      if (!m) {
        setErro('Modelo não encontrado.')
        setLoading(false)
        return
      }
      setModelo(m)
      setNome(
        m.protegido
          ? `${m.nome.replace(/\s*\(padrão\)\s*$/i, '')} — [Meu Escritório]`
          : m.nome
      )
      setTipo(m.tipo)
      setConteudo(m.conteudo)
      if (!m.protegido) setIdSalvo(m.id)
      setLoading(false)
    }
    load()
  }, [id, isNovo])

  async function salvar(comoNovo = false) {
    if (!lawyerId) return
    if (!nome.trim()) {
      setErro('Informe um nome para o modelo.')
      return
    }
    const desconhecidas = variaveisDesconhecidas(conteudo)
    if (desconhecidas.length > 0) {
      const msg = `Variáveis não reconhecidas: ${desconhecidas.map((v) => `{{${v}}}`).join(', ')}. Inclua-as em lib/modelos/variaveis.ts ou corrija o texto.`
      setAvisoVars(msg)
      if (!confirm(`${msg}\n\nSalvar mesmo assim?`)) return
    } else {
      setAvisoVars('')
    }
    setSalvando(true)
    setErro('')
    setOk('')

    const ehPadrao = Boolean(modelo?.protegido)
    const criarCopia = comoNovo || ehPadrao || isNovo || !idSalvo

    const { data, error } = await salvarCopiaModelo(supabase, {
      lawyerId,
      nome: nome.trim(),
      tipo,
      conteudo,
      origemPadraoId: modelo?.origem_padrao_id || (ehPadrao ? modelo?.origem_padrao_id : null),
      versaoPadrao: modelo?.versao ?? null,
      idExistente: criarCopia ? null : idSalvo,
    })

    setSalvando(false)
    if (error || !data) {
      setErro(error || 'Falha ao salvar.')
      return
    }

    setIdSalvo(data.id)
    setModelo((prev) =>
      prev
        ? {
            ...prev,
            id: data.id,
            nome: data.nome,
            conteudo: data.conteudo,
            tipo: data.tipo,
            origem: 'escritorio',
            protegido: false,
            atualizadoEm: data.updated_at,
          }
        : prev
    )
    setOk(
      ehPadrao || criarCopia
        ? 'Cópia do escritório salva. O padrão do sistema permanece intacto.'
        : 'Modelo atualizado.'
    )
    if (isNovo || ehPadrao || (comoNovo && data.id !== id)) {
      router.replace(`/modelos/${data.id}`)
    }
  }

  const corTexto = isLight ? '#1E1E1E' : '#fff'
  const corSec = isLight ? '#5E5E5E' : '#9ca3af'
  const protegido = Boolean(modelo?.protegido)

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="animate-spin" size={24} color="#D4AF37" />
      </div>
    )
  }

  return (
    <div className="p-8 max-w-5xl mx-auto" style={{ background: isLight ? '#F8F8F8' : 'transparent' }}>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <Link href="/modelos" className="flex items-center gap-2 text-sm" style={{ color: '#D4AF37' }}>
            <ArrowLeft size={16} /> Voltar aos modelos
          </Link>
          <div className="flex-1" />
          {protegido && (
            <span
              className="text-[10px] px-2.5 py-1 rounded-full font-bold inline-flex items-center gap-1"
              style={{ background: 'rgba(212,175,55,0.12)', color: '#D4AF37' }}
            >
              <Shield size={11} /> Padrão protegido — editar cria cópia
            </span>
          )}
          {soVisualizar && (
            <span
              className="text-[10px] px-2.5 py-1 rounded-full font-bold inline-flex items-center gap-1"
              style={{ background: 'rgba(59,130,246,0.12)', color: '#3B82F6' }}
            >
              <Eye size={11} /> Visualização
            </span>
          )}
        </div>

        <h1 className="text-2xl font-black mb-1" style={{ color: corTexto }}>
          {soVisualizar
            ? modelo?.nome || 'Visualizar modelo'
            : isNovo
              ? 'Novo modelo'
              : protegido
                ? 'Personalizar modelo'
                : 'Editar modelo'}
        </h1>
        <p className="text-sm mb-5" style={{ color: corSec }}>
          {soVisualizar
            ? 'Prévia somente leitura. Variáveis aparecem como chips destacados.'
            : 'Use o botão "Inserir variável" para campos no formato {{nome_variavel}}.'}
        </p>

        {!soVisualizar && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <div className="sm:col-span-2">
              <label className="block text-xs mb-1" style={{ color: corSec }}>
                Nome
              </label>
              <input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="input-glass w-full px-4 text-sm"
                style={{ height: 44 }}
                spellCheck
              />
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: corSec }}>
                Tipo
              </label>
              <select
                value={tipo}
                onChange={(e) => {
                  const v = e.target.value
                  if (isTipoModelo(v)) setTipo(v)
                }}
                className="input-glass w-full px-3 text-sm"
                style={{ height: 44 }}
                disabled={protegido}
              >
                {TIPOS_MODELO.map((t) => (
                  <option key={t.id} value={t.id} style={{ background: '#111' }}>
                    {t.rotulo}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {soVisualizar ? (
          <div
            className="rounded-2xl p-5 font-mono text-xs leading-relaxed overflow-auto"
            style={{
              minHeight: 420,
              border: isLight ? '1px solid #EDEDED' : '1px solid rgba(212,175,55,0.2)',
              background: isLight ? '#fff' : '#0A0A0A',
              color: isLight ? '#374151' : '#ccc',
            }}
            dangerouslySetInnerHTML={{
              __html: destacarVariaveisHtml(conteudo || ' ', { pendentesAmarelo: false }),
            }}
          />
        ) : (
          <ModeloEditor value={conteudo} onChange={setConteudo} tipo={tipo} isLight={isLight} />
        )}

        {avisoVars && (
          <p className="text-xs mt-3" style={{ color: '#EAB308' }}>
            {avisoVars}
          </p>
        )}
        {erro && (
          <p className="text-xs mt-3" style={{ color: '#EF4444' }}>
            {erro}
          </p>
        )}
        {ok && (
          <p className="text-xs mt-3" style={{ color: '#22C55E' }}>
            {ok}
          </p>
        )}

        <div className="flex flex-wrap gap-2 mt-5">
          {soVisualizar ? (
            <Link
              href={`/modelos/${encodeURIComponent(id)}`}
              className="btn-gold px-5 py-2.5 rounded-xl text-sm font-bold inline-flex items-center gap-2"
            >
              Editar / personalizar
            </Link>
          ) : (
            <>
              <button
                type="button"
                onClick={() => salvar(false)}
                disabled={salvando}
                className="btn-gold px-5 py-2.5 rounded-xl text-sm font-bold inline-flex items-center gap-2 disabled:opacity-50"
              >
                {salvando ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                {protegido || isNovo ? 'Salvar como modelo do escritório' : 'Salvar alterações'}
              </button>
              {!protegido && !isNovo && idSalvo && (
                <button
                  type="button"
                  onClick={() => {
                    setNome((n) => (n.includes('(cópia)') ? n : `${n} (cópia)`))
                    salvar(true)
                  }}
                  disabled={salvando}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium inline-flex items-center gap-2 disabled:opacity-50"
                  style={{ border: '1px solid rgba(212,175,55,0.3)', color: '#D4AF37' }}
                >
                  <Copy size={14} /> Salvar como nova variação
                </button>
              )}
            </>
          )}
        </div>
      </motion.div>
    </div>
  )
}
