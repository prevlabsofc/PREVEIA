/**
 * Agrupamento visual de documentos por cliente (nome + CPF) e, dentro do
 * cliente, por protocolo/número de processo (`processos.numero`).
 *
 * Documents não têm FK obrigatória para processo — resolve protocolo via
 * `processo_id` (se existir), campos soltos ou `form_data`, casando com
 * `processos`. Sem match → pasta "Sem protocolo".
 */

export const CHAVE_SEM_CLIENTE = '__sem_cliente__'
export const CHAVE_SEM_PROTOCOLO = '__sem_protocolo__'
export const ROTULO_SEM_PROTOCOLO = 'Sem protocolo'
export const ROTULO_SEM_CLIENTE = 'Sem cliente vinculado'

export type DocParaPasta = {
  id: string
  title?: string | null
  type?: string | null
  agent_type?: string | null
  client_id?: string | null
  client_name?: string | null
  created_at: string
  form_data?: Record<string, unknown> | null
  /** Presente só se a coluna existir / for selecionada. */
  processo_id?: string | null
  numero_processo?: string | null
  protocolo?: string | null
}

export type ClienteParaPasta = {
  id: string
  name: string
  cpf?: string | null
  status?: string | null
}

export type ProcessoParaPasta = {
  id: string
  numero: string
  tribunal?: string | null
  cliente_id?: string | null
}

export type PastaProtocolo = {
  chave: string
  processoId: string | null
  numero: string | null
  tribunal: string | null
  rotulo: string
  documentos: DocParaPasta[]
}

export type PastaCliente = {
  chave: string
  clientId: string | null
  nome: string
  cpf: string | null
  cpfFormatado: string | null
  documentosTotal: number
  protocolos: PastaProtocolo[]
}

function soDigitos(valor: string): string {
  return valor.replace(/\D/g, '')
}

export function formatarCpfExibicao(cpf?: string | null): string | null {
  if (!cpf) return null
  const n = soDigitos(String(cpf))
  if (n.length !== 11) return String(cpf)
  return `${n.slice(0, 3)}.${n.slice(3, 6)}.${n.slice(6, 9)}-${n.slice(9)}`
}

function normalizarNumero(valor: string): string {
  return soDigitos(valor)
}

function textoFormData(fd: Record<string, unknown> | null | undefined, chave: string): string | null {
  if (!fd) return null
  const v = fd[chave]
  if (typeof v === 'string' && v.trim()) return v.trim()
  if (typeof v === 'number' && Number.isFinite(v)) return String(v)
  return null
}

/** Extrai candidato a número/protocolo do próprio documento. */
export function extrairNumeroProtocoloDoc(doc: DocParaPasta): string | null {
  const candidatos = [
    doc.numero_processo,
    doc.protocolo,
    textoFormData(doc.form_data, 'numero_processo'),
    textoFormData(doc.form_data, 'processo'),
    textoFormData(doc.form_data, 'protocolo'),
    textoFormData(doc.form_data, 'numero'),
  ]
  for (const c of candidatos) {
    if (c && String(c).trim()) return String(c).trim()
  }
  return null
}

function chaveClienteDoc(doc: DocParaPasta): string {
  if (doc.client_id) return doc.client_id
  const nome = (doc.client_name || '').trim().toLowerCase()
  if (nome) return `manual:${nome}`
  return CHAVE_SEM_CLIENTE
}

/**
 * Resolve a pasta de protocolo de um doc dentro do universo de processos
 * do cliente (ou de todos, se sem cliente).
 */
function resolverProtocolo(
  doc: DocParaPasta,
  processosCliente: ProcessoParaPasta[],
  porId: Map<string, ProcessoParaPasta>
): { chave: string; processo: ProcessoParaPasta | null } {
  if (doc.processo_id && porId.has(doc.processo_id)) {
    const p = porId.get(doc.processo_id)!
    return { chave: p.id, processo: p }
  }

  const bruto = extrairNumeroProtocoloDoc(doc)
  if (bruto) {
    const norm = normalizarNumero(bruto)
    const porNumero = processosCliente.find(
      (p) => normalizarNumero(p.numero) === norm || p.numero.trim() === bruto.trim()
    )
    if (porNumero) return { chave: porNumero.id, processo: porNumero }
    // Número informado mas sem processo cadastrado: pasta própria pelo número.
    return {
      chave: `num:${norm || bruto.trim().toLowerCase()}`,
      processo: { id: '', numero: bruto, tribunal: null, cliente_id: null },
    }
  }

  return { chave: CHAVE_SEM_PROTOCOLO, processo: null }
}

export function agruparDocumentosEmPastas(opts: {
  documentos: DocParaPasta[]
  clientes: ClienteParaPasta[]
  processos: ProcessoParaPasta[]
  /** Quando definido, retorna só a pasta desse cliente (ficha). */
  clientIdFiltro?: string | null
}): PastaCliente[] {
  const { documentos, clientes, processos, clientIdFiltro } = opts
  const clientesPorId = new Map(clientes.map((c) => [c.id, c]))
  const processosPorId = new Map(processos.map((p) => [p.id, p]))
  const processosPorCliente = new Map<string, ProcessoParaPasta[]>()
  for (const p of processos) {
    if (!p.cliente_id) continue
    const lista = processosPorCliente.get(p.cliente_id) || []
    lista.push(p)
    processosPorCliente.set(p.cliente_id, lista)
  }

  type AccCliente = {
    chave: string
    clientId: string | null
    nome: string
    cpf: string | null
    protocolos: Map<string, PastaProtocolo>
  }

  const pastas = new Map<string, AccCliente>()

  function garantirCliente(chave: string, seed?: Partial<AccCliente>): AccCliente {
    let acc = pastas.get(chave)
    if (!acc) {
      acc = {
        chave,
        clientId: seed?.clientId ?? null,
        nome: seed?.nome ?? ROTULO_SEM_CLIENTE,
        cpf: seed?.cpf ?? null,
        protocolos: new Map(),
      }
      pastas.set(chave, acc)
    }
    return acc
  }

  // Garante pastas de protocolo cadastradas mesmo sem documentos.
  for (const c of clientes) {
    if (clientIdFiltro && c.id !== clientIdFiltro) continue
    const acc = garantirCliente(c.id, {
      clientId: c.id,
      nome: c.name || 'Cliente',
      cpf: c.cpf || null,
    })
    for (const p of processosPorCliente.get(c.id) || []) {
      if (!acc.protocolos.has(p.id)) {
        acc.protocolos.set(p.id, {
          chave: p.id,
          processoId: p.id,
          numero: p.numero,
          tribunal: p.tribunal || null,
          rotulo: p.tribunal ? `${p.numero} · ${p.tribunal}` : p.numero,
          documentos: [],
        })
      }
    }
  }

  for (const doc of documentos) {
    const chaveCli = chaveClienteDoc(doc)
    if (clientIdFiltro) {
      const bateId = doc.client_id === clientIdFiltro
      const cli = clientesPorId.get(clientIdFiltro)
      const bateNome = Boolean(cli?.name && doc.client_name === cli.name)
      if (!bateId && !bateNome) continue
    }

    const cadastro = doc.client_id ? clientesPorId.get(doc.client_id) : undefined
    const acc = garantirCliente(clientIdFiltro || chaveCli, {
      clientId: doc.client_id || (clientIdFiltro ?? null),
      nome: cadastro?.name || doc.client_name || ROTULO_SEM_CLIENTE,
      cpf: cadastro?.cpf || null,
    })
    if (cadastro) {
      acc.nome = cadastro.name || acc.nome
      acc.cpf = cadastro.cpf || acc.cpf
      acc.clientId = cadastro.id
    }

    const procsCliente = acc.clientId
      ? processosPorCliente.get(acc.clientId) || []
      : processos
    const { chave: chaveProt, processo } = resolverProtocolo(doc, procsCliente, processosPorId)

    let pastaProt = acc.protocolos.get(chaveProt)
    if (!pastaProt) {
      if (chaveProt === CHAVE_SEM_PROTOCOLO) {
        pastaProt = {
          chave: CHAVE_SEM_PROTOCOLO,
          processoId: null,
          numero: null,
          tribunal: null,
          rotulo: ROTULO_SEM_PROTOCOLO,
          documentos: [],
        }
      } else {
        const numero = processo?.numero || extrairNumeroProtocoloDoc(doc) || 'Protocolo'
        pastaProt = {
          chave: chaveProt,
          processoId: processo?.id || null,
          numero,
          tribunal: processo?.tribunal || null,
          rotulo: processo?.tribunal ? `${numero} · ${processo.tribunal}` : numero,
          documentos: [],
        }
      }
      acc.protocolos.set(chaveProt, pastaProt)
    }
    pastaProt.documentos.push(doc)
  }

  // Sempre inclui "Sem protocolo" se houver docs lá; pastas vazias de protocolo
  // cadastrado já foram criadas acima.
  const resultado: PastaCliente[] = []
  for (const acc of pastas.values()) {
    if (clientIdFiltro && acc.clientId !== clientIdFiltro && acc.chave !== clientIdFiltro) {
      continue
    }

    const protocolos = Array.from(acc.protocolos.values()).sort((a, b) => {
      if (a.chave === CHAVE_SEM_PROTOCOLO) return 1
      if (b.chave === CHAVE_SEM_PROTOCOLO) return -1
      return (a.numero || a.rotulo).localeCompare(b.numero || b.rotulo, 'pt-BR')
    })

    // Remove pastas de protocolo sem docs quando o cliente não tem nenhum
    // documento (evita poluir busca vazia); na ficha do cliente mantém
    // protocolos cadastrados para o histórico centralizado.
    const comDocs = protocolos.filter((p) => p.documentos.length > 0)
    const soProtocolosCadastrados = protocolos.filter(
      (p) => p.processoId && p.chave !== CHAVE_SEM_PROTOCOLO
    )
    const listaFinal =
      clientIdFiltro || comDocs.length === 0
        ? // Ficha: protocolos + sem protocolo se tiver docs
          (() => {
            const base = soProtocolosCadastrados.length
              ? [...soProtocolosCadastrados]
              : []
            const sem = protocolos.find((p) => p.chave === CHAVE_SEM_PROTOCOLO)
            if (sem && (sem.documentos.length > 0 || base.length === 0)) {
              if (!base.some((p) => p.chave === CHAVE_SEM_PROTOCOLO)) base.push(sem)
            }
            // Inclui pastas numéricas órfãs com docs
            for (const p of comDocs) {
              if (!base.some((b) => b.chave === p.chave)) base.push(p)
            }
            return base.sort((a, b) => {
              if (a.chave === CHAVE_SEM_PROTOCOLO) return 1
              if (b.chave === CHAVE_SEM_PROTOCOLO) return -1
              return (a.numero || a.rotulo).localeCompare(b.numero || b.rotulo, 'pt-BR')
            })
          })()
        : // Lista geral: só pastas com documentos (protocolos vazios somem)
          comDocs

    const total = listaFinal.reduce((n, p) => n + p.documentos.length, 0)
    if (!clientIdFiltro && total === 0) continue

    resultado.push({
      chave: acc.chave,
      clientId: acc.clientId,
      nome: acc.nome,
      cpf: acc.cpf,
      cpfFormatado: formatarCpfExibicao(acc.cpf),
      documentosTotal: total,
      protocolos: listaFinal,
    })
  }

  resultado.sort((a, b) => {
    if (a.chave === CHAVE_SEM_CLIENTE) return 1
    if (b.chave === CHAVE_SEM_CLIENTE) return -1
    return a.nome.localeCompare(b.nome, 'pt-BR')
  })

  return resultado
}
