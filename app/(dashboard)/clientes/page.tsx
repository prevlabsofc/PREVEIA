'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, Plus, Search, Upload, Download, Eye, FileText, Archive, X, CheckCircle2, AlertCircle, Loader2, MapPin } from 'lucide-react'
import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import { ClientesViewSelector, useViewMode } from '@/components/clientes/ClientesViewSelector'
import ClientesTabela from '@/components/clientes/ClientesTabela'
import ClientesKanban from '@/components/clientes/ClientesKanban'
import { UFS_BRASIL } from '@/lib/estados-brasil'
import { juntarEnderecoLegado, mascaraCEP } from '@/lib/formatar-endereco'

const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

function validarCPF(cpf: string) {
  const n = cpf.replace(/\D/g, '')
  if (n.length !== 11 || /^(\d)\1+$/.test(n)) return false
  let s = 0
  for (let i = 0; i < 9; i++) s += parseInt(n[i]) * (10 - i)
  let r = (s * 10) % 11; if (r === 10 || r === 11) r = 0
  if (r !== parseInt(n[9])) return false
  s = 0
  for (let i = 0; i < 10; i++) s += parseInt(n[i]) * (11 - i)
  r = (s * 10) % 11; if (r === 10 || r === 11) r = 0
  return r === parseInt(n[10])
}

function mascaraCPF(v: string) {
  return v.replace(/\D/g, '').slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

function cpfMascarado(cpf: string) {
  if (!cpf) return ''
  const n = cpf.replace(/\D/g, '')
  return `${n.slice(0,3)}.***.***-${n.slice(9,11)}`
}

function iniciais(nome: string) {
  const parts = nome.trim().split(' ')
  return (parts[0]?.[0] || '') + (parts[parts.length - 1]?.[0] || '')
}

const zonaColors = {
  rural: { bg: 'rgba(34,197,94,0.1)', color: '#22C55E', border: 'rgba(34,197,94,0.2)', label: '🌾 Rural' },
  urban: { bg: 'rgba(59,130,246,0.1)', color: '#3B82F6', border: 'rgba(59,130,246,0.2)', label: '🏢 Urbano' },
}

export default function ClientesPage() {
  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('Ativos')
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '', cpf: '', rg: '', birth_date: '', phone: '',
    whatsapp: '', email: '', profession: '', zone: 'rural',
    cep: '', rua: '', numero: '', bairro: '', city: '', state: '', notes: ''
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [cepLoading, setCepLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)
  const [importMsg, setImportMsg] = useState('')
  const [viewMode, setViewMode] = useViewMode()
  const [showExportMenu, setShowExportMenu] = useState(false)
  const exportMenuRef = useRef<HTMLDivElement>(null)

  /** Atualização otimista usada pelas visões Tabela e Funil — e também pelo
   *  rollback quando o Supabase recusa a alteração. */
  function patchCliente(id: string, patch: Record<string, unknown>) {
    setClients(prev => prev.map(c => (c.id === id ? { ...c, ...patch } : c)))
  }

  const [isLight, setIsLight] = useState(false)
  useEffect(() => {
    const check = () => setIsLight(document.documentElement.classList.contains('light'))
    check()
    const observer = new MutationObserver(check)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!showExportMenu) return
    function aoClicarFora(e: MouseEvent) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setShowExportMenu(false)
      }
    }
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === 'Escape') setShowExportMenu(false)
    }
    document.addEventListener('mousedown', aoClicarFora)
    document.addEventListener('keydown', aoTeclar)
    return () => {
      document.removeEventListener('mousedown', aoClicarFora)
      document.removeEventListener('keydown', aoTeclar)
    }
  }, [showExportMenu])


  async function loadClients() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('clients')
      .select('*')
      .eq('lawyer_id', user.id)
      .order('created_at', { ascending: false })
    setClients(data || [])
    setLoading(false)
    const termoBusca = localStorage.getItem('marple_search')
    if (termoBusca) {
      setSearch(termoBusca)
      localStorage.removeItem('marple_search')
    }
  }

  useEffect(() => { loadClients() }, [])

  async function buscarCEP(cep: string) {
    const n = cep.replace(/\D/g, '')
    if (n.length !== 8) return
    setCepLoading(true)
    try {
      const res = await fetch(`https://viacep.com.br/ws/${n}/json/`)
      const data = await res.json()
      if (!data.erro) {
        setForm(p => ({
          ...p,
          rua: data.logradouro || p.rua,
          bairro: data.bairro || p.bairro,
          city: data.localidade || '',
          state: data.uf || '',
        }))
      }
    } catch {}
    setCepLoading(false)
  }

  function validateForm() {
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = 'Nome obrigatório'
    else if (form.name.trim().split(' ').length < 2) e.name = 'Informe nome e sobrenome'
    if (!form.cpf) e.cpf = 'CPF obrigatório'
    else if (!validarCPF(form.cpf)) e.cpf = 'CPF inválido'
    if (!form.phone.trim()) e.phone = 'Telefone obrigatório'
    if (!form.zone) e.zone = 'Zona obrigatória'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSave() {
    if (!validateForm()) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('clients').insert({
      lawyer_id: user.id,
      name: form.name,
      cpf: form.cpf.replace(/\D/g, ''),
      rg: form.rg,
      birth_date: form.birth_date || null,
      phone: form.phone,
      whatsapp: form.whatsapp,
      email: form.email,
      profession: form.profession,
      zone: form.zone,
      cep: form.cep,
      rua: form.rua,
      numero: form.numero,
      bairro: form.bairro,
      // `address` legado é mantido em sincronia (rua+número+bairro) para não
      // quebrar telas que ainda só leem esse campo (exportações, snapshot do
      // link de aceite) — ver comentário na migração 20260801_clients_endereco_estruturado.
      address: juntarEnderecoLegado(form),
      city: form.city,
      state: form.state,
      notes: form.notes,
      status: 'active',
    })

    if (user) {
      await supabase.from('notifications').insert({
        lawyer_id: user.id,
        title: 'Novo cliente cadastrado!',
        type: 'success',
      })
    }

    await loadClients()
    setShowModal(false)
    setForm({
      name: '', cpf: '', rg: '', birth_date: '', phone: '',
      whatsapp: '', email: '', profession: '', zone: 'rural',
      cep: '', rua: '', numero: '', bairro: '', city: '', state: '', notes: ''
    })
    setErrors({})
    setSaving(false)
  }

  async function handleImportCSV(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    setImportMsg('')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('not authenticated')
      const text = await file.text()
      const lines = text.split('\n').filter(l => l.trim())
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
      const rows = lines.slice(1)
      let count = 0
      for (const row of rows) {
        const cols = row.split(',').map(c => c.trim())
        const obj: any = {}
        headers.forEach((h, i) => { obj[h] = cols[i] || '' })
        if (obj.nome && obj.cpf) {
          await supabase.from('clients').insert({
            lawyer_id: user.id,
            name: obj.nome,
            cpf: obj.cpf,
            phone: obj.telefone || obj.whatsapp || '',
            email: obj.email || '',
            address: obj.endereco || obj.endereço || '',
            notes: obj.historico || obj.observacoes || obj.notas || '',
          })
          if (obj.processo || obj.numero_processo) {
            const { data: cli } = await supabase.from('clients').select('id').eq('lawyer_id', user.id).eq('cpf', obj.cpf).single()
            if (cli) {
              await supabase.from('processos').insert({
                lawyer_id: user.id,
                numero: obj.processo || obj.numero_processo,
                tribunal: obj.tribunal || 'TRF1',
                cliente: obj.nome,
                cliente_id: cli.id,
                obs: obj.historico || '',
              })
            }
          }
          count++
        }
      }
      setImportMsg(`${count} clientes importados com sucesso!`)
      const { data } = await supabase.from('clients').select('*').eq('lawyer_id', user.id).order('created_at', { ascending: false })
      setClients(data || [])
    } catch {
      setImportMsg('Erro ao processar o arquivo CSV.')
    } finally {
      setImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  function exportarExcel() {
    const dados = clients.map(c => ({
      'Nome': c.name || '',
      'CPF': c.cpf || '',
      'Email': c.email || '',
      'Telefone': c.phone || '',
      'Endereço': c.address || '',
      'Cidade': c.city || '',
      'Estado': c.state || '',
      'CEP': c.cep || '',
      'Cadastrado em': new Date(c.created_at).toLocaleDateString('pt-BR'),
    }))
    const ws = XLSX.utils.json_to_sheet(dados)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Clientes')
    XLSX.writeFile(wb, 'clientes-marple.xlsx')
  }

  function exportarCSV() {
    const dados = clients.map(c => ({
      'Nome': c.name || '',
      'CPF': c.cpf || '',
      'Email': c.email || '',
      'Telefone': c.phone || '',
      'Endereço': c.address || '',
      'Cidade': c.city || '',
      'Estado': c.state || '',
      'CEP': c.cep || '',
      'Cadastrado em': new Date(c.created_at).toLocaleDateString('pt-BR'),
    }))
    const ws = XLSX.utils.json_to_sheet(dados)
    const csv = XLSX.utils.sheet_to_csv(ws)
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'clientes-marple.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  function exportarTXT() {
    const linhas = clients.map((c, i) =>
      `${i + 1}. ${c.name || 'N/A'}\n   CPF: ${c.cpf || 'N/A'}\n   Email: ${c.email || 'N/A'}\n   Telefone: ${c.phone || 'N/A'}\n   Endereço: ${c.address || 'N/A'}, ${c.city || ''} - ${c.state || ''}\n   CEP: ${c.cep || 'N/A'}\n   Cadastrado: ${new Date(c.created_at).toLocaleDateString('pt-BR')}\n`
    )
    const texto = `CARTEIRA DE CLIENTES - MARPLE\nTotal: ${clients.length} clientes\nExportado em: ${new Date().toLocaleDateString('pt-BR')}\n${'='.repeat(50)}\n\n` + linhas.join('\n')
    const blob = new Blob([texto], { type: 'text/plain;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'clientes-marple.txt'; a.click()
    URL.revokeObjectURL(url)
  }

  async function exportarPDF() {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' })
    const margin = 50
    doc.setFont('times', 'bold')
    doc.setFontSize(16)
    doc.text('CARTEIRA DE CLIENTES - MARPLE', margin, margin)
    doc.setFontSize(10)
    doc.setFont('times', 'normal')
    doc.text(`Total: ${clients.length} clientes | Exportado em: ${new Date().toLocaleDateString('pt-BR')}`, margin, margin + 20)
    doc.setLineWidth(0.5)
    doc.line(margin, margin + 30, 545, margin + 30)
    let y = margin + 50
    clients.forEach((c, i) => {
      if (y > 750) { doc.addPage(); y = margin }
      doc.setFont('times', 'bold')
      doc.setFontSize(11)
      doc.text(`${i + 1}. ${c.name || 'N/A'}`, margin, y)
      doc.setFont('times', 'normal')
      doc.setFontSize(9)
      y += 14
      doc.text(`CPF: ${c.cpf || 'N/A'} | Email: ${c.email || 'N/A'} | Tel: ${c.phone || 'N/A'}`, margin + 10, y)
      y += 12
      doc.text(`Endereço: ${c.address || 'N/A'}, ${c.city || ''} - ${c.state || ''} | CEP: ${c.cep || 'N/A'}`, margin + 10, y)
      y += 20
    })
    doc.save('clientes-marple.pdf')
  }

  const filtered = clients.filter(c => {
    const termo = search.trim().toLowerCase()
    const temBusca = termo.length > 0
    const matchSearch = !temBusca ||
      c.name?.toLowerCase().includes(termo) ||
      c.cpf?.includes(search.replace(/\D/g, ''))

    if (!matchSearch) return false

    // Com busca ativa, arquivados continuam encontráveis (exceto no filtro
    // Arquivados, que restringe só a eles). Sem busca, Ativos exclui arquivados.
    if (filter === 'Arquivados') return c.status === 'archived'
    if (filter === 'Rural') return c.zone === 'rural'
    if (filter === 'Urbano') return c.zone === 'urban'
    if (filter === 'Ativos') {
      if (temBusca) return true
      return c.status !== 'archived'
    }
    // Todos
    return true
  })

  const inputStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(212,175,55,0.2)',
    borderRadius: 10,
    color: '#fff',
    width: '100%',
    height: 44,
    padding: '0 14px',
    fontSize: 13,
    outline: 'none',
  }

  // Reservados para uso futuro (ações por cliente: visualizar, gerar doc, arquivar, ver no mapa)
  void Eye; void FileText; void Archive; void MapPin

  return (
    <div className="p-8 max-w-7xl mx-auto" style={{ background: isLight ? '#F8F8F8' : 'transparent' }}>

      {/* HEADER */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black mb-1" style={{ color: isLight ? '#1E1E1E' : '#fff' }}>Carteira de Clientes</h1>
          <p style={{ color: '#666', fontSize: 14 }}>
            Gerencie seus segurados e acesse os históricos.
          </p>
        </div>
        <div className="flex gap-3">
          <div>
            <input ref={fileInputRef} type="file" accept=".csv" onChange={handleImportCSV} style={{ display: 'none' }}/>
            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={importing}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all hover:bg-white/5"
              style={{ border: '1px solid rgba(255,255,255,0.1)', color: '#888' }}>
              <Upload size={15} /> Importar CSV
            </button>
            {importMsg && (
              <p className="text-xs mt-2" style={{ color: importMsg.includes('sucesso') ? '#22C55E' : '#EF4444' }}>{importMsg}</p>
            )}
          </div>
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg,#D4AF37,#F0D060)', color: '#000' }}>
            <Plus size={16} /> Novo Cliente
          </button>
        </div>
      </div>

      {/* FILTROS + BUSCA */}
      <div className="flex items-center gap-4 mb-6 flex-wrap">
        <div className="flex gap-2 flex-wrap">
          {['Todos', 'Ativos', 'Arquivados', 'Rural', 'Urbano'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className="px-4 py-1.5 rounded-full text-xs font-bold transition-all"
              style={{
                background: filter === f ? '#D4AF37' : 'rgba(255,255,255,0.04)',
                color: filter === f ? '#000' : '#888',
                border: `1px solid ${filter === f ? '#D4AF37' : 'rgba(255,255,255,0.08)'}`,
              }}>
              {f}
            </button>
          ))}
        </div>
        <div className="flex-1 min-w-48 relative">
          <Search size={15} color="#555" className="absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome ou CPF..."
            className="w-full h-9 pl-9 pr-4 rounded-xl text-sm outline-none"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff' }} spellCheck={true} />
        </div>
        <ClientesViewSelector mode={viewMode} onChange={setViewMode} isLight={isLight} />
      </div>

        {clients.length > 0 && (
          <div className="mb-4 p-4 rounded-2xl flex items-center gap-3 flex-wrap" style={{ background: 'rgba(212,175,55,0.05)', border: '1px solid rgba(212,175,55,0.15)' }}>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Download size={16} color="#D4AF37"/>
              <span className="text-sm font-medium" style={{ color: isLight ? '#1E1E1E' : '#fff' }}>Exportar {clients.length} clientes:</span>
            </div>
            <div className="relative" ref={exportMenuRef}>
              <button
                type="button"
                onClick={() => setShowExportMenu(v => !v)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:scale-105"
                style={{ background: 'rgba(212,175,55,0.15)', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.3)' }}
              >
                Exportar ▾
              </button>
              {showExportMenu && (
                <div
                  className="absolute left-0 top-full mt-2 rounded-xl p-1.5 flex flex-col gap-1 z-20"
                  style={{
                    minWidth: 160,
                    background: isLight ? '#FFFFFF' : '#141410',
                    border: isLight ? '1px solid #EDEDED' : '1px solid rgba(212,175,55,0.2)',
                    boxShadow: isLight ? '0 10px 30px rgba(0,0,0,0.10)' : '0 12px 40px rgba(0,0,0,0.6)',
                  }}
                >
                  <button onClick={() => { exportarPDF(); setShowExportMenu(false) }} className="px-3 py-1.5 rounded-lg text-xs font-bold text-left transition-all hover:scale-105" style={{ background: 'rgba(239,68,68,0.15)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.3)' }}>
                    📄 PDF
                  </button>
                  <button onClick={() => { exportarExcel(); setShowExportMenu(false) }} className="px-3 py-1.5 rounded-lg text-xs font-bold text-left transition-all hover:scale-105" style={{ background: 'rgba(34,197,94,0.15)', color: '#22C55E', border: '1px solid rgba(34,197,94,0.3)' }}>
                    📊 Excel
                  </button>
                  <button onClick={() => { exportarCSV(); setShowExportMenu(false) }} className="px-3 py-1.5 rounded-lg text-xs font-bold text-left transition-all hover:scale-105" style={{ background: 'rgba(59,130,246,0.15)', color: '#3B82F6', border: '1px solid rgba(59,130,246,0.3)' }}>
                    📋 CSV
                  </button>
                  <button onClick={() => { exportarTXT(); setShowExportMenu(false) }} className="px-3 py-1.5 rounded-lg text-xs font-bold text-left transition-all hover:scale-105" style={{ background: 'rgba(168,85,247,0.15)', color: '#A855F7', border: '1px solid rgba(168,85,247,0.3)' }}>
                    📝 Texto
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

      {/* GRID DE CARDS */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 size={32} color="#D4AF37" className="animate-spin" />
        </div>
      ) : viewMode === 'tabela' ? (
        <ClientesTabela
          clients={filtered}
          onPatch={patchCliente}
          isLight={isLight}
          busca={search}
          onNovoCliente={() => setShowModal(true)}
        />
      ) : viewMode === 'kanban' ? (
        <ClientesKanban
          clients={filtered}
          onPatch={patchCliente}
          isLight={isLight}
          busca={search}
          onNovoCliente={() => setShowModal(true)}
        />
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <Users size={48} color="#2A2A2A" className="mx-auto mb-4" />
          <p className="font-bold mb-2" style={{ color: isLight ? '#1E1E1E' : '#fff' }}>Nenhum cliente encontrado</p>
          <p style={{ color: '#555', fontSize: 13 }}>
            {search ? 'Tente outro termo de busca.' : 'Cadastre seu primeiro cliente.'}
          </p>
          {!search && (
            <button onClick={() => setShowModal(true)}
              className="mt-4 px-5 py-2 rounded-xl text-sm font-bold"
              style={{ background: 'linear-gradient(135deg,#D4AF37,#F0D060)', color: '#000' }}>
              + Novo Cliente
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((client, i) => {
            const zona = zonaColors[client.zone as keyof typeof zonaColors] || zonaColors.rural
            return (
              <motion.div key={client.id}
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="p-5 rounded-2xl cursor-pointer group transition-all hover:border-yellow-500/30"
                style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>

                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full flex items-center justify-center font-black text-base"
                        style={{ background: '#D4AF37', color: '#000' }}>
                        {iniciais(client.name).toUpperCase()}
                      </div>
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 border-2"
                        style={{ borderColor: '#111' }} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="font-bold text-sm" style={{ color: isLight ? '#1E1E1E' : '#fff' }}>{client.name}</div>
                        {client.status === 'archived' && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: 'rgba(136,136,136,0.18)', color: '#888' }}>
                            Arquivado
                          </span>
                        )}
                      </div>
                      <div className="text-xs" style={{ color: '#555' }}>
                        CPF {cpfMascarado(client.cpf)}
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                    style={{ background: zona.bg, color: zona.color, border: `1px solid ${zona.border}` }}>
                    {zona.label}
                  </span>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {[
                    { label: 'Documentos', value: '0' },
                    { label: 'Processos', value: '0' },
                    { label: 'Último acesso', value: '—' },
                  ].map(({ label, value }) => (
                    <div key={label} className="text-center">
                      <div className="text-sm font-bold" style={{ color: isLight ? '#1E1E1E' : '#fff' }}>{value}</div>
                      <div className="text-[10px]" style={{ color: '#555' }}>{label}</div>
                    </div>
                  ))}
                </div>

                {/* Botão */}
                <button className="w-full py-2 rounded-xl text-xs font-bold transition-all hover:opacity-80"
                  style={{ border: '1px solid rgba(212,175,55,0.25)', color: '#D4AF37', background: 'rgba(212,175,55,0.05)' }}>
                  Acessar Formulário →
                </button>
                <Link href={`/clientes/${client.id}`} className="flex items-center gap-1 text-[10px] mt-2" style={{ color: '#D4AF37' }}>
                  Ver detalhes →
                </Link>
              </motion.div>
            )
          })}

          {/* Card de adicionar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: filtered.length * 0.05 }}
            onClick={() => setShowModal(true)}
            className="p-5 rounded-2xl cursor-pointer transition-all hover:border-yellow-500/30 flex flex-col items-center justify-center gap-3"
            style={{ border: '1px dashed rgba(212,175,55,0.2)', background: 'rgba(212,175,55,0.02)', minHeight: 200 }}>
            <div className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.2)' }}>
              <Plus size={24} color="#D4AF37" />
            </div>
            <div className="text-center">
              <div className="text-sm font-bold" style={{ color: '#D4AF37' }}>Adicionar novo cliente</div>
              <div className="text-xs mt-1" style={{ color: '#555' }}>Cadastre um novo segurado</div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Contador */}
      <div className="mt-6 text-xs" style={{ color: '#555' }}>
        Mostrando {filtered.length} de {clients.length} clientes
      </div>

      {/* MODAL NOVO CLIENTE */}
      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl"
              style={{ background: '#0A0800', border: '1px solid rgba(212,175,55,0.2)',
                       boxShadow: '0 0 60px rgba(180,120,10,0.12)' }}>

              <div className="flex items-center justify-between p-6 border-b"
                style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                <div>
                  <h2 className="font-bold" style={{ color: isLight ? '#1E1E1E' : '#fff' }}>Novo Cliente</h2>
                  <p className="text-xs mt-0.5" style={{ color: '#666' }}>
                    Preencha os dados do segurado
                  </p>
                </div>
                <button onClick={() => setShowModal(false)}
                  className="text-gray-600 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-4">

                {/* Nome */}
                <div>
                  <label className="block text-[10px] font-bold tracking-widest mb-1.5"
                    style={{ color: 'rgba(212,175,55,0.7)' }}>NOME COMPLETO*</label>
                  <input type="text" value={form.name} placeholder="Maria da Silva"
                    style={{ ...inputStyle, borderColor: errors.name ? '#EF4444' : 'rgba(212,175,55,0.2)' }}
                    onChange={e => setForm(p => ({ ...p, name: e.target.value }))} spellCheck={true} />
                  {errors.name && (
                    <p className="text-xs mt-1 flex items-center gap-1" style={{ color: '#EF4444' }}>
                      <AlertCircle size={11} /> {errors.name}
                    </p>
                  )}
                </div>

                {/* CPF + RG */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold tracking-widest mb-1.5"
                      style={{ color: 'rgba(212,175,55,0.7)' }}>CPF*</label>
                    <input type="text" value={form.cpf} placeholder="000.000.000-00" maxLength={14}
                      style={{ ...inputStyle, borderColor: errors.cpf ? '#EF4444' : 'rgba(212,175,55,0.2)' }}
                      onChange={e => setForm(p => ({ ...p, cpf: mascaraCPF(e.target.value) }))} spellCheck={true} />
                    {errors.cpf && (
                      <p className="text-xs mt-1 flex items-center gap-1" style={{ color: '#EF4444' }}>
                        <AlertCircle size={11} /> {errors.cpf}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold tracking-widest mb-1.5"
                      style={{ color: 'rgba(212,175,55,0.7)' }}>RG</label>
                    <input type="text" value={form.rg} placeholder="Número do RG"
                      style={inputStyle}
                      onChange={e => setForm(p => ({ ...p, rg: e.target.value }))} spellCheck={true} />
                  </div>
                </div>

                {/* Nascimento + Profissão */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold tracking-widest mb-1.5"
                      style={{ color: 'rgba(212,175,55,0.7)' }}>DATA DE NASCIMENTO</label>
                    <input type="date" value={form.birth_date}
                      style={inputStyle}
                      onChange={e => setForm(p => ({ ...p, birth_date: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold tracking-widest mb-1.5"
                      style={{ color: 'rgba(212,175,55,0.7)' }}>PROFISSÃO</label>
                    <input type="text" value={form.profession} placeholder="Agricultora"
                      style={inputStyle}
                      onChange={e => setForm(p => ({ ...p, profession: e.target.value }))} spellCheck={true} />
                  </div>
                </div>

                {/* Telefone + WhatsApp */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold tracking-widest mb-1.5"
                      style={{ color: 'rgba(212,175,55,0.7)' }}>TELEFONE*</label>
                    <input type="text" value={form.phone} placeholder="(99) 9 9999-9999"
                      style={{ ...inputStyle, borderColor: errors.phone ? '#EF4444' : 'rgba(212,175,55,0.2)' }}
                      onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} spellCheck={true} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold tracking-widest mb-1.5"
                      style={{ color: 'rgba(212,175,55,0.7)' }}>WHATSAPP</label>
                    <input type="text" value={form.whatsapp} placeholder="(99) 9 9999-9999"
                      style={inputStyle}
                      onChange={e => setForm(p => ({ ...p, whatsapp: e.target.value }))} spellCheck={true} />
                  </div>
                </div>

                {/* Email + Zona */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold tracking-widest mb-1.5"
                      style={{ color: 'rgba(212,175,55,0.7)' }}>EMAIL</label>
                    <input type="email" value={form.email} placeholder="email@exemplo.com"
                      style={inputStyle}
                      onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold tracking-widest mb-1.5"
                      style={{ color: 'rgba(212,175,55,0.7)' }}>ZONA*</label>
                    <select value={form.zone} onChange={e => setForm(p => ({ ...p, zone: e.target.value }))}
                      style={{ ...inputStyle, cursor: 'pointer' }}>
                      <option value="rural" style={{ background: '#111' }}>🌾 Rural</option>
                      <option value="urban" style={{ background: '#111' }}>🏢 Urbano</option>
                    </select>
                  </div>
                </div>

                {/* CEP */}
                <div>
                  <label className="block text-[10px] font-bold tracking-widest mb-1.5"
                    style={{ color: 'rgba(212,175,55,0.7)' }}>CEP</label>
                  <div className="relative">
                    <input type="text" value={form.cep} placeholder="00000-000" maxLength={9}
                      style={inputStyle}
                      onChange={e => {
                        const v = mascaraCEP(e.target.value)
                        setForm(p => ({ ...p, cep: v }))
                        if (v.replace(/\D/g, '').length === 8) buscarCEP(v)
                      }} spellCheck={true} />
                    {cepLoading && (
                      <Loader2 size={14} color="#D4AF37"
                        className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin" />
                    )}
                    {!cepLoading && form.city && (
                      <CheckCircle2 size={14} color="#22C55E"
                        className="absolute right-3 top-1/2 -translate-y-1/2" />
                    )}
                  </div>
                </div>

                {/* Rua + Número */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold tracking-widest mb-1.5"
                      style={{ color: 'rgba(212,175,55,0.7)' }}>RUA</label>
                    <input type="text" value={form.rua} placeholder="Rua, avenida, estrada..."
                      style={inputStyle}
                      onChange={e => setForm(p => ({ ...p, rua: e.target.value }))} spellCheck={true} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold tracking-widest mb-1.5"
                      style={{ color: 'rgba(212,175,55,0.7)' }}>NÚMERO</label>
                    <input type="text" value={form.numero} placeholder="Nº ou S/N"
                      style={inputStyle}
                      onChange={e => setForm(p => ({ ...p, numero: e.target.value }))} spellCheck={true} />
                  </div>
                </div>

                {/* Bairro */}
                <div>
                  <label className="block text-[10px] font-bold tracking-widest mb-1.5"
                    style={{ color: 'rgba(212,175,55,0.7)' }}>BAIRRO</label>
                  <input type="text" value={form.bairro} placeholder="Bairro"
                    style={inputStyle}
                    onChange={e => setForm(p => ({ ...p, bairro: e.target.value }))} spellCheck={true} />
                </div>

                {/* Cidade + Estado */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold tracking-widest mb-1.5"
                      style={{ color: 'rgba(212,175,55,0.7)' }}>CIDADE</label>
                    <input type="text" value={form.city} placeholder="Cidade"
                      style={inputStyle}
                      onChange={e => setForm(p => ({ ...p, city: e.target.value }))} spellCheck={true} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold tracking-widest mb-1.5"
                      style={{ color: 'rgba(212,175,55,0.7)' }}>UF</label>
                    <select value={form.state} onChange={e => setForm(p => ({ ...p, state: e.target.value }))}
                      style={{ ...inputStyle, cursor: 'pointer' }}>
                      <option value="" style={{ background: '#111' }}>—</option>
                      {UFS_BRASIL.map(uf => (
                        <option key={uf} value={uf} style={{ background: '#111' }}>{uf}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Observações */}
                <div>
                  <label className="block text-[10px] font-bold tracking-widest mb-1.5"
                    style={{ color: 'rgba(212,175,55,0.7)' }}>OBSERVAÇÕES</label>
                  <textarea value={form.notes} placeholder="Informações relevantes sobre o caso..."
                    style={{ ...inputStyle, height: 80, resize: 'none' as const, paddingTop: 12 }}
                    onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} spellCheck={true} />
                </div>

                {/* Botões */}
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setShowModal(false)}
                    className="flex-1 h-11 rounded-xl text-sm font-medium transition-all hover:bg-white/5"
                    style={{ border: '1px solid rgba(255,255,255,0.1)', color: '#888' }}>
                    Cancelar
                  </button>
                  <button onClick={handleSave} disabled={saving}
                    className="flex-1 h-11 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all hover:opacity-90"
                    style={{ background: 'linear-gradient(135deg,#D4AF37,#F0D060)', color: '#000' }}>
                    {saving
                      ? <><Loader2 size={15} className="animate-spin" /> Salvando...</>
                      : '✓ Salvar Cliente'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
