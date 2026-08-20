'use client'
import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { createBrowserClient } from '@supabase/ssr'
import { motion } from 'framer-motion'
import { User, Briefcase, Building2, PenTool, Percent, Lock, Upload, Check, Loader2, Settings, Image as ImageIcon, LayoutGrid, CreditCard, Bell, Link2, Unlink } from 'lucide-react'
import { GlassCard } from '@/components/GlassCard'
import { ModulosEscritorio } from '@/components/configuracoes/ModulosEscritorio'
import { GoogleIcon } from '@/components/auth/GoogleSignInButton'
import { UFS_BRASIL } from '@/lib/estados-brasil'
import { DIAS_ALERTA_SEM_CONTATO_PADRAO } from '@/lib/registrar-contato'
import {
  linkGoogleAccount,
  mensagemErroGoogleOAuth,
} from '@/lib/auth/google-oauth'
import type { UserIdentity } from '@supabase/supabase-js'

const PLANO_NOMES: Record<string, string> = {
  trial: 'Trial',
  starter: 'Autônomo',
  plus: 'Pequeno',
  premium: 'Médio',
  enterprise: 'Enterprise',
}

const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

// Lista canônica reaproveitada de lib/estados-brasil.ts (também usada nos
// seletores de UF do formulário de clientes).
const UFS = UFS_BRASIL

export default function ConfiguracoesPage() {
  const [me, setMe] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('pessoal')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [form, setForm] = useState<any>({})
  const [corPeticao, setCorPeticao] = useState('#1d4ed8')
  const [newPwd, setNewPwd] = useState('')
  const [currentPwd, setCurrentPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [pwdMsg, setPwdMsg] = useState('')
  const [googleLinked, setGoogleLinked] = useState(false)
  const [googleIdentity, setGoogleIdentity] = useState<UserIdentity | null>(null)
  const [googleBusy, setGoogleBusy] = useState(false)
  const [googleMsg, setGoogleMsg] = useState('')
  const [hasPasswordProvider, setHasPasswordProvider] = useState(true)
  const logoRef = useRef<HTMLInputElement>(null)
  const bannerRef = useRef<HTMLInputElement>(null)
  const signRef = useRef<HTMLInputElement>(null)

  const [isLight, setIsLight] = useState(false)
  useEffect(() => {
    const check = () => setIsLight(document.documentElement.classList.contains('light'))
    check()
    const observer = new MutationObserver(check)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])


  useEffect(() => {
    async function load() {
      const params = new URLSearchParams(window.location.search)
      const tabParam = params.get('tab')
      if (tabParam) setTab(tabParam)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('lawyers').select('*').eq('id', user.id).single()
      setMe(data)
      setForm({
        ...(data || {}),
        cor_peticao: data?.cor_peticao || '#1d4ed8',
        estilo_peticao: data?.estilo_peticao === 'classico' ? 'classico' : 'moderno',
        cidade: data?.cidade || '',
        estado: data?.estado || data?.oab_uf || 'SP',
      })
      setCorPeticao(data?.cor_peticao || '#1d4ed8')

      const identities = user.identities || []
      const g = identities.find((i) => i.provider === 'google') || null
      setGoogleIdentity(g)
      setGoogleLinked(!!g)
      setHasPasswordProvider(identities.some((i) => i.provider === 'email'))
      setLoading(false)
    }
    load()
  }, [])

  async function vincularGoogle() {
    setGoogleMsg('')
    setGoogleBusy(true)
    // Client ID/Secret: configurar no painel Supabase (Auth → Providers → Google) pelo admin.
    const { error } = await linkGoogleAccount(supabase)
    if (error) {
      setGoogleMsg(mensagemErroGoogleOAuth(error))
      setGoogleBusy(false)
    }
    // Sucesso: redireciona para o Google.
  }

  async function desvincularGoogle() {
    setGoogleMsg('')
    if (!googleIdentity) return
    if (!hasPasswordProvider) {
      setGoogleMsg('Não é possível desvincular o Google: esta é a única forma de acesso. Defina uma senha antes.')
      return
    }
    if (!confirm('Desvincular a conta Google? Você continuará entrando com email e senha.')) return
    setGoogleBusy(true)
    const { error } = await supabase.auth.unlinkIdentity(googleIdentity)
    if (error) {
      setGoogleMsg(error.message || 'Não foi possível desvincular o Google.')
      setGoogleBusy(false)
      return
    }
    setGoogleLinked(false)
    setGoogleIdentity(null)
    setGoogleMsg('Conta Google desvinculada.')
    setGoogleBusy(false)
  }

  function set(k: string, v: any) { setForm((f: any) => ({ ...f, [k]: v })) }

  async function salvar() {
    if (!me) return
    setSaving(true)
    const { id, email, role, created_at, ...updatable } = form
    await supabase.from('lawyers').update(updatable).eq('id', me.id)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function uploadFile(e: React.ChangeEvent<HTMLInputElement>, bucket: string, field: string) {
    const file = e.target.files?.[0]
    if (!file || !me) return
    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `${me.id}/${field}.${ext}`
    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true })
    if (error) { setUploading(false); alert('Erro: ' + error.message); return }
    const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path)
    const url = `${pub.publicUrl}?t=${Date.now()}`
    set(field, url)
    await supabase.from('lawyers').update({ [field]: url }).eq('id', me.id)
    setUploading(false)
  }

  async function trocarSenha() {
    setPwdMsg('')
    if (!currentPwd) { setPwdMsg('Digite sua senha atual.'); return }
    if (newPwd.length < 8) { setPwdMsg('A nova senha deve ter no mínimo 8 caracteres.'); return }
    if (newPwd !== confirmPwd) { setPwdMsg('As senhas novas não coincidem.'); return }
    // Valida a senha atual tentando reautenticar
    const { error: signErr } = await supabase.auth.signInWithPassword({ email: me.email, password: currentPwd })
    if (signErr) { setPwdMsg('Senha atual incorreta.'); return }
    const { error } = await supabase.auth.updateUser({ password: newPwd })
    if (error) { setPwdMsg('Erro: ' + error.message); return }
    setPwdMsg('Senha alterada com sucesso!')
    setCurrentPwd(''); setNewPwd(''); setConfirmPwd('')
  }

  async function excluirConta() {
    const confirmacao = prompt('Para confirmar a exclusão, digite "EXCLUIR MINHA CONTA":')
    if (confirmacao !== 'EXCLUIR MINHA CONTA') { alert('Confirmação incorreta. Conta não excluída.'); return }
    if (!me) return
    await supabase.from('documents').delete().eq('lawyer_id', me.id)
    await supabase.from('clients').delete().eq('lawyer_id', me.id)
    await supabase.from('notifications').delete().eq('lawyer_id', me.id)
    await supabase.from('ia_conversations').delete().eq('lawyer_id', me.id)
    await supabase.from('lawyers').delete().eq('id', me.id)
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  if (loading) return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: '#D4AF37', borderTopColor: 'transparent' }}/>
    </div>
  )

  const tabs = [
    { id: 'pessoal', label: 'Dados Pessoais', icon: User },
    { id: 'profissional', label: 'Profissional', icon: Briefcase },
    { id: 'escritorio', label: 'Escritório', icon: Building2 },
    { id: 'modulos', label: 'Módulos', icon: LayoutGrid },
    { id: 'assinatura', label: 'Assinatura Digital', icon: PenTool },
    { id: 'honorarios', label: 'Honorários', icon: Percent },
    { id: 'plano', label: 'Plano', icon: CreditCard },
    { id: 'seguranca', label: 'Segurança', icon: Lock },
  ]

  const inputCls = "input-glass w-full px-4 text-sm"
  const labelCls = "block text-xs font-medium mb-1.5"

  const planoAtualId = (me?.plan || 'trial').toString().toLowerCase()
  const planoAtualNome = PLANO_NOMES[planoAtualId] || planoAtualId
  const docsUsed = me?.docs_trial_used || 0
  const docsLimit = me?.docs_limit || 5
  const docsPercent = docsLimit ? Math.min((docsUsed / docsLimit) * 100, 100) : 0

  return (
    <div className="p-8 max-w-4xl mx-auto" style={{ background: isLight ? '#F8F8F8' : 'transparent' }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="text-3xl font-black mb-1 flex items-center gap-2"><Settings size={28} color="#D4AF37"/> <span className="text-gradient-gold">Configurações</span></h1>
        <p className="" style={{ color: isLight ? '#5E5E5E' : undefined }}>Gerencie seus dados e preferências</p>
      </motion.div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {tabs.map(t => {
          const Icon = t.icon
          const active = tab === t.id
          return (
            <button key={t.id} onClick={() => setTab(t.id)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={{ background: active ? 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(212,175,55,0.05))' : 'rgba(255,255,255,0.02)', color: active ? '#D4AF37' : '#888', border: active ? '1px solid rgba(212,175,55,0.3)' : '1px solid rgba(255,255,255,0.05)' }}>
              <Icon size={15}/> {t.label}
            </button>
          )
        })}
      </div>

      <GlassCard intensity={0.3} style={{ padding: 28 }}>
        {tab === 'pessoal' && (
          <div className="space-y-4">
            <div><label className={labelCls} style={{ color: '#bbb' }}>Nome completo</label>
              <input value={form.name || ''} onChange={e => set('name', e.target.value)} className={inputCls} style={{ height: 48 }} spellCheck={true} /></div>
            <div><label className={labelCls} style={{ color: '#bbb' }}>Email</label>
              <input value={form.email || ''} disabled className={inputCls} style={{ height: 48, opacity: 0.5 }} spellCheck={true}/></div>
            <div><label className={labelCls} style={{ color: '#bbb' }}>Telefone / WhatsApp</label>
              <input value={form.phone || ''} onChange={e => set('phone', e.target.value)} placeholder="(99) 99999-9999" className={inputCls} style={{ height: 48 }} spellCheck={true} /></div>
            <div><label className={labelCls} style={{ color: '#bbb' }}>CPF</label>
              <input 
                value={form.cpf ? form.cpf.replace(/(\d{3})\.?(\d{3})\.?(\d{3})-?(\d{2})/, '$1.***.***-$4') : ''}
                readOnly
                onClick={() => {
                  const real = prompt('Digite o CPF completo para editar:', form.cpf || '')
                  if (real !== null) set('cpf', real)
                }}
                className={inputCls} 
                style={{ height: 48, cursor: 'pointer' }} spellCheck={true} /></div>
            <SaveBtn saving={saving} saved={saved} onClick={salvar}/>
          </div>
        )}

        {tab === 'profissional' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><label className={labelCls} style={{ color: '#bbb' }}>Número OAB</label>
                <input value={form.oab_number || ''} onChange={e => set('oab_number', e.target.value)} className={inputCls} style={{ height: 48 }} spellCheck={true} /></div>
              <div><label className={labelCls} style={{ color: '#bbb' }}>UF da OAB</label>
                <select value={form.oab_uf || 'SP'} onChange={e => set('oab_uf', e.target.value)} className={inputCls} style={{ height: 48 }}>
                  {UFS.map(uf => <option key={uf} value={uf} style={{ background: '#111' }}>{uf}</option>)}
                </select></div>
            </div>
            <div><label className={labelCls} style={{ color: '#bbb' }}>Especialidade</label>
              <input value={form.specialty || ''} onChange={e => set('specialty', e.target.value)} placeholder="Direito Previdenciário" className={inputCls} style={{ height: 48 }} spellCheck={true} /></div>
            <div>
              <label className={labelCls} style={{ color: '#bbb' }}>Estilo de formatação das petições</label>
              <div className="grid grid-cols-2 gap-3">
                {([
                  { id: 'moderno', titulo: 'Moderno', desc: 'Barras coloridas e quadros destacados' },
                  { id: 'classico', titulo: 'Clássico/Sóbrio', desc: 'Preto, negrito e sublinhado — padrão forense' },
                ] as const).map(op => {
                  const ativo = (form.estilo_peticao || 'moderno') === op.id
                  return (
                    <button
                      key={op.id}
                      type="button"
                      onClick={() => set('estilo_peticao', op.id)}
                      className="text-left px-4 py-3 rounded-xl transition-all"
                      style={{
                        background: ativo ? 'rgba(212,175,55,0.12)' : 'rgba(255,255,255,0.02)',
                        border: ativo ? '1px solid rgba(212,175,55,0.4)' : '1px solid rgba(255,255,255,0.08)',
                      }}
                    >
                      <div className="text-sm font-bold" style={{ color: ativo ? '#D4AF37' : (isLight ? '#1E1E1E' : '#ddd') }}>{op.titulo}</div>
                      <div className="text-[11px] mt-1" style={{ color: '#888' }}>{op.desc}</div>
                    </button>
                  )
                })}
              </div>
              <p className="text-xs mt-2" style={{ color: isLight ? '#5E5E5E' : '#666' }}>
                Padrão do escritório. Pode ser alterado na hora de gerar/exportar a petição.
              </p>
            </div>
              {me?.oab_number && (
                <div className="p-3 rounded-xl mt-2" style={{ background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.2)' }}>
                  <p className="text-xs text-gray-400 mb-1">Seu perfil público:</p>
                  <div className="flex items-center gap-2">
                    <code className="text-xs flex-1 truncate" style={{ color: '#D4AF37' }}>
                      {typeof window !== 'undefined' ? window.location.origin : ''}/advogado/{me.oab_number}
                    </code>
                    <button onClick={() => navigator.clipboard.writeText(`${window.location.origin}/advogado/${me.oab_number}`)}
                      className="text-[10px] px-2 py-1 rounded-lg" style={{ border: '1px solid rgba(212,175,55,0.3)', color: '#D4AF37' }}>
                      Copiar
                    </button>
                  </div>
                </div>
              )}
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: '#bbb' }}>Cor das barras nas petições</label>
                <div className="flex items-center gap-3">
                  <input type="color" value={corPeticao} onChange={e => { setCorPeticao(e.target.value); set('cor_peticao', e.target.value) }}
                    className="w-12 h-10 rounded-lg cursor-pointer" style={{ border: '1px solid rgba(255,255,255,0.1)', background: 'transparent' }}/>
                  <div className="flex items-center gap-2 flex-wrap">
                    {['#1d4ed8', '#D4AF37', '#16a34a', '#dc2626', '#7c3aed', '#0891b2', '#000000'].map(cor => (
                      <button key={cor} onClick={() => { setCorPeticao(cor); set('cor_peticao', cor) }}
                        className="w-7 h-7 rounded-full transition-all hover:scale-110"
                        style={{ background: cor, border: corPeticao === cor ? '2px solid #fff' : '2px solid transparent' }}/>
                    ))}
                  </div>
                  <span className="text-xs text-gray-500">{corPeticao}</span>
                </div>
                <div className="mt-2 p-3 rounded-xl" style={{ background: corPeticao, opacity: 0.8 }}>
                  <span className="text-white text-xs font-bold">Prévia da barra de seção</span>
                </div>
                {(form.estilo_peticao || 'moderno') === 'classico' && (
                  <p className="text-xs mt-2" style={{ color: '#888' }}>
                    No estilo Clássico/Sóbrio a cor da barra não é usada (texto preto com negrito e sublinhado).
                  </p>
                )}
              </div>
            <SaveBtn saving={saving} saved={saved} onClick={salvar}/>
          </div>
        )}

        {tab === 'escritorio' && (
          <div className="space-y-5">
            <div className="flex items-center gap-2 mb-1"><ImageIcon size={16} color="#D4AF37"/><span className="font-bold text-sm" style={{ color: isLight ? '#1E1E1E' : '#fff' }}>Logo / Timbre / Banner</span></div>
            <p className="text-xs mb-2" style={{ color: isLight ? '#5E5E5E' : '#666' }}>
              Aparece no topo de cada petição PDF/DOCX. Sem upload, usa o logo padrão Marple.
            </p>
            <div className="flex items-center gap-5">
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center overflow-hidden flex-shrink-0" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(212,175,55,0.2)' }}>
                {form.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.logo_url} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }}/>
                ) : (
                  <Image src="/logo.png" alt="Marple" width={48} height={48} className="object-contain" />
                )}
              </div>
              <div>
                <input ref={logoRef} type="file" accept="image/*" onChange={e => uploadFile(e, 'logos', 'logo_url')} style={{ display: 'none' }}/>
                <button onClick={() => logoRef.current?.click()} disabled={uploading} className="btn-gold flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm">
                  {uploading ? <><Loader2 size={15} className="animate-spin"/> Enviando...</> : <><Upload size={15}/> Enviar Logo / Timbre</>}
                </button>
                {form.logo_url && (
                  <button
                    type="button"
                    onClick={async () => {
                      set('logo_url', null)
                      if (me) await supabase.from('lawyers').update({ logo_url: null }).eq('id', me.id)
                    }}
                    className="block mt-2 text-xs"
                    style={{ color: '#888' }}
                  >
                    Remover e usar padrão Marple
                  </button>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 mb-1 mt-2"><ImageIcon size={16} color="#D4AF37"/><span className="font-bold text-sm" style={{ color: isLight ? '#1E1E1E' : '#fff' }}>Banner (opcional)</span></div>
            <div className="flex items-center gap-5">
              <div className="w-40 h-16 rounded-2xl flex items-center justify-center overflow-hidden flex-shrink-0" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(212,175,55,0.2)' }}>
                {form.banner_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.banner_url} alt="Banner" style={{ width: '100%', height: '100%', objectFit: 'contain' }}/>
                ) : <ImageIcon size={22} color="#555"/>}
              </div>
              <div>
                <input ref={bannerRef} type="file" accept="image/*" onChange={e => uploadFile(e, 'logos', 'banner_url')} style={{ display: 'none' }}/>
                <button onClick={() => bannerRef.current?.click()} disabled={uploading} className="btn-gold flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm">
                  {uploading ? <><Loader2 size={15} className="animate-spin"/> Enviando...</> : <><Upload size={15}/> Enviar Banner</>}
                </button>
                <p className="text-[11px] mt-1.5" style={{ color: '#666' }}>Faixa larga acima do cabeçalho (timbre institucional).</p>
                {form.banner_url && (
                  <button
                    type="button"
                    onClick={async () => {
                      set('banner_url', null)
                      if (me) await supabase.from('lawyers').update({ banner_url: null }).eq('id', me.id)
                    }}
                    className="block mt-2 text-xs"
                    style={{ color: '#888' }}
                  >
                    Remover banner
                  </button>
                )}
              </div>
            </div>
            <div><label className={labelCls} style={{ color: '#bbb' }}>Nome do Escritório</label>
              <input value={form.office_name || ''} onChange={e => set('office_name', e.target.value)} placeholder="Silva & Associados" className={inputCls} style={{ height: 48 }} spellCheck={true} /></div>
            <div><label className={labelCls} style={{ color: '#bbb' }}>URL do site do escritório</label>
              <input value={form.site_url || ''} onChange={e => set('site_url', e.target.value)} placeholder="https://www.seuescritorio.com.br" className={inputCls} style={{ height: 48 }} spellCheck={true} /></div>
            <div><label className={labelCls} style={{ color: '#bbb' }}>URL do LinkedIn</label>
              <input value={form.linkedin_url || ''} onChange={e => set('linkedin_url', e.target.value)} placeholder="https://www.linkedin.com/in/..." className={inputCls} style={{ height: 48 }} spellCheck={true} /></div>
            <p className="text-xs" style={{ color: isLight ? '#5E5E5E' : '#666' }}>
              Site e LinkedIn aparecem como destinos ao publicar artigos no Blog.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls} style={{ color: '#bbb' }}>Cidade (local da petição)</label>
                <input
                  value={form.cidade || ''}
                  onChange={e => set('cidade', e.target.value)}
                  placeholder="São Luís"
                  className={inputCls}
                  style={{ height: 48 }} spellCheck={true} />
              </div>
              <div>
                <label className={labelCls} style={{ color: '#bbb' }}>UF</label>
                <select
                  value={form.estado || form.oab_uf || 'SP'}
                  onChange={e => set('estado', e.target.value)}
                  className={inputCls}
                  style={{ height: 48 }}
                >
                  {UFS.map(uf => (
                    <option key={uf} value={uf} style={{ background: '#111' }}>{uf}</option>
                  ))}
                </select>
              </div>
            </div>
            <p className="text-xs" style={{ color: isLight ? '#5E5E5E' : '#666' }}>
              Aparece na linha de local/data: {(form.cidade || '').trim()
                ? `${(form.cidade || '').trim()}/${form.estado || form.oab_uf || 'UF'}, …`
                : `São Luís/${form.estado || form.oab_uf || 'MA'}, … (fallback — cadastre a cidade acima)`}
            </p>
            <div className="pt-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              <div className="flex items-center gap-2 mb-2">
                <Bell size={16} color="#D4AF37" />
                <span className="font-bold text-sm" style={{ color: isLight ? '#1E1E1E' : '#fff' }}>
                  Lembrete de contato
                </span>
              </div>
              <label className={labelCls} style={{ color: '#bbb' }}>
                Alertar após quantos dias sem contato?
              </label>
              <input
                type="number"
                min={1}
                max={365}
                value={form.dias_alerta_sem_contato ?? DIAS_ALERTA_SEM_CONTATO_PADRAO}
                onChange={(e) => {
                  const n = Number.parseInt(e.target.value, 10)
                  set(
                    'dias_alerta_sem_contato',
                    Number.isFinite(n) ? Math.min(365, Math.max(1, n)) : DIAS_ALERTA_SEM_CONTATO_PADRAO,
                  )
                }}
                className={inputCls}
                style={{ height: 48, maxWidth: 140 }}
              />
              <p className="text-xs mt-1.5" style={{ color: isLight ? '#5E5E5E' : '#666' }}>
                O sistema gera uma notificação diária (cron) quando um cliente ultrapassa esse limiar
                sem atualização de &quot;Último Contato&quot;. Padrão: {DIAS_ALERTA_SEM_CONTATO_PADRAO} dias.
                Não reenvia o mesmo alerta em menos de 7 dias.
              </p>
            </div>
            <SaveBtn saving={saving} saved={saved} onClick={salvar}/>
          </div>
        )}

        {tab === 'modulos' && me && (
          <ModulosEscritorio me={me} isLight={isLight} />
        )}

        {tab === 'assinatura' && (
          <div className="space-y-5">
            <p className="text-sm" style={{ color: isLight ? '#5E5E5E' : undefined }}>Sua assinatura digital aparecerá no rodapé das petições geradas.</p>
            <div className="flex items-center gap-5">
              <div className="w-40 h-20 rounded-2xl flex items-center justify-center overflow-hidden flex-shrink-0" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(212,175,55,0.2)' }}>
                {form.signature_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.signature_url} alt="Assinatura" style={{ width: '100%', height: '100%', objectFit: 'contain' }}/>
                ) : <PenTool size={28} color="#555"/>}
              </div>
              <div>
                <input ref={signRef} type="file" accept="image/*" onChange={e => uploadFile(e, 'signatures', 'signature_url')} style={{ display: 'none' }}/>
                <button onClick={() => signRef.current?.click()} disabled={uploading} className="btn-gold flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm">
                  {uploading ? <><Loader2 size={15} className="animate-spin"/> Enviando...</> : <><Upload size={15}/> Enviar Assinatura</>}
                </button>
              </div>
            </div>
          </div>
        )}

        {tab === 'honorarios' && (
          <div className="space-y-4">
            <div><label className={labelCls} style={{ color: '#bbb' }}>Percentual de honorários contratuais padrão (%)</label>
              <input type="number" value={form.fee_percent || ''} onChange={e => set('fee_percent', e.target.value)} placeholder="30" className={inputCls} style={{ height: 48 }}/>
              <p className="text-xs mt-1.5" style={{ color: isLight ? '#5E5E5E' : undefined }}>Este percentual será sugerido automaticamente nas petições geradas.</p></div>
            <SaveBtn saving={saving} saved={saved} onClick={salvar}/>
          </div>
        )}

        {tab === 'plano' && (
          <div className="space-y-5">
            <div className="flex items-start gap-2">
              <CreditCard size={16} color="#D4AF37" className="mt-0.5 flex-shrink-0"/>
              <div>
                <p className="font-bold text-sm" style={{ color: isLight ? '#1E1E1E' : '#fff' }}>Resumo do Plano</p>
                <p className="text-xs mt-1" style={{ color: isLight ? '#5E5E5E' : '#888' }}>
                  Para comparar planos, alterar forma de pagamento ou ver o histórico de faturas, acesse a página de Assinatura.
                </p>
              </div>
            </div>

            <div className="p-5 rounded-2xl" style={{ background: isLight ? '#FAFAFA' : 'rgba(255,255,255,0.02)', border: isLight ? '1px solid #EDEDED' : '1px solid rgba(212,175,55,0.15)' }}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold tracking-wide" style={{ color: '#D4AF37' }}>PLANO ATUAL</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold capitalize" style={{ background: 'rgba(212,175,55,0.15)', color: '#D4AF37' }}>
                  {planoAtualId}
                </span>
              </div>
              <div className="text-xl font-black mb-4" style={{ color: isLight ? '#1E1E1E' : '#fff' }}>
                {planoAtualNome}
              </div>

              <div className="flex justify-between text-xs mb-1.5">
                <span style={{ color: isLight ? '#6B7280' : '#888' }}>Documentos utilizados</span>
                <span className="font-bold" style={{ color: isLight ? '#1E1E1E' : '#fff' }}>{docsUsed}/{docsLimit} documentos</span>
              </div>
              <div className="w-full h-2 rounded-full mb-4" style={{ background: isLight ? '#EDEDED' : 'rgba(255,255,255,0.06)' }}>
                <div className="h-full rounded-full" style={{ width: `${docsPercent}%`, background: 'linear-gradient(90deg, #D4AF37, #F0D060)' }}/>
              </div>

              <Link href="/assinatura" className="btn-gold flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm w-full">
                <CreditCard size={15}/> Gerenciar Plano
              </Link>
            </div>
          </div>
        )}

        {tab === 'seguranca' && (
          <div className="space-y-4">
            <div><label className={labelCls} style={{ color: '#bbb' }}>Senha atual</label>
              <input type="password" value={currentPwd} onChange={e => setCurrentPwd(e.target.value)} placeholder="Sua senha atual" className={inputCls} style={{ height: 48 }}/></div>
            <div><label className={labelCls} style={{ color: '#bbb' }}>Nova senha</label>
              <input type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)} placeholder="Mínimo 8 caracteres" className={inputCls} style={{ height: 48 }}/></div>
            <div><label className={labelCls} style={{ color: '#bbb' }}>Confirmar nova senha</label>
              <input type="password" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} placeholder="Repita a nova senha" className={inputCls} style={{ height: 48 }}/></div>
            {pwdMsg && <p className="text-sm" style={{ color: pwdMsg.includes('sucesso') ? '#22C55E' : '#EF4444' }}>{pwdMsg}</p>}
            <button onClick={trocarSenha} className="btn-gold flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm">
              <Lock size={15}/> Alterar Senha
            </button>

            {/*
              Conta Google: o Client ID e o Client Secret NÃO ficam no código.
              O administrador configura em Supabase → Authentication → Providers → Google
              (credenciais criadas no Google Cloud Console → OAuth 2.0 Client ID).
            */}
            <div className="mt-8 pt-6" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex items-center gap-2 mb-2">
                <GoogleIcon size={18} />
                <h4 className="font-bold text-sm" style={{ color: isLight ? '#1E1E1E' : '#fff' }}>
                  Conta Google
                </h4>
              </div>
              <p className="text-xs mb-3 leading-relaxed" style={{ color: isLight ? '#5E5E5E' : '#888' }}>
                Vincule o Google para entrar sem senha. As credenciais OAuth (Client ID e Client Secret)
                devem ser configuradas pelo administrador no painel do Supabase em{' '}
                <strong style={{ color: isLight ? '#333' : '#ccc' }}>Authentication → Providers → Google</strong>
                — não são definidas nesta tela nem em variáveis públicas do app.
              </p>
              {googleLinked ? (
                <button
                  type="button"
                  onClick={desvincularGoogle}
                  disabled={googleBusy}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all"
                  style={{
                    border: '1px solid rgba(255,255,255,0.12)',
                    color: isLight ? '#1E1E1E' : '#eee',
                    background: isLight ? '#fff' : 'rgba(255,255,255,0.03)',
                  }}
                >
                  {googleBusy ? <Loader2 size={15} className="animate-spin" /> : <Unlink size={15} />}
                  Desvincular Google
                </button>
              ) : (
                <button
                  type="button"
                  onClick={vincularGoogle}
                  disabled={googleBusy}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all"
                  style={{
                    border: isLight ? '1px solid #E0E0E0' : '1px solid rgba(255,255,255,0.12)',
                    color: isLight ? '#1E1E1E' : '#eee',
                    background: isLight ? '#fff' : 'rgba(255,255,255,0.03)',
                  }}
                >
                  {googleBusy ? <Loader2 size={15} className="animate-spin" /> : <Link2 size={15} />}
                  Vincular conta Google
                </button>
              )}
              {googleMsg && (
                <p
                  className="text-sm mt-3"
                  style={{ color: googleMsg.includes('desvinculada') ? '#22C55E' : '#EF4444' }}
                >
                  {googleMsg}
                </p>
              )}
            </div>

            <div className="mt-8 pt-6" style={{ borderTop: '1px solid rgba(239,68,68,0.2)' }}>
              <h4 className="font-bold mb-2" style={{ color: '#EF4444' }}>Zona de Perigo</h4>
              <p className="text-xs text-gray-500 mb-3">A exclusão da conta é permanente e irreversível. Todos os seus dados, documentos e clientes serão apagados.</p>
              <button onClick={excluirConta} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:bg-red-500/20"
                style={{ border: '1px solid rgba(239,68,68,0.4)', color: '#EF4444' }}>
                🗑 Excluir Minha Conta Permanentemente
              </button>
            </div>
          </div>
        )}
      </GlassCard>
    </div>
  )
}

function SaveBtn({ saving, saved, onClick }: { saving: boolean; saved: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} disabled={saving} className="btn-gold flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm mt-2">
      {saving ? <><Loader2 size={15} className="animate-spin"/> Salvando...</> : saved ? <><Check size={15}/> Salvo!</> : 'Salvar Alterações'}
    </button>
  )
}