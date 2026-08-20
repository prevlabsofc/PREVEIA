import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import { Scale, Mail, Phone, MapPin, Search } from 'lucide-react'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default async function DiretorioAdvogadosPage() {
  const { data: advogados } = await supabase
    .from('lawyers')
    .select('id, name, oab_number, oab_uf, specialty, office_name, city, state, logo_url, email, phone')
    .eq('status', 'active')
    .neq('role', 'super_admin')
    .order('name')

  return (
    <div className="min-h-screen" style={{ background: '#050505' }}>
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(212,175,55,0.08) 0%, transparent 60%)' }}/>

      {/* HEADER */}
      <div className="border-b px-8 py-4 flex items-center justify-between" style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(20px)' }}>
        <Link href="/" className="text-xl font-black">
          <span className="text-white">Mar</span><span style={{ color: '#D4AF37' }}>ple</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm text-gray-400 hover:text-white transition-colors">Entrar</Link>
          <Link href="/registro" className="px-4 py-2 rounded-xl text-sm font-bold transition-all hover:scale-105" style={{ background: 'linear-gradient(135deg, #D4AF37, #F0D060)', color: '#000' }}>
            Começar grátis
          </Link>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-12 relative z-10">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-black text-white mb-3">
            Encontre um <span style={{ color: '#D4AF37' }}>Advogado Previdenciarista</span>
          </h1>
          <p className="text-gray-400">Profissionais especializados em Direito Previdenciário que utilizam o Marple</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(advogados || []).map(adv => (
            <Link key={adv.id} href={`/advogado/${adv.oab_number}`}
              className="block p-5 rounded-2xl transition-all hover:scale-[1.02]"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(10px)' }}>
              <div className="flex items-start gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden" style={{ background: adv.logo_url ? '#fff' : 'linear-gradient(135deg, #D4AF37, #B8941F)' }}>
                  {adv.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={adv.logo_url} alt={adv.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
                  ) : (
                    <span className="text-black font-black text-sm">
                      {adv.name?.split(' ').map((w: string) => w[0]).slice(0,2).join('')}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-white truncate">{adv.name}</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(212,175,55,0.12)', color: '#D4AF37' }}>
                    OAB/{adv.oab_uf} {adv.oab_number}
                  </span>
                </div>
              </div>
              {adv.specialty && <p className="text-xs text-gray-400 mb-1">📚 {adv.specialty}</p>}
              {adv.office_name && <p className="text-xs text-gray-500 mb-1">🏛 {adv.office_name}</p>}
              {(adv.city || adv.state) && (
                <div className="flex items-center gap-1 text-[10px] text-gray-600">
                  <MapPin size={10}/> {[adv.city, adv.state].filter(Boolean).join(' — ')}
                </div>
              )}
              <div className="mt-3 pt-3 flex items-center justify-between" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <span className="text-[10px] text-gray-600">Ver perfil completo</span>
                <span style={{ color: '#D4AF37' }}>→</span>
              </div>
            </Link>
          ))}
        </div>

        {(!advogados || advogados.length === 0) && (
          <div className="text-center py-16">
            <Scale size={40} color="#333" className="mx-auto mb-3"/>
            <p className="text-gray-500">Nenhum advogado cadastrado ainda</p>
          </div>
        )}

        <div className="text-center mt-12 p-6 rounded-2xl" style={{ background: 'rgba(212,175,55,0.05)', border: '1px solid rgba(212,175,55,0.15)' }}>
          <p className="text-sm text-gray-400 mb-3">É advogado previdenciarista? Apareça neste diretório!</p>
          <Link href="/registro" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold" style={{ background: 'linear-gradient(135deg, #D4AF37, #F0D060)', color: '#000' }}>
            Criar conta grátis no Marple →
          </Link>
        </div>
      </div>
    </div>
  )
}