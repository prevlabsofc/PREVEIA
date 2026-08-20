'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, Check, ChevronRight, ChevronLeft, FileText } from 'lucide-react'
import Image from 'next/image'

const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

const UFs = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']

const TRFS = [
  '1ª Região (AC, AM, AP, BA, GO, MA, MT, MS, MG, PA, PI, RO, RR, TO, DF)',
  '2ª Região (ES, RJ)',
  '3ª Região (MS, SP)',
  '4ª Região (PR, RS, SC)',
  '5ª Região (AL, CE, PB, PE, RN, SE)',
  '6ª Região (MG)',
]

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [sigPreview, setSigPreview] = useState<string | null>(null)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [sigFile, setSigFile] = useState<File | null>(null)
  const [convidado, setConvidado] = useState(false)
  const [escritorio, setEscritorio] = useState<string | null>(null)
  const [inviteStatus, setInviteStatus] = useState<'idle' | 'processando' | 'ok' | 'erro'>('idle')
  const [inviteErro, setInviteErro] = useState<string | null>(null)

  useEffect(() => {
    async function carregarEscritorio() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const params = new URLSearchParams(window.location.search)
      const inviteToken = (params.get('invite') || '').trim()

      // Entrada via link de convite (usuário já autenticado, sem office_id)
      if (inviteToken) {
        setInviteStatus('processando')
        try {
          const { data: me } = await supabase.from('lawyers')
            .select('office_id, office_role').eq('id', user.id).maybeSingle()

          if (me?.office_id && me.office_id !== user.id) {
            // Já vinculado a outro escritório
            setConvidado(true)
            setInviteStatus('ok')
            const { data: dono } = await supabase.from('lawyers')
              .select('name, office_name').eq('id', me.office_id).maybeSingle()
            setEscritorio(dono?.office_name?.trim() || dono?.name?.trim() || null)
            return
          }

          const res = await fetch(`/api/validar-convite?codigo=${encodeURIComponent(inviteToken)}`)
          const d = await res.json()
          if (!d?.valido) {
            setInviteStatus('erro')
            setInviteErro('Este convite é inválido ou já foi utilizado.')
            return
          }

          const { data: invite } = await supabase
            .from('office_invites')
            .select('*')
            .eq('code', inviteToken)
            .eq('used', false)
            .maybeSingle()

          if (!invite) {
            setInviteStatus('erro')
            setInviteErro('Este convite é inválido ou já foi utilizado.')
            return
          }

          const { error: updErr } = await supabase.from('lawyers').update({
            office_id: invite.office_id,
            office_role: 'member',
          }).eq('id', user.id)

          if (updErr) {
            setInviteStatus('erro')
            setInviteErro('Não foi possível vincular você ao escritório. Tente novamente.')
            return
          }

          await supabase.from('office_invites').update({ used: true }).eq('id', invite.id)
          setConvidado(true)
          setEscritorio(d.escritorio || null)
          setInviteStatus('ok')
          // Limpa o token da URL sem recarregar
          window.history.replaceState({}, '', '/onboarding')
          return
        } catch {
          setInviteStatus('erro')
          setInviteErro('Falha ao processar o convite. Tente novamente.')
          return
        }
      }

      const { data: me } = await supabase.from('lawyers')
        .select('office_id, office_role').eq('id', user.id).maybeSingle()
      if (!me?.office_id || me.office_id === user.id || me.office_role === 'owner') return
      setConvidado(true)
      const { data: dono } = await supabase.from('lawyers')
        .select('name, office_name').eq('id', me.office_id).maybeSingle()
      setEscritorio(dono?.office_name?.trim() || dono?.name?.trim() || null)
    }
    carregarEscritorio()
  }, [])

  const [form, setForm] = useState({
    whatsapp: '', cidade: '', estado: 'MA',
    trf: '1ª Região (AC, AM, AP, BA, GO, MA, MT, MS, MG, PA, PI, RO, RR, TO, DF)',
    vara: '', juizo_digital: true, honorarios_pct: 30,
  })

  function set(field: string, value: any) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoFile(file)
    const reader = new FileReader()
    reader.onload = ev => setLogoPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  async function handleSigUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setSigFile(file)
    const reader = new FileReader()
    reader.onload = ev => setSigPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  async function handleFinish() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    let logo_url = null
    let signature_url = null

    if (logoFile) {
      const { data } = await supabase.storage.from('logos')
        .upload(`${user.id}/logo.${logoFile.name.split('.').pop()}`, logoFile, { upsert: true })
      if (data) {
        const { data: url } = supabase.storage.from('logos').getPublicUrl(data.path)
        logo_url = url.publicUrl
      }
    }

    if (sigFile) {
      const { data } = await supabase.storage.from('signatures')
        .upload(`${user.id}/assinatura.${sigFile.name.split('.').pop()}`, sigFile, { upsert: true })
      if (data) {
        const { data: url } = supabase.storage.from('signatures').getPublicUrl(data.path)
        signature_url = url.publicUrl
      }
    }

    await supabase.from('lawyers').update({
      whatsapp: form.whatsapp,
      cidade: form.cidade,
      estado: form.estado,
      trf_padrao: form.trf,
      vara_padrao: form.vara,
      honorarios_pct: form.honorarios_pct,
      logo_url,
      signature_url,
      onboarding_done: true,
    }).eq('id', user.id)

    router.push('/dashboard')
  }

  const inputStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(212,175,55,0.2)',
    borderRadius: 10,
    color: '#fff',
    width: '100%',
    height: 48,
    padding: '0 16px',
    fontSize: 14,
    outline: 'none',
  }

  const steps = [
    { n: 1, label: 'Contato' },
    { n: 2, label: 'Jurídico' },
    { n: 3, label: 'Identidade' },
    { n: 4, label: 'Confirmar' },
  ]

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden py-10"
      style={{ background: '#000' }}>

      {/* Glow */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse 60% 50% at 50% 30%, rgba(180,120,10,0.15) 0%, transparent 70%)'
      }} />

      <div className="relative z-10 w-full max-w-lg mx-4">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-2xl font-black mb-1">
            <span className="text-white">Mar</span>
            <span style={{ color: '#D4AF37' }}>ple</span>
          </div>
          <p style={{ color: '#666', fontSize: 13 }}>Configure seu perfil para começar</p>
          {convidado && (
            <div className="mt-4 p-3 rounded-xl text-center"
              style={{ background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.22)' }}>
              <div className="text-xs font-bold" style={{ color: '#D4AF37' }}>
                {escritorio ? `Você faz parte de ${escritorio}` : 'Você faz parte de um escritório'}
              </div>
              <div className="text-[11px] mt-1" style={{ color: '#999' }}>
                Sua conta já está incluída no plano do escritório.
              </div>
            </div>
          )}
          {inviteStatus === 'processando' && (
            <div className="mt-4 p-3 rounded-xl text-center"
              style={{ background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.15)' }}>
              <div className="text-xs" style={{ color: '#D4AF37' }}>Vinculando você ao escritório...</div>
            </div>
          )}
          {inviteStatus === 'erro' && inviteErro && (
            <div className="mt-4 p-3 rounded-xl text-center"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
              <div className="text-xs" style={{ color: '#EF4444' }}>{inviteErro}</div>
            </div>
          )}
        </div>

        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            {steps.map(({ n, label }) => (
              <div key={n} className="flex items-center gap-1.5">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                  style={{
                    background: step >= n ? '#D4AF37' : 'rgba(255,255,255,0.05)',
                    color: step >= n ? '#000' : '#555',
                    border: step >= n ? 'none' : '1px solid rgba(255,255,255,0.1)',
                  }}>
                  {step > n ? <Check size={12} /> : n}
                </div>
                <span className="text-xs hidden sm:block" style={{ color: step >= n ? '#D4AF37' : '#555' }}>
                  {label}
                </span>
              </div>
            ))}
          </div>
          <div className="w-full h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }}>
            <motion.div className="h-full rounded-full"
              style={{ background: 'linear-gradient(90deg,#D4AF37,#F0D060)' }}
              animate={{ width: `${(step / 4) * 100}%` }}
              transition={{ duration: 0.4 }} />
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: 'rgba(10,8,2,0.94)',
          border: '1px solid rgba(212,175,55,0.2)',
          borderRadius: 20,
          padding: '36px 40px',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 0 60px rgba(180,120,10,0.1)',
        }}>
          <AnimatePresence mode="wait">

            {/* PASSO 1 — Contato */}
            {step === 1 && (
              <motion.div key="step1"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h2 className="text-white text-xl font-bold mb-1">Dados de Contato</h2>
                <p className="text-xs mb-6" style={{ color: '#666' }}>
                  Aparecerão no cabeçalho de todas as suas petições
                </p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold tracking-widest mb-1.5"
                      style={{ color: 'rgba(212,175,55,0.7)' }}>WHATSAPP</label>
                    <input type="text" value={form.whatsapp} placeholder="(99) 9 9999-9999"
                      style={inputStyle}
                      onChange={e => set('whatsapp', e.target.value)}
                      onFocus={e => e.target.style.borderColor = 'rgba(212,175,55,0.5)'}
                      onBlur={e => e.target.style.borderColor = 'rgba(212,175,55,0.2)'} spellCheck={true} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold tracking-widest mb-1.5"
                        style={{ color: 'rgba(212,175,55,0.7)' }}>CIDADE</label>
                      <input type="text" value={form.cidade} placeholder="Lago da Pedra"
                        style={inputStyle}
                        onChange={e => set('cidade', e.target.value)}
                        onFocus={e => e.target.style.borderColor = 'rgba(212,175,55,0.5)'}
                        onBlur={e => e.target.style.borderColor = 'rgba(212,175,55,0.2)'} spellCheck={true} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold tracking-widest mb-1.5"
                        style={{ color: 'rgba(212,175,55,0.7)' }}>ESTADO</label>
                      <select value={form.estado} onChange={e => set('estado', e.target.value)}
                        style={{ ...inputStyle, cursor: 'pointer' }}>
                        {UFs.map(uf => (
                          <option key={uf} value={uf} style={{ background: '#111' }}>{uf}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* PASSO 2 — Jurídico */}
            {step === 2 && (
              <motion.div key="step2"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h2 className="text-white text-xl font-bold mb-1">Dados Jurídicos</h2>
                <p className="text-xs mb-6" style={{ color: '#666' }}>
                  Usados no destinatário e pedidos das petições
                </p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold tracking-widest mb-1.5"
                      style={{ color: 'rgba(212,175,55,0.7)' }}>TRF PADRÃO</label>
                    <select value={form.trf} onChange={e => set('trf', e.target.value)}
                      style={{ ...inputStyle, cursor: 'pointer', height: 'auto', padding: '12px 16px' }}>
                      {TRFS.map(t => (
                        <option key={t} value={t} style={{ background: '#111' }}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold tracking-widest mb-1.5"
                      style={{ color: 'rgba(212,175,55,0.7)' }}>VARA PADRÃO</label>
                    <input type="text" value={form.vara}
                      placeholder="1ª Vara do JEF de Lago da Pedra/MA"
                      style={inputStyle}
                      onChange={e => set('vara', e.target.value)}
                      onFocus={e => e.target.style.borderColor = 'rgba(212,175,55,0.5)'}
                      onBlur={e => e.target.style.borderColor = 'rgba(212,175,55,0.2)'} spellCheck={true} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold tracking-widest mb-1.5"
                      style={{ color: 'rgba(212,175,55,0.7)' }}>
                      HONORÁRIOS PADRÃO: {form.honorarios_pct}%
                    </label>
                    <input type="range" min={10} max={50} step={5}
                      value={form.honorarios_pct}
                      onChange={e => set('honorarios_pct', Number(e.target.value))}
                      className="w-full" style={{ accentColor: '#D4AF37' }} />
                    <div className="flex justify-between text-[10px] mt-1" style={{ color: '#555' }}>
                      <span>10%</span><span>30%</span><span>50%</span>
                    </div>
                    <p className="text-[10px] mt-2" style={{ color: '#555' }}>
                      Suas petições usarão {form.honorarios_pct}% de honorários automaticamente
                    </p>
                  </div>
                  <div>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <div onClick={() => set('juizo_digital', !form.juizo_digital)}
                        className="w-11 h-6 rounded-full transition-all relative"
                        style={{ background: form.juizo_digital ? '#D4AF37' : 'rgba(255,255,255,0.1)' }}>
                        <div className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all"
                          style={{ left: form.juizo_digital ? '24px' : '4px' }} />
                      </div>
                      <span className="text-sm text-white">Juízo 100% Digital</span>
                    </label>
                  </div>
                </div>
              </motion.div>
            )}

            {/* PASSO 3 — Identidade Visual */}
            {step === 3 && (
              <motion.div key="step3"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h2 className="text-white text-xl font-bold mb-1">Identidade Visual</h2>
                <p className="text-xs mb-6" style={{ color: '#666' }}>
                  Sua logo e assinatura aparecerão em TODAS as petições geradas
                </p>
                <div className="space-y-6">

                  {/* Upload Logo */}
                  <div>
                    <label className="block text-[10px] font-bold tracking-widest mb-2"
                      style={{ color: 'rgba(212,175,55,0.7)' }}>LOGO DO ESCRITÓRIO</label>
                    <label className="flex flex-col items-center justify-center cursor-pointer rounded-xl transition-all hover:border-yellow-500/50"
                      style={{
                        border: '1px dashed rgba(212,175,55,0.3)',
                        background: 'rgba(212,175,55,0.03)',
                        height: 120,
                      }}>
                      {logoPreview ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={logoPreview} alt="logo" className="h-20 object-contain rounded" />
                      ) : (
                        <div className="text-center">
                          <Upload size={24} color="rgba(212,175,55,0.4)" className="mx-auto mb-2" />
                          <p className="text-xs" style={{ color: '#555' }}>Clique para selecionar</p>
                          <p className="text-[10px] mt-1" style={{ color: '#444' }}>PNG, JPG, SVG — máx 5MB</p>
                        </div>
                      )}
                      <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                    </label>
                  </div>

                  {/* Upload Assinatura */}
                  <div>
                    <label className="block text-[10px] font-bold tracking-widest mb-2"
                      style={{ color: 'rgba(212,175,55,0.7)' }}>ASSINATURA DIGITAL</label>
                    <label className="flex flex-col items-center justify-center cursor-pointer rounded-xl transition-all hover:border-yellow-500/50"
                      style={{
                        border: '1px dashed rgba(212,175,55,0.3)',
                        background: 'rgba(212,175,55,0.03)',
                        height: 100,
                      }}>
                      {sigPreview ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={sigPreview} alt="assinatura" className="h-16 object-contain" />
                      ) : (
                        <div className="text-center">
                          <FileText size={20} color="rgba(212,175,55,0.4)" className="mx-auto mb-2" />
                          <p className="text-xs" style={{ color: '#555' }}>PNG fundo transparente recomendado</p>
                        </div>
                      )}
                      <input type="file" accept="image/*" className="hidden" onChange={handleSigUpload} />
                    </label>
                  </div>

                  <p className="text-[10px] text-center" style={{ color: '#444' }}>
                    Você pode pular e adicionar depois em Configurações
                  </p>
                </div>
              </motion.div>
            )}

            {/* PASSO 4 — Confirmação */}
            {step === 4 && (
              <motion.div key="step4"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h2 className="text-white text-xl font-bold mb-1">Tudo certo!</h2>
                <p className="text-xs mb-6" style={{ color: '#666' }}>
                  Confirme seu perfil antes de começar
                </p>

                {/* Preview do cabeçalho */}
                <div className="mb-6 p-4 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(212,175,55,0.15)' }}>
                  <p className="text-[10px] tracking-widest mb-3" style={{ color: 'rgba(212,175,55,0.6)' }}>
                    PREVIEW DO CABEÇALHO DA PETIÇÃO
                  </p>
                  <div className="flex items-start gap-3">
                    {logoPreview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={logoPreview} alt="logo" className="w-12 h-12 object-contain rounded" />
                    ) : (
                      <div className="w-12 h-12 rounded-lg flex items-center justify-center overflow-hidden relative"
                        style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.2)' }}>
                        <Image src="/logo.png" alt="Marple" width={32} height={32} className="object-contain" />
                      </div>
                    )}
                    <div>
                      <div className="text-sm font-bold text-white">Seu Escritório de Advocacia</div>
                      <div className="text-[11px] mt-0.5" style={{ color: '#888' }}>
                        OAB/{form.estado} · {form.cidade || 'Sua Cidade'}/{form.estado}
                      </div>
                      <div className="text-[10px] mt-0.5" style={{ color: '#666' }}>
                        {form.vara || '1ª Vara do JEF'}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 text-xs" style={{ color: '#666' }}>
                  {[
                    { label: 'TRF', value: form.trf.split(' ')[0] + ' ' + form.trf.split(' ')[1] },
                    { label: 'Honorários', value: `${form.honorarios_pct}%` },
                    { label: 'Juízo Digital', value: form.juizo_digital ? 'Sim' : 'Não' },
                    { label: 'WhatsApp', value: form.whatsapp || 'Não informado' },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between py-1.5 border-b"
                      style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                      <span>{label}</span>
                      <span className="text-white font-medium">{value}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navegação */}
          <div className="flex items-center justify-between mt-8">
            <button onClick={() => setStep(s => s - 1)} disabled={step === 1}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-30"
              style={{ border: '1px solid rgba(255,255,255,0.1)', color: '#888' }}>
              <ChevronLeft size={16} /> Voltar
            </button>

            {step < 4 ? (
              <button onClick={() => setStep(s => s + 1)}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-90"
                style={{ background: 'linear-gradient(135deg,#D4AF37,#F0D060)', color: '#000' }}>
                Próximo <ChevronRight size={16} />
              </button>
            ) : (
              <button onClick={handleFinish} disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-90"
                style={{ background: 'linear-gradient(135deg,#D4AF37,#F0D060)', color: '#000' }}>
                {saving ? 'Salvando...' : 'Ir para o Dashboard ✓'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
