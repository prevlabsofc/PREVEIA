export interface ModeloPeticao {
  id: string
  label: string
  descricao: string
  agentes: string[]
}

export const MODELOS_PETICAO: ModeloPeticao[] = [
  {
    id: 'sm-rural-carencia',
    label: '🌾 Rural — indeferida por carência',
    agentes: ['salario-maternidade-rural'],
    descricao: 'A autora é agricultora em regime de economia familiar desde jovem, sem empregados. O benefício foi indeferido pelo INSS por falta de carência. O STF nas ADIs 2110 e 2111 (28/03/2024) declarou inconstitucional tal exigência. Possui certidão de nascimento da criança com endereço rural, certidão eleitoral e declaração de sindicato comprovando o labor rural.',
  },
  {
    id: 'sm-rural-prova',
    label: '🌾 Rural — indeferida por falta de prova',
    agentes: ['salario-maternidade-rural'],
    descricao: 'A autora exerce atividade rural em economia familiar. O INSS indeferiu por insuficiência de prova material. Possui documentos em nome de familiares que constituem início de prova idôneo conforme TNU Súmula 41 e prova testemunhal disponível.',
  },
  {
    id: 'sm-rural-vinculo',
    label: '🌾 Rural — com vínculo urbano antigo',
    agentes: ['salario-maternidade-rural'],
    descricao: 'A autora teve vínculo urbano no passado mas encerrou há mais de 2 anos e retornou ao trabalho rural. INSS indeferiu alegando vínculo urbano ativo. Documentação comprova o retorno à atividade rural e ausência de vínculo urbano no período.',
  },
  {
    id: 'sm-pescadora',
    label: '🐟 Pescadora artesanal',
    agentes: ['salario-maternidade-rural'],
    descricao: 'A autora é pescadora artesanal enquadrada como segurada especial nos termos do art. 11, VII, da Lei 8.213/91. Exerce a pesca em regime familiar sem empregados. Possui registro em colônia de pescadores e licença de pesca.',
  },
  {
    id: 'sm-ci',
    label: '💼 Autônoma/MEI — contribuições em dia',
    agentes: ['salario-maternidade-ci'],
    descricao: 'A autora é contribuinte individual com recolhimentos regulares ao INSS. O benefício foi indeferido por suposta ausência de carência. Possui CNIS com contribuições em dia e cumpriu os 10 meses do art. 71-B da Lei 8.213/91.',
  },
  {
    id: 'apos-rural-mulher',
    label: '👩‍🌾 Aposentadoria Rural — Mulher (55 anos)',
    agentes: ['apos-idade-rural-mulher'],
    descricao: 'A autora possui 55 anos e exerceu atividade rural em economia familiar há mais de 15 anos. INSS indeferiu por insuficiência de prova. Possui ITR/INCRA do cônjuge, certidões rurais, declaração sindical e testemunhas.',
  },
  {
    id: 'apos-rural-homem',
    label: '👨‍🌾 Aposentadoria Rural — Homem (60 anos)',
    agentes: ['apos-idade-rural-homem'],
    descricao: 'O autor possui 60 anos e trabalhou na agricultura em economia familiar. INSS negou por insuficiência de prova. Possui ITR, certidões, declaração sindical e testemunhas.',
  },
  {
    id: 'auxilio-doenca',
    label: '🏥 Auxílio-Doença — indeferido ou cessado',
    agentes: ['auxilio-incapacidade'],
    descricao: 'O segurado está incapacitado por doença comprovada. INSS indeferiu na perícia. Possui carência cumprida e documentação médica robusta.',
  },
  {
    id: 'bpc-idoso',
    label: '👴 BPC/LOAS — Idoso (65+ anos)',
    agentes: ['bpc-idoso'],
    descricao: 'Requerente com 65+ anos, renda per capita inferior a 1/4 SM. INSS indeferiu. Comprova hipossuficiência via declaração familiar e extratos.',
  },
  {
    id: 'bpc-deficiente',
    label: '♿ BPC/LOAS — Pessoa com Deficiência',
    agentes: ['bpc-deficiencia'],
    descricao: 'Requerente com deficiência comprovada por laudos. Renda per capita inferior a 1/4 SM. INSS indeferiu na perícia médica e avaliação social.',
  },
  {
    id: 'pensao-rural',
    label: '⚫ Pensão por Morte — Rural',
    agentes: ['pensao-morte-rural'],
    descricao: 'Instituidor era segurado especial rural e faleceu. INSS indeferiu por falta de prova da qualidade de segurado. Há certidão de óbito, casamento e documentos rurais.',
  },
  {
    id: 'revisao-teto',
    label: '💰 Revisão — benefício abaixo do correto',
    agentes: ['revisao-beneficio'],
    descricao: 'Segurado recebe benefício com RMI abaixo do correto. Há erro no cálculo: períodos não considerados ou salários subestimados. Solicita revisão com diferenças.',
  },
]

export function getModelosByAgente(agentType: string): ModeloPeticao[] {
  return MODELOS_PETICAO.filter(m => m.agentes.includes(agentType))
}