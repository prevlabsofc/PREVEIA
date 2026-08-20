'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { motion } from 'framer-motion'
import {
  AlertTriangle,
  BarChart3,
  Clock,
  FileText,
  RefreshCw,
  Users,
  type LucideIcon,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { GlassCard } from '@/components/GlassCard'
import { StatCard } from '@/components/dashboard/StatCard'
import {
  calcularControladoria,
  formatarHoras,
  formatarPct,
  type ResumoControladoria,
} from '@/lib/controladoria-metrics'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

function useIsLight() {
  const [isLight, setIsLight] = useState(false)
  useEffect(() => {
    const check = () => setIsLight(document.documentElement.classList.contains('light'))
    check()
    const observer = new MutationObserver(check)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])
  return isLight
}

function BarraHorizontal({
  valor,
  max,
  color,
}: {
  valor: number
  max: number
  color: string
}) {
  const pct = max > 0 ? Math.min(100, (valor / max) * 100) : 0
  return (
    <div className="h-2 rounded-full overflow-hidden" style={{ background: `${color}22` }}>
      <div
        className="h-full rounded-full transition-[width] duration-500"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  )
}

function SecaoTitulo({
  titulo,
  subtitulo,
  isLight,
}: {
  titulo: string
  subtitulo: string
  isLight: boolean
}) {
  return (
    <div className="mb-3">
      <h2 className="text-base font-bold" style={{ color: isLight ? '#1E1E1E' : '#fff' }}>
        {titulo}
      </h2>
      <p className="text-[11px] mt-0.5 leading-relaxed" style={{ color: isLight ? '#6B6B6B' : '#888' }}>
        {subtitulo}
      </p>
    </div>
  )
}

const RESUMO_ZERADO = calcularControladoria([], [], [])

export function ControladoriaDashboard() {
  const isLight = useIsLight()
  const [loading, setLoading] = useState(true)
  const [aviso, setAviso] = useState<string | null>(null)
  const [resumo, setResumo] = useState<ResumoControladoria>(RESUMO_ZERADO)

  useEffect(() => {
    let cancelado = false

    async function load() {
      setLoading(true)
      setAviso(null)
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) {
          if (!cancelado) {
            setAviso('Sessão expirada. Faça login novamente.')
            setResumo(RESUMO_ZERADO)
          }
          return
        }

        const { data: me, error: meErr } = await supabase
          .from('lawyers')
          .select('id, office_id, name')
          .eq('id', user.id)
          .maybeSingle()

        if (meErr || !me) {
          console.error('[controladoria] lawyers:', meErr?.message)
          if (!cancelado) {
            setAviso('Não foi possível carregar o perfil. Exibindo métricas zeradas.')
            setResumo(RESUMO_ZERADO)
          }
          return
        }
        if (!me.office_id) {
          if (!cancelado) {
            setResumo(
              calcularControladoria([], [], [{ id: me.id, name: (me.name as string) || 'Você' }])
            )
          }
          return
        }

        let team: { id: string; name: string | null }[] = []
        const { data: teamData, error: teamErr } = await supabase
          .from('lawyers')
          .select('id, name')
          .eq('office_id', me.office_id)
          .order('name')

        if (teamErr) {
          console.error('[controladoria] team order:', teamErr.message)
          const { data: teamFallback, error: teamFallbackErr } = await supabase
            .from('lawyers')
            .select('id, name')
            .eq('office_id', me.office_id)
          if (teamFallbackErr) {
            console.error('[controladoria] team fallback:', teamFallbackErr.message)
            team = [{ id: me.id, name: (me.name as string) || 'Você' }]
            setAviso('Equipe indisponível. Exibindo métricas do seu usuário.')
          } else {
            team = (teamFallback as typeof team) || []
          }
        } else {
          team = (teamData as typeof team) || []
        }

        const membros = team.map((m) => ({
          id: m.id as string,
          name: (m.name as string) || null,
        }))
        const memberIds = membros.map((m) => m.id)
        if (memberIds.length === 0) {
          if (!cancelado) setResumo(calcularControladoria([], [], []))
          return
        }

        const [clientes, documentos] = await Promise.all([
          Promise.resolve(
            supabase
              .from('clients')
              .select(
                'id, nome, created_at, office_id, lawyer_id, tipo_beneficio, etapa_funil'
              )
              .in('lawyer_id', memberIds)
          )
            .then(({ data, error }) => {
              if (error) {
                console.error('[controladoria] clients:', error.message)
                return [] as any[]
              }
              return (data as any[]) || []
            })
            .catch((err) => {
              console.error('[controladoria] clients catch:', err)
              return [] as any[]
            }),
          Promise.resolve(
            supabase
              .from('documents')
              .select('id, lawyer_id, client_id, created_at')
              .in('lawyer_id', memberIds)
          )
            .then(({ data, error }) => {
              if (error) {
                console.error('[controladoria] documents:', error.message)
                return [] as any[]
              }
              return (data as any[]) || []
            })
            .catch((err) => {
              console.error('[controladoria] documents catch:', err)
              return [] as any[]
            }),
        ])

        if (cancelado) return

        if (clientes.length === 0 && documentos.length === 0) {
          setAviso((prev) => prev || 'Sem dados operacionais ou consultas indisponíveis.')
        } else if (documentos.length === 0) {
          setAviso((prev) => prev || 'Documentos indisponíveis. Petições exibidas como 0.')
        }

        setResumo(calcularControladoria(clientes, documentos, membros))
      } catch (err) {
        console.error('[controladoria] load:', err)
        if (!cancelado) {
          setAviso('Falha ao montar a controladoria. Exibindo métricas zeradas.')
          setResumo(RESUMO_ZERADO)
        }
      } finally {
        if (!cancelado) setLoading(false)
      }
    }

    load()
    return () => {
      cancelado = true
    }
  }, [])

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div
          className="w-8 h-8 rounded-full border-2 animate-spin"
          style={{ borderColor: '#D4AF37', borderTopColor: 'transparent' }}
        />
      </div>
    )
  }

  const maxPermanencia = Math.max(
    ...resumo.porEtapa.map((e) => e.permanenciaMediaHoras ?? 0),
    1
  )
  const maxRetrabalho = Math.max(...resumo.porEtapa.map((e) => e.taxaRetrabalhoPct ?? 0), 1)
  const maxDocsMembro = Math.max(...resumo.porMembro.map((m) => m.documentos), 1)

  const chartRetrabalho = resumo.porEtapa.map((e) => ({
    etapa: e.label.split('/')[0],
    taxa: e.taxaRetrabalhoPct ?? 0,
    fill: e.color,
  }))

  const chartPermanencia = resumo.porEtapa.map((e) => ({
    etapa: e.label.split('/')[0],
    horas: Math.round((e.permanenciaMediaHoras ?? 0) * 10) / 10,
    fill: e.color,
  }))

  // Sem dados: cards continuam visíveis com zeros (nunca página em branco).
  const stats: {
    icon: LucideIcon
    label: string
    value: string | number
    growth: string
    color: string
    growthColor?: string
  }[] = [
    {
      icon: Users,
      label: 'Clientes no funil',
      value: resumo.totalClientes,
      growth: 'Ativos do escritório',
      color: '#3B82F6',
    },
    {
      icon: FileText,
      label: 'Petições geradas',
      value: resumo.totalDocumentos,
      growth: 'Total do escritório',
      color: '#D4AF37',
    },
    {
      icon: RefreshCw,
      label: 'Retrabalho geral',
      value: formatarPct(resumo.taxaRetrabalhoGeralPct ?? 0),
      growth: 'Clientes com 2+ petições',
      color: '#F59E0B',
      growthColor: '#F59E0B',
    },
    {
      icon: Clock,
      label: 'Permanência média',
      value: resumo.permanenciaMediaGeralHoras == null ? '0 h' : formatarHoras(resumo.permanenciaMediaGeralHoras),
      growth: 'Casos abertos (≠ concluído)',
      color: '#A855F7',
    },
  ]

  const tooltipStyle = {
    background: isLight ? '#fff' : 'rgba(20,18,10,0.95)',
    border: '1px solid rgba(212,175,55,0.3)',
    borderRadius: 12,
    color: isLight ? '#1E1E1E' : '#fff',
    fontSize: 12,
  }

  return (
    <div className="max-w-[1100px] mx-auto px-4 pb-8">
      <Cabecalho isLight={isLight} />

      {aviso ? (
        <div
          className="mb-4 flex items-start gap-2 rounded-xl px-3 py-2.5 text-sm"
          style={{
            background: 'rgba(245,158,11,0.12)',
            border: '1px solid rgba(245,158,11,0.35)',
            color: isLight ? '#92400E' : '#FBBF24',
          }}
        >
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span>{aviso}</span>
        </div>
      ) : null}

      {resumo.totalClientes === 0 && resumo.totalDocumentos === 0 ? (
        <GlassCard intensity={1.05} style={{ padding: 16, marginBottom: 16 }}>
          <div className="flex items-center gap-3">
            <BarChart3 size={22} color="#D4AF37" className="shrink-0 opacity-80" />
            <p className="text-sm" style={{ color: isLight ? '#6B6B6B' : '#888' }}>
              Sem dados operacionais ainda — cards abaixo em{' '}
              <span className="font-semibold" style={{ color: isLight ? '#1E1E1E' : '#fff' }}>
                0 / 0% / R$ 0,00
              </span>
              . Cadastre clientes e gere petições para popular as métricas.
            </p>
          </div>
        </GlassCard>
      ) : null}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {stats.map((s, i) => (
          <StatCard
            key={s.label}
            icon={s.icon}
            label={s.label}
            value={s.value}
            growth={s.growth}
            color={s.color}
            growthColor={s.growthColor}
            index={i}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <GlassCard intensity={1.1} style={{ padding: 18 }}>
            <SecaoTitulo
              isLight={isLight}
              titulo="Retrabalho por etapa"
              subtitulo="Proxy de “taxa de erro”: % de clientes na etapa com 2 ou mais petições geradas (documents). Não há log de falha de geração por etapa."
            />
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartRetrabalho} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isLight ? '#EDEDED' : '#222'} />
                  <XAxis dataKey="etapa" tick={{ fontSize: 10, fill: '#888' }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#888' }}
                    axisLine={false}
                    tickLine={false}
                    unit="%"
                    domain={[0, Math.max(maxRetrabalho, 10)]}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(v: number) => [`${v}%`, 'Retrabalho']}
                  />
                  <Bar dataKey="taxa" radius={[6, 6, 0, 0]} maxBarSize={36}>
                    {chartRetrabalho.map((e) => (
                      <Cell key={e.etapa} fill={e.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <ul className="mt-3 space-y-2">
              {resumo.porEtapa.map((e) => (
                <li key={e.stage} className="flex items-center justify-between gap-3 text-xs">
                  <span style={{ color: isLight ? '#4F4F4F' : '#bbb' }}>
                    {e.label}
                    <span className="ml-1 opacity-60">({e.clientes})</span>
                  </span>
                  <span className="font-semibold tabular-nums" style={{ color: e.color }}>
                    {formatarPct(e.taxaRetrabalhoPct ?? 0)}
                    {e.comRetrabalho > 0 ? (
                      <span className="ml-1 font-normal opacity-70">· {e.comRetrabalho} c/ retrabalho</span>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          </GlassCard>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <GlassCard intensity={1.1} style={{ padding: 18 }}>
            <SecaoTitulo
              isLight={isLight}
              titulo="Permanência média por etapa"
              subtitulo="Horas desde clients.updated_at (ou created_at) na etapa atual. Proxy de tempo de resposta — não há histórico de mudança de etapa."
            />
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartPermanencia} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isLight ? '#EDEDED' : '#222'} />
                  <XAxis dataKey="etapa" tick={{ fontSize: 10, fill: '#888' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#888' }} axisLine={false} tickLine={false} unit="h" />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(v: number) => [formatarHoras(v), 'Permanência']}
                  />
                  <Bar dataKey="horas" radius={[6, 6, 0, 0]} maxBarSize={36}>
                    {chartPermanencia.map((e) => (
                      <Cell key={e.etapa} fill={e.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <ul className="mt-3 space-y-2.5">
              {resumo.porEtapa.map((e) => (
                <li key={e.stage}>
                  <div className="flex items-center justify-between gap-2 text-xs mb-1">
                    <span style={{ color: isLight ? '#4F4F4F' : '#bbb' }}>{e.label}</span>
                    <span className="font-semibold tabular-nums" style={{ color: e.color }}>
                      {e.permanenciaMediaHoras == null ? '0 h' : formatarHoras(e.permanenciaMediaHoras)}
                    </span>
                  </div>
                  <BarraHorizontal
                    valor={e.permanenciaMediaHoras ?? 0}
                    max={maxPermanencia}
                    color={e.color}
                  />
                </li>
              ))}
            </ul>
          </GlassCard>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="mb-6"
      >
        <GlassCard intensity={1.1} style={{ padding: 18 }}>
          <SecaoTitulo
            isLight={isLight}
            titulo="Gargalos do funil"
            subtitulo="Etapas abertas com maior permanência média — casos parados há mais tempo desde a última atualização."
          />
          {resumo.gargalos.length === 0 ? (
            <p className="text-sm py-6 text-center" style={{ color: isLight ? '#6B6B6B' : '#888' }}>
              Nenhum gargalo detectado (sem casos abertos com data de atualização).
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {resumo.gargalos.map((g, i) => (
                <div
                  key={g.stage}
                  className="rounded-2xl p-3"
                  style={{
                    background: `rgba(${g.rgb},0.08)`,
                    border: `1px solid rgba(${g.rgb},0.25)`,
                  }}
                >
                  <div className="text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: g.color }}>
                    #{i + 1} gargalo
                  </div>
                  <div className="text-sm font-semibold mb-1" style={{ color: isLight ? '#1E1E1E' : '#fff' }}>
                    {g.label}
                  </div>
                  <div className="text-lg font-black tabular-nums" style={{ color: g.color }}>
                    {formatarHoras(g.permanenciaMediaHoras)}
                  </div>
                  <div className="text-[10px] mt-1" style={{ color: isLight ? '#6B6B6B' : '#888' }}>
                    {g.clientes} cliente{g.clientes === 1 ? '' : 's'} · retrabalho {formatarPct(g.taxaRetrabalhoPct)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <GlassCard intensity={1.1} style={{ padding: 18 }}>
          <SecaoTitulo
            isLight={isLight}
            titulo="Desempenho da equipe"
            subtitulo="Petições por documents.lawyer_id; clientes pelo responsável (assigned_lawyer_id ou lawyer_id)."
          />
          {resumo.porMembro.length === 0 ? (
            <p className="text-sm py-6 text-center" style={{ color: isLight ? '#6B6B6B' : '#888' }}>
              Nenhum membro no escritório.
            </p>
          ) : (
            <div className="overflow-x-auto -mx-1">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead>
                  <tr
                    className="text-[10px] uppercase tracking-wide"
                    style={{ color: isLight ? '#8A8A8A' : '#666' }}
                  >
                    <th className="font-semibold pb-2 pl-1">Membro</th>
                    <th className="font-semibold pb-2 text-right">Petições</th>
                    <th className="font-semibold pb-2 text-right">Clientes</th>
                    <th className="font-semibold pb-2 text-right">Retrabalho</th>
                    <th className="font-semibold pb-2 text-right pr-1">Permanência</th>
                  </tr>
                </thead>
                <tbody>
                  {resumo.porMembro.map((m) => (
                    <tr
                      key={m.id}
                      className="border-t"
                      style={{ borderColor: isLight ? '#F0F0F0' : 'rgba(255,255,255,0.06)' }}
                    >
                      <td className="py-3 pl-1">
                        <div className="font-medium" style={{ color: isLight ? '#1E1E1E' : '#fff' }}>
                          {m.nome}
                        </div>
                        <div className="mt-1.5 max-w-[180px]">
                          <BarraHorizontal valor={m.documentos} max={maxDocsMembro} color="#D4AF37" />
                        </div>
                      </td>
                      <td className="py-3 text-right tabular-nums font-semibold" style={{ color: '#D4AF37' }}>
                        {m.documentos}
                      </td>
                      <td className="py-3 text-right tabular-nums" style={{ color: isLight ? '#4F4F4F' : '#bbb' }}>
                        {m.clientes}
                      </td>
                      <td className="py-3 text-right tabular-nums" style={{ color: '#F59E0B' }}>
                        {formatarPct(m.taxaRetrabalhoPct ?? 0)}
                      </td>
                      <td
                        className="py-3 text-right tabular-nums pr-1"
                        style={{ color: isLight ? '#4F4F4F' : '#bbb' }}
                      >
                        {m.permanenciaMediaHoras == null ? '0 h' : formatarHoras(m.permanenciaMediaHoras)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </GlassCard>
      </motion.div>
    </div>
  )
}

function Cabecalho({ isLight }: { isLight: boolean }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-5">
      <h1 className="text-2xl sm:text-3xl font-black" style={{ color: isLight ? '#1E1E1E' : '#fff' }}>
        Controladoria
      </h1>
      <p className="text-sm mt-1 max-w-2xl" style={{ color: isLight ? '#5E5E5E' : '#9ca3af' }}>
        Métricas do funil do escritório com base em etapas, petições e timestamps já existentes.
        Indicadores de “erro” e “tempo de resposta” são proxies explícitos — não há telemetria dedicada.
      </p>
    </motion.div>
  )
}
