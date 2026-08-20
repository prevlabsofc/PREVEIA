'use client'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { MapPin, Search, Building2, X, Scale, Phone, Clock } from 'lucide-react'
import { GlassCard } from '@/components/GlassCard'

interface Secao { uf: string; nome: string; varas: number; capital: string; tel: string }

const secoes: Secao[] = [
  { uf: 'AC', nome: 'Seção Judiciária do Acre', varas: 8, capital: 'Rio Branco', tel: '(68) 3216-4500' },
  { uf: 'AL', nome: 'Seção Judiciária de Alagoas', varas: 12, capital: 'Maceió', tel: '(82) 2122-4200' },
  { uf: 'AM', nome: 'Seção Judiciária do Amazonas', varas: 14, capital: 'Manaus', tel: '(92) 3612-3800' },
  { uf: 'BA', nome: 'Seção Judiciária da Bahia', varas: 32, capital: 'Salvador', tel: '(71) 3617-2200' },
  { uf: 'CE', nome: 'Seção Judiciária do Ceará', varas: 24, capital: 'Fortaleza', tel: '(85) 3251-7100' },
  { uf: 'DF', nome: 'Seção Judiciária do Distrito Federal', varas: 22, capital: 'Brasília', tel: '(61) 3221-4000' },
  { uf: 'ES', nome: 'Seção Judiciária do Espírito Santo', varas: 16, capital: 'Vitória', tel: '(27) 3183-5000' },
  { uf: 'GO', nome: 'Seção Judiciária de Goiás', varas: 20, capital: 'Goiânia', tel: '(62) 3612-6200' },
  { uf: 'MA', nome: 'Seção Judiciária do Maranhão', varas: 18, capital: 'São Luís', tel: '(98) 3214-5400' },
  { uf: 'MG', nome: 'Seção Judiciária de Minas Gerais', varas: 48, capital: 'Belo Horizonte', tel: '(31) 3501-1300' },
  { uf: 'MT', nome: 'Seção Judiciária de Mato Grosso', varas: 14, capital: 'Cuiabá', tel: '(65) 3648-6000' },
  { uf: 'MS', nome: 'Seção Judiciária de Mato Grosso do Sul', varas: 12, capital: 'Campo Grande', tel: '(67) 3312-1400' },
  { uf: 'PA', nome: 'Seção Judiciária do Pará', varas: 18, capital: 'Belém', tel: '(91) 3299-8000' },
  { uf: 'PB', nome: 'Seção Judiciária da Paraíba', varas: 14, capital: 'João Pessoa', tel: '(83) 2108-4000' },
  { uf: 'PR', nome: 'Seção Judiciária do Paraná', varas: 38, capital: 'Curitiba', tel: '(41) 3210-1500' },
  { uf: 'PE', nome: 'Seção Judiciária de Pernambuco', varas: 26, capital: 'Recife', tel: '(81) 3425-9000' },
  { uf: 'PI', nome: 'Seção Judiciária do Piauí', varas: 10, capital: 'Teresina', tel: '(86) 2107-2200' },
  { uf: 'RJ', nome: 'Seção Judiciária do Rio de Janeiro', varas: 52, capital: 'Rio de Janeiro', tel: '(21) 3218-9000' },
  { uf: 'RN', nome: 'Seção Judiciária do Rio Grande do Norte', varas: 12, capital: 'Natal', tel: '(84) 4005-7000' },
  { uf: 'RS', nome: 'Seção Judiciária do Rio Grande do Sul', varas: 44, capital: 'Porto Alegre', tel: '(51) 3214-9000' },
  { uf: 'RO', nome: 'Seção Judiciária de Rondônia', varas: 10, capital: 'Porto Velho', tel: '(69) 3217-8000' },
  { uf: 'RR', nome: 'Seção Judiciária de Roraima', varas: 6, capital: 'Boa Vista', tel: '(95) 2121-4200' },
  { uf: 'SC', nome: 'Seção Judiciária de Santa Catarina', varas: 30, capital: 'Florianópolis', tel: '(48) 3251-2700' },
  { uf: 'SP', nome: 'Seção Judiciária de São Paulo', varas: 90, capital: 'São Paulo', tel: '(11) 3012-1000' },
  { uf: 'SE', nome: 'Seção Judiciária de Sergipe', varas: 8, capital: 'Aracaju', tel: '(79) 3216-4400' },
  { uf: 'TO', nome: 'Seção Judiciária do Tocantins', varas: 8, capital: 'Palmas', tel: '(63) 3218-3700' },
]

export default function JurisdicaoPage() {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Secao | null>(null)

  const [isLight, setIsLight] = useState(false)
  useEffect(() => {
    const check = () => setIsLight(document.documentElement.classList.contains('light'))
    check()
    const observer = new MutationObserver(check)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  const filtered = secoes.filter(s => s.nome.toLowerCase().includes(search.toLowerCase()) || s.uf.toLowerCase().includes(search.toLowerCase()) || s.capital.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="p-8 max-w-6xl mx-auto" style={{ background: isLight ? '#F8F8F8' : 'transparent' }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="text-3xl font-black mb-1">Administração de <span className="text-gradient-gold">Jurisdição</span></h1>
        <p className="" style={{ color: isLight ? '#5E5E5E' : undefined }}>Seções judiciárias federais por estado — clique para ver detalhes</p>
      </motion.div>

      <div className="relative mb-6 max-w-md">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: '#666' }}/>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por estado ou capital..." className="input-glass w-full pl-11 pr-4 text-sm" style={{ height: 48 }} spellCheck={true} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((s, i) => (
          <motion.div key={s.uf} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}>
            <GlassCard intensity={1} onClick={() => setSelected(s)} style={{ padding: 18, cursor: 'pointer' }}>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm" style={{ background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.25)', color: '#D4AF37' }}>
                  {s.uf}
                </div>
                <Building2 size={16} color="#555"/>
              </div>
              <div className="text-sm font-medium mb-1 leading-tight" style={{ color: isLight ? '#1E1E1E' : '#fff' }}>{s.nome}</div>
              <div className="text-xs flex items-center gap-1" style={{ color: isLight ? '#5E5E5E' : undefined }}>
                <MapPin size={11}/> {s.varas} varas federais
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </div>
      {filtered.length === 0 && <div className="text-center py-10 text-sm" style={{ color: isLight ? '#5E5E5E' : undefined }}>Nenhuma seção encontrada</div>}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }} onClick={() => setSelected(null)}>
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-lg rounded-2xl p-8" style={{ background: '#0A0A0A', border: '1px solid rgba(212,175,55,0.2)' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center font-black text-lg" style={{ background: 'rgba(212,175,55,0.15)', border: '1px solid rgba(212,175,55,0.3)', color: '#D4AF37' }}>{selected.uf}</div>
                <div>
                  <h2 className="text-lg font-bold leading-tight" style={{ color: isLight ? '#1E1E1E' : '#fff' }}>{selected.nome}</h2>
                  <p className="text-xs" style={{ color: isLight ? '#5E5E5E' : undefined }}>{selected.capital}</p>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="hover:text-white" style={{ color: isLight ? '#5E5E5E' : undefined }}><X size={20}/></button>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)' }}>
                <Scale size={16} color="#D4AF37"/>
                <span className="text-sm text-gray-300">{selected.varas} varas federais</span>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)' }}>
                <MapPin size={16} color="#D4AF37"/>
                <span className="text-sm text-gray-300">Capital: {selected.capital}</span>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)' }}>
                <Phone size={16} color="#D4AF37"/>
                <span className="text-sm text-gray-300">{selected.tel}</span>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)' }}>
                <Clock size={16} color="#D4AF37"/>
                <span className="text-sm text-gray-300">Atendimento: 9h às 18h</span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}