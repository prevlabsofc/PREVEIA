/**
 * Valida lógica SM rural com 3 casos fictícios (sem chamar a API de IA).
 * Uso: npx tsx scripts/testar-sm-rural-casos.ts
 */

import { CASOS_TESTE_SM } from '@/lib/fixtures/sm-casos-teste'
import { motivoIndeferimentoEhCarencia } from '@/lib/peticoes/referencias-legais-sm'
import {
  ALERTA_SEM_PROVA_ATIVIDADE_RURAL,
  alertaProvasAtividadeRural,
  detectarDocsProvaAtividadeRural,
} from '@/lib/peticoes/provas-rurais-sm'
import { valorCausaSalarioMaternidade } from '@/lib/salario-minimo'
import {
  htmlComNegritoNomeInss,
  normalizarCaixaAltaEmBloco,
} from '@/lib/peticoes/formatacao-peticao'
import {
  extrairConteudoSmRural,
  isSmRuralStructured,
  montarHtmlSmRural,
} from '@/lib/peticao-sm-rural'
import { textoQualificacaoInssFixa } from '@/lib/peticoes/inss'

let falhas = 0

function ok(label: string, cond: boolean, detalhe?: string) {
  if (cond) {
    console.log(`  ✓ ${label}`)
  } else {
    falhas += 1
    console.log(`  ✗ ${label}${detalhe ? ` — ${detalhe}` : ''}`)
  }
}

console.log('=== SM rural — casos fictícios ===\n')

// Salário mínimo / data obrigatória
try {
  valorCausaSalarioMaternidade(null, { exigirDataDoFato: true })
  ok('exige data do fato (deve lançar)', false)
} catch {
  ok('exige data do fato (lança sem data)', true)
}

for (const caso of CASOS_TESTE_SM) {
  console.log(`\nCaso: ${caso.id}`)

  const tese = motivoIndeferimentoEhCarencia(caso.motivo)
  ok(
    `tese carência = ${caso.esperaTeseCarencia}`,
    tese === caso.esperaTeseCarencia,
    `obtido=${tese}`,
  )

  const docs = detectarDocsProvaAtividadeRural(caso.provas)
  const alerta = alertaProvasAtividadeRural(docs)
  ok(
    caso.esperaAlerta ? 'alerta amarelo presente' : 'sem alerta amarelo',
    caso.esperaAlerta
      ? alerta === ALERTA_SEM_PROVA_ATIVIDADE_RURAL
      : alerta === null,
    `docs=${docs.map((d) => d.id).join(',') || '(nenhum)'}`,
  )

  const vc = valorCausaSalarioMaternidade(caso.dataParto, {
    exigirDataDoFato: true,
  })
  ok(
    `SM na data do parto = R$ ${caso.smEsperado}`,
    vc.mensal === caso.smEsperado,
    `obtido=${vc.mensal}`,
  )
  ok(`valor da causa = 4×SM (${vc.totalFmt})`, vc.total === caso.smEsperado * 4)

  ok('marcadores SM estruturados', isSmRuralStructured(caso.texto))

  const advTeste = {
    name: 'Advogado Teste',
    oab_number: '12345',
    oab_uf: 'MA',
    cidade: 'São Luís',
    estado: 'MA',
  }
  const parsed = extrairConteudoSmRural({
    text: caso.texto,
    adv: advTeste,
  })
  ok('parse extrairConteudoSmRural', Boolean(parsed))
  if (!parsed) continue

  ok(
    'título contém SALÁRIO-MATERNIDADE',
    /SAL[ÁA]RIO-MATERNIDADE/i.test(parsed.titulo),
    parsed.titulo.slice(0, 80),
  )
  ok(
    'qualificação INSS (autarquia / Brasília / Procuradoria)',
    /autarquia federal/i.test(parsed.emFace) &&
      /Brasília/i.test(parsed.emFace) &&
      /Procuradoria Federal/i.test(parsed.emFace),
  )

  if (caso.esperaTeseCarencia) {
    ok(
      'fundamentação traz tese de carência',
      /carência não constitui motivo legítimo|não se sustenta/i.test(
        parsed.fundamentacao,
      ),
    )
  } else {
    ok(
      'fundamentação NÃO desenvolve tese de carência como eixo',
      !/carência não constitui motivo legítimo/i.test(parsed.fundamentacao),
    )
  }

  for (const doc of docs) {
    ok(
      `cita doc anexado: ${doc.nomePeticao.slice(0, 40)}…`,
      caso.texto.toLowerCase().includes(
        doc.nomePeticao.slice(0, 20).toLowerCase(),
      ) ||
        parsed.provas.some((p) =>
          p.toLowerCase().includes(doc.nomePeticao.slice(0, 12).toLowerCase()),
        ),
    )
  }

  const caixa = normalizarCaixaAltaEmBloco(
    'A AUTORA LABOROU EM REGIME DE ECONOMIA FAMILIAR NO MUNICÍPIO.',
  )
  ok(
    'normaliza CAIXA ALTA indevida',
    !/A AUTORA LABOROU/.test(caixa) && /A autora laborou/i.test(caixa),
  )

  const htmlNegrito = htmlComNegritoNomeInss(
    `${parsed.nomeCliente || 'Ana'} ajuizou ação contra o INSS e o Instituto Nacional do Seguro Social.`,
    (s) => s.replace(/&/g, '&amp;'),
    parsed.nomeCliente || 'Ana Lúcia Ferreira',
  )
  ok('negrito INSS', /<strong>INSS<\/strong>/.test(htmlNegrito))
  ok(
    'negrito razão social INSS',
    /<strong>Instituto Nacional do Seguro Social<\/strong>/.test(htmlNegrito),
  )

  const html = montarHtmlSmRural({
    text: caso.texto,
    adv: advTeste,
    estilo: 'classico',
  })
  ok(
    'HTML gerado com Times / 12pt / 1.5',
    Boolean(html && /Times New Roman/i.test(html) && /1\.5|150%/.test(html)),
  )
}

console.log('\nQualificação fixa INSS (constantes):')
console.log(textoQualificacaoInssFixa().slice(0, 200) + '…')

if (falhas) {
  console.error(`\n${falhas} falha(s).`)
  process.exit(1)
}
console.log('\nTodos os checks passaram.')
