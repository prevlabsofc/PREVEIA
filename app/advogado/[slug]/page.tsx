import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Scale, Mail, Phone, MapPin, Star, FileText, Users } from 'lucide-react'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default async function PerfilAdvogadoPage({ params }: { params: { slug: string } }) {
  const { data: lawyer } = await supabase
    .from('lawyers')
    .select('*')
    .eq('oab_number', params.slug)
    .single()

  if (!lawyer) notFound()

  const { count: totalDocs } = await supabase
    .from('documents')
    .select('*', { count: 'exact', head: true })
    .eq('lawyer_id', lawyer.id)

  const { count: totalClientes } = await supabase
    .from('clients')
    .select('*', { count: 'exact', head: true })
    .eq('lawyer_id', lawyer.id)

  const { data: artigos } = await supabase
    .from('artigos')
    .select('id, titulo, categoria, created_at, conteudo, destino_publicacao')
    .eq('lawyer_id', lawyer.id)
    .eq('publicado', true)
    .order('created_at', { ascending: false })
    .limit(20)

  const artigosPortal = (artigos || []).filter(a => {
    const d = (a as { destino_publicacao?: string | null }).destino_publicacao
    return !d || d === 'portal_cliente'
  }).slice(0, 12)

  return (
    <div className="min-h-screen" style={{ background: '#050505' }}>
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(212,175,55,0.08) 0%, transparent 60%)' }}/>

      {/* HEADER */}
      <div className="border-b px-8 py-4 flex items-center justify-between" style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(20px)' }}>
        <Link href="/" className="text-xl font-black">
          <span className="text-white">Mar</span><span style={{ color: '#D4AF37' }}>ple</span>
        </Link>
        <span className="text-xs text-gray-500">Plataforma Jurídica com IA</span>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-12 relative z-10">
        {/* CARD PRINCIPAL */}
        <div className="rounded-3xl p-8 mb-6" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(212,175,55,0.2)', backdropFilter: 'blur(20px)' }}>
          <div className="flex items-start gap-6 mb-6">
            <div className="w-24 h-24 rounded-2xl flex items-center justify-center flex-shrink-0 overflow-hidden" style={{ background: lawyer.logo_url ? '#fff' : 'linear-gradient(135deg, #D4AF37, #B8941F)' }}>
              {lawyer.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={lawyer.logo_url} alt={lawyer.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
              ) : (
                <span className="text-3xl font-black text-black">
                  {lawyer.name?.split(' ').map((w: string) => w[0]).slice(0,2).join('')}
                </span>
              )}
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-black text-white mb-1">{lawyer.name}</h1>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-bold px-3 py-1 rounded-full" style={{ background: 'rgba(212,175,55,0.12)', color: '#D4AF37' }}>
                  OAB/{lawyer.oab_uf} nº {lawyer.oab_number}
                </span>
              </div>
              {lawyer.specialty && (
                <p className="text-sm text-gray-400">📚 {lawyer.specialty}</p>
              )}
              {lawyer.office_name && (
                <p className="text-sm text-gray-400">🏛 {lawyer.office_name}</p>
              )}
            </div>
          </div>

          {/* STATS */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[
              { label: 'Petições geradas', value: totalDocs || 0, icon: FileText, color: '#D4AF37' },
              { label: 'Clientes atendidos', value: totalClientes || 0, icon: Users, color: '#3B82F6' },
              { label: 'Especialidade', value: 'Previdenciário', icon: Scale, color: '#22C55E' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="text-center p-4 rounded-2xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <Icon size={20} color={color} className="mx-auto mb-2"/>
                <div className="text-xl font-black text-white">{value}</div>
                <div className="text-[10px] text-gray-500">{label}</div>
              </div>
            ))}
          </div>

          {/* CONTATO */}
          <div className="space-y-3">
            <h3 className="font-bold text-white mb-3">Entre em contato</h3>
            {lawyer.email && (
              <a href={`mailto:${lawyer.email}`} className="flex items-center gap-3 p-3 rounded-xl transition-all hover:bg-white/5" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
                <Mail size={18} color="#D4AF37"/>
                <span className="text-sm text-gray-300">{lawyer.email}</span>
              </a>
            )}
            {lawyer.phone && (
              <a href={`https://wa.me/55${lawyer.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-xl transition-all hover:bg-white/5" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
                <Phone size={18} color="#D4AF37"/>
                <span className="text-sm text-gray-300">{lawyer.phone}</span>
                <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(34,197,94,0.12)', color: '#22C55E' }}>WhatsApp</span>
              </a>
            )}
            {(lawyer.city || lawyer.state) && (
              <div className="flex items-center gap-3 p-3 rounded-xl" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
                <MapPin size={18} color="#D4AF37"/>
                <span className="text-sm text-gray-300">{[lawyer.city, lawyer.state].filter(Boolean).join(' — ')}</span>
              </div>
            )}
          </div>
        </div>

        {artigosPortal.length > 0 && (
          <div className="rounded-3xl p-8 mb-6" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <h2 className="text-lg font-bold text-white mb-4">Artigos publicados</h2>
            <div className="space-y-3">
              {artigosPortal.map(a => (
                <article key={a.id} className="p-4 rounded-2xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(212,175,55,0.12)', color: '#D4AF37' }}>{a.categoria}</span>
                    <span className="text-[10px] text-gray-600">{new Date(a.created_at).toLocaleDateString('pt-BR')}</span>
                  </div>
                  <h3 className="text-sm font-bold text-white mb-1">{a.titulo}</h3>
                  <p className="text-xs text-gray-500 line-clamp-2">{(a.conteudo || '').slice(0, 160)}{(a.conteudo || '').length > 160 ? '…' : ''}</p>
                </article>
              ))}
            </div>
          </div>
        )}

        {/* SOBRE O MARPLE */}
        <div className="text-center p-6 rounded-2xl" style={{ background: 'rgba(212,175,55,0.05)', border: '1px solid rgba(212,175,55,0.15)' }}>
          <p className="text-sm text-gray-400 mb-3">Este advogado utiliza o <strong className="text-white">Marple</strong> — plataforma de inteligência jurídica com IA</p>
          <Link href="/registro" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all hover:scale-105" style={{ background: 'linear-gradient(135deg, #D4AF37, #F0D060)', color: '#000' }}>
            Conhecer o Marple →
          </Link>
        </div>
      </div>
    </div>
  )
}