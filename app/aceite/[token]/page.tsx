'use client'

import { use, useCallback, useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { CheckCircle2, XCircle, Shield } from 'lucide-react'
import { rotuloZona } from '@/lib/aprovacao-cliente-shared'

type Snapshot = {
  nome: string | null
  cpf_mascarado: string | null
  profissao: string | null
  zona: string | null
  cidade: string | null
  estado: string | null
  endereco: string | null
  telefone: string | null
  email: string | null
  escritorio_nome: string | null
  advogado_nome: string | null
  resumo_caso: string | null
  gerado_em: string | null
}

type Estado =
  | { fase: 'carregando' }
  | { fase: 'indisponivel' }
  | { fase: 'pendente'; snapshot: Snapshot; expires_at: string | null }
  | { fase: 'aceito'; snapshot: Snapshot; accepted_at: string | null }
  | { fase: 'recusado' }

export default function AceitePublicoPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = use(params)
  const [estado, setEstado] = useState<Estado>({ fase: 'carregando' })
  const [enviando, setEnviando] = useState(false)
  const [confirmando, setConfirmando] = useState<'aceitar' | 'recusar' | null>(null)

  const carregar = useCallback(async (t: string) => {
    setEstado({ fase: 'carregando' })
    try {
      const res = await fetch(`/api/aceite/${encodeURIComponent(t)}`, {
        cache: 'no-store',
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || data.error) {
        setEstado({ fase: 'indisponivel' })
        return
      }
      if (data.status === 'aceito') {
        setEstado({
          fase: 'aceito',
          snapshot: data.snapshot || {},
          accepted_at: data.accepted_at || null,
        })
        return
      }
      if (data.status === 'pendente') {
        setEstado({
          fase: 'pendente',
          snapshot: data.snapshot || {},
          expires_at: data.expires_at || null,
        })
        return
      }
      setEstado({ fase: 'indisponivel' })
    } catch {
      setEstado({ fase: 'indisponivel' })
    }
  }, [])

  useEffect(() => {
    if (token) void carregar(token)
  }, [token, carregar])

  async function decidir(acao: 'aceitar' | 'recusar') {
    if (!token || enviando) return
    setEnviando(true)
    try {
      const res = await fetch(`/api/aceite/${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acao }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || data.error) {
        setEstado({ fase: 'indisponivel' })
        return
      }
      if (data.status === 'aceito') {
        setEstado({
          fase: 'aceito',
          snapshot: data.snapshot || (estado.fase === 'pendente' ? estado.snapshot : {}),
          accepted_at: data.accepted_at || new Date().toISOString(),
        })
      } else {
        setEstado({ fase: 'recusado' })
      }
    } catch {
      setEstado({ fase: 'indisponivel' })
    } finally {
      setEnviando(false)
      setConfirmando(null)
    }
  }

  return (
    <div className="min-h-screen" style={{ background: '#050505' }}>
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(212,175,55,0.12) 0%, transparent 55%), radial-gradient(ellipse 40% 30% at 80% 80%, rgba(212,175,55,0.04) 0%, transparent 50%)',
        }}
      />

      <header
        className="relative z-10 border-b px-6 py-4 flex items-center justify-between"
        style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(16px)' }}
      >
        <Link href="/" className="text-xl font-black tracking-tight">
          <span className="text-white">Mar</span>
          <span style={{ color: '#D4AF37' }}>ple</span>
        </Link>
        <span className="text-[11px] uppercase tracking-[0.2em] text-gray-500 flex items-center gap-1.5">
          <Shield size={12} style={{ color: '#D4AF37' }} />
          Revisão segura
        </span>
      </header>

      <main className="relative z-10 max-w-lg mx-auto px-5 py-10 sm:py-14">
        {estado.fase === 'carregando' && (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div
              className="w-9 h-9 rounded-full border-2 animate-spin"
              style={{ borderColor: '#D4AF37', borderTopColor: 'transparent' }}
            />
            <p className="text-sm text-gray-500">Carregando revisão…</p>
          </div>
        )}

        {estado.fase === 'indisponivel' && (
          <PainelMensagem
            icon={<XCircle size={36} color="#888" />}
            titulo="Link indisponível"
            texto="Este link de revisão não está disponível. Ele pode ter expirado, sido revogado ou já ter sido utilizado. Peça um novo link ao seu escritório."
          />
        )}

        {estado.fase === 'recusado' && (
          <PainelMensagem
            icon={<XCircle size={36} color="#F59E0B" />}
            titulo="Revisão recusada"
            texto="Você indicou que os dados não estão corretos. O escritório foi notificado pelo status do link e poderá entrar em contato para ajustar as informações."
          />
        )}

        {estado.fase === 'aceito' && (
          <PainelMensagem
            icon={<CheckCircle2 size={36} color="#22C55E" />}
            titulo="Aceite registrado"
            texto="Obrigado. Sua confirmação formal dos dados foi registrada com data e hora. O escritório poderá seguir com o protocolo."
            extra={
              estado.accepted_at
                ? `Confirmado em ${new Date(estado.accepted_at).toLocaleString('pt-BR')}`
                : null
            }
          />
        )}

        {estado.fase === 'pendente' && (
          <div className="space-y-6">
            <div className="text-center mb-2">
              <div
                className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4 overflow-hidden relative"
                style={{ background: 'linear-gradient(135deg, #D4AF37, #B8941F)' }}
              >
                <Image src="/logo.png" alt="Marple" width={40} height={40} className="object-contain" />
              </div>
              <p className="text-[11px] uppercase tracking-[0.25em] mb-2" style={{ color: '#D4AF37' }}>
                Confirmação do caso
              </p>
              <h1 className="text-2xl sm:text-3xl font-black text-white mb-2">
                Revise seus dados
              </h1>
              <p className="text-sm text-gray-400 leading-relaxed max-w-sm mx-auto">
                {estado.snapshot.escritorio_nome || 'Seu escritório'} pediu que você confirme as
                informações abaixo antes do protocolo.
              </p>
            </div>

            <section
              className="rounded-3xl p-6 sm:p-7 space-y-4"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(212,175,55,0.22)',
                backdropFilter: 'blur(20px)',
              }}
            >
              <Campo label="Nome" valor={estado.snapshot.nome} destaque />
              <Campo label="CPF" valor={estado.snapshot.cpf_mascarado} />
              <Campo label="Profissão" valor={estado.snapshot.profissao} />
              <Campo label="Zona" valor={rotuloZona(estado.snapshot.zona)} />
              <Campo
                label="Local"
                valor={[estado.snapshot.cidade, estado.snapshot.estado].filter(Boolean).join(' / ') || null}
              />
              <Campo label="Endereço" valor={estado.snapshot.endereco} />
              <Campo label="Telefone" valor={estado.snapshot.telefone} />
              <Campo label="E-mail" valor={estado.snapshot.email} />
              {estado.snapshot.advogado_nome && (
                <Campo label="Advogado responsável" valor={estado.snapshot.advogado_nome} />
              )}
              {estado.snapshot.resumo_caso && (
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1.5">
                    Resumo do caso
                  </div>
                  <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
                    {estado.snapshot.resumo_caso}
                  </p>
                </div>
              )}
            </section>

            <p className="text-xs text-gray-500 text-center leading-relaxed px-2">
              Ao aceitar, você declara que os dados acima estão corretos para fins de protocolo.
              Este link é de uso único.
              {estado.expires_at && (
                <>
                  {' '}
                  Válido até{' '}
                  {new Date(estado.expires_at).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  })}
                  .
                </>
              )}
            </p>

            {confirmando ? (
              <div
                className="rounded-2xl p-5 space-y-4"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                <p className="text-sm text-gray-300 text-center">
                  {confirmando === 'aceitar'
                    ? 'Confirmar que os dados estão corretos?'
                    : 'Recusar estes dados e informar o escritório?'}
                </p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    disabled={enviando}
                    onClick={() => void decidir(confirmando)}
                    className="flex-1 py-3 rounded-xl text-sm font-bold transition-opacity disabled:opacity-50"
                    style={
                      confirmando === 'aceitar'
                        ? { background: 'linear-gradient(135deg, #D4AF37, #F0D060)', color: '#000' }
                        : { background: 'rgba(239,68,68,0.15)', color: '#FCA5A5', border: '1px solid rgba(239,68,68,0.35)' }
                    }
                  >
                    {enviando ? 'Registrando…' : confirmando === 'aceitar' ? 'Sim, aceitar' : 'Sim, recusar'}
                  </button>
                  <button
                    type="button"
                    disabled={enviando}
                    onClick={() => setConfirmando(null)}
                    className="px-4 py-3 rounded-xl text-sm text-gray-400"
                    style={{ border: '1px solid rgba(255,255,255,0.12)' }}
                  >
                    Voltar
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => setConfirmando('aceitar')}
                  className="flex-1 py-3.5 rounded-2xl text-sm font-bold flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg, #D4AF37, #F0D060)', color: '#000' }}
                >
                  <CheckCircle2 size={18} /> Aceitar dados
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmando('recusar')}
                  className="flex-1 py-3.5 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 text-gray-300"
                  style={{ border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.03)' }}
                >
                  <XCircle size={18} /> Recusar
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="relative z-10 text-center pb-10 px-6">
        <p className="text-[11px] text-gray-600">
          Marple · Confirmação formal de dados do caso · Sem necessidade de login
        </p>
      </footer>
    </div>
  )
}

function Campo({
  label,
  valor,
  destaque,
}: {
  label: string
  valor: string | null | undefined
  destaque?: boolean
}) {
  if (!valor) return null
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-0.5">{label}</div>
      <div
        className={destaque ? 'text-lg font-bold text-white' : 'text-sm text-gray-200'}
      >
        {valor}
      </div>
    </div>
  )
}

function PainelMensagem({
  icon,
  titulo,
  texto,
  extra,
}: {
  icon: ReactNode
  titulo: string
  texto: string
  extra?: string | null
}) {
  return (
    <div
      className="rounded-3xl p-8 text-center space-y-4"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <div className="flex justify-center">{icon}</div>
      <h1 className="text-xl font-bold text-white">{titulo}</h1>
      <p className="text-sm text-gray-400 leading-relaxed">{texto}</p>
      {extra && <p className="text-xs text-gray-500">{extra}</p>}
    </div>
  )
}
