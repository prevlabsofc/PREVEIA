'use client'

import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import { jsPDF } from 'jspdf'

type Item = {
  id: string
  tribunal?: string
  tipo?: string
  numero?: string
  assunto?: string
  ementa?: string
  data_julgamento?: string | null
  relevancia?: number
}

function quebrarTexto(doc: jsPDF, texto: string, maxWidth: number): string[] {
  return doc.splitTextToSize(texto || '', maxWidth) as string[]
}

/** A9 — gera PDF de impressão com as ementas selecionadas. */
export function ExportarPdfSelecionados({
  itens,
  selecionados,
  onFeedback,
}: {
  itens: Item[]
  selecionados: Set<string>
  onFeedback?: (texto: string, tipo?: 'ok' | 'erro') => void
}) {
  const [gerando, setGerando] = useState(false)
  const lista = itens.filter(i => selecionados.has(i.id))

  async function exportar() {
    if (lista.length === 0) {
      onFeedback?.('Selecione ao menos uma jurisprudência.', 'erro')
      return
    }
    setGerando(true)
    try {
      const doc = new jsPDF({ unit: 'mm', format: 'a4' })
      const margem = 18
      const largura = 210 - margem * 2
      let y = margem

      doc.setFont('times', 'bold')
      doc.setFontSize(14)
      doc.text('Jurisprudências selecionadas — Marple', margem, y)
      y += 8
      doc.setFont('times', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(100)
      doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')} · ${lista.length} item(ns)`, margem, y)
      doc.setTextColor(0)
      y += 10

      for (let i = 0; i < lista.length; i++) {
        const item = lista[i]
        const bloco = [
          `${item.tribunal || ''} ${[item.tipo, item.numero].filter(Boolean).join(' ')}`.trim(),
          item.assunto || '',
          item.data_julgamento
            ? `Julgamento: ${new Date(item.data_julgamento).toLocaleDateString('pt-BR')}`
            : '',
          '',
          item.ementa || '',
        ].filter(l => l !== undefined)

        const linhasAssunto = quebrarTexto(doc, bloco[1], largura)
        const linhasEmenta = quebrarTexto(doc, item.ementa || '', largura)
        const alturaEstimada = 14 + linhasAssunto.length * 5 + linhasEmenta.length * 4.5

        if (y + Math.min(alturaEstimada, 40) > 280) {
          doc.addPage()
          y = margem
        }

        doc.setDrawColor(212, 175, 55)
        doc.setLineWidth(0.3)
        doc.line(margem, y, margem + largura, y)
        y += 6

        doc.setFont('times', 'bold')
        doc.setFontSize(11)
        doc.text(`${i + 1}. ${bloco[0] || 'Sem tribunal'}`, margem, y)
        y += 6

        doc.setFont('times', 'bold')
        doc.setFontSize(10)
        for (const linha of linhasAssunto) {
          if (y > 285) { doc.addPage(); y = margem }
          doc.text(linha, margem, y)
          y += 5
        }

        if (bloco[2]) {
          doc.setFont('times', 'italic')
          doc.setFontSize(9)
          doc.setTextColor(80)
          doc.text(bloco[2], margem, y)
          doc.setTextColor(0)
          y += 5
        }

        y += 2
        doc.setFont('times', 'normal')
        doc.setFontSize(9)
        for (const linha of linhasEmenta) {
          if (y > 285) { doc.addPage(); y = margem }
          doc.text(linha, margem, y)
          y += 4.5
        }
        y += 8
      }

      doc.save(`jurisprudencias-${new Date().toISOString().slice(0, 10)}.pdf`)
      onFeedback?.(`PDF gerado com ${lista.length} jurisprudência(s).`)
    } catch {
      onFeedback?.('Falha ao gerar o PDF.', 'erro')
    } finally {
      setGerando(false)
    }
  }

  return (
    <button
      type="button"
      onClick={exportar}
      disabled={gerando || lista.length === 0}
      className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-opacity hover:opacity-90 disabled:opacity-40"
      style={{
        background: lista.length ? 'linear-gradient(135deg,#D4AF37,#F0D060)' : 'rgba(255,255,255,0.04)',
        color: lista.length ? '#000' : '#666',
        border: lista.length ? 'none' : '1px solid rgba(255,255,255,0.08)',
      }}
    >
      {gerando ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
      Exportar selecionados ({lista.length})
    </button>
  )
}
