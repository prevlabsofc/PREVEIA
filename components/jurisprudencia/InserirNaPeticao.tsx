'use client'

import { useState } from 'react'
import { FilePlus2, Loader2 } from 'lucide-react'
import {
  formatarEmentaParaPeticao,
  inserirNaPeticaoOuCopiar,
} from '@/lib/peticao-sessao'

type Item = {
  tribunal?: string | null
  tipo?: string | null
  numero?: string | null
  assunto?: string | null
  ementa?: string | null
  data_julgamento?: string | null
}

/** A10 — envia ementa à sessão ativa de petição, ou copia formatada. */
export function InserirNaPeticaoBotao({
  item,
  onFeedback,
  rotulo = 'Inserir na Petição',
  className,
}: {
  item: Item
  onFeedback: (texto: string, tipo?: 'sucesso' | 'erro') => void
  /** Texto do botão (ex.: "Importar para petição" no hub da newsletter). */
  rotulo?: string
  className?: string
}) {
  const [busy, setBusy] = useState(false)

  async function handleClick() {
    setBusy(true)
    try {
      const texto = formatarEmentaParaPeticao(item)
      const resultado = await inserirNaPeticaoOuCopiar(texto)
      if (resultado === 'inserido') {
        onFeedback('Ementa inserida na petição ativa.', 'sucesso')
      } else {
        onFeedback('Nenhuma petição ativa — ementa copiada para a área de transferência.', 'sucesso')
      }
    } catch {
      onFeedback('Não foi possível inserir ou copiar a ementa.', 'erro')
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy || !item.ementa}
      className={
        className ||
        'flex-1 h-10 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-50'
      }
      style={{ background: 'linear-gradient(135deg,#D4AF37,#F0D060)', color: '#000' }}
    >
      {busy ? <Loader2 size={15} className="animate-spin" /> : <FilePlus2 size={15} />}
      {rotulo}
    </button>
  )
}

/** Alias para imports legados. */
export const InserirNaPeticao = InserirNaPeticaoBotao
