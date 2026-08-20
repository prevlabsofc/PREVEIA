'use client'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function TermosPage() {
  return (
    <div className="min-h-screen py-12 px-6" style={{ background: '#050505' }}>
      <div className="max-w-3xl mx-auto">
        <Link href="/registro" className="flex items-center gap-2 text-sm mb-8" style={{ color: '#D4AF37' }}>
          <ArrowLeft size={16}/> Voltar
        </Link>
        <h1 className="text-3xl font-black text-white mb-2">Termos de Uso</h1>
        <p className="text-gray-400 text-sm mb-8">Última atualização: Janeiro de 2026</p>
        <div className="space-y-6 text-gray-300 text-sm leading-relaxed">
          <section>
            <h2 className="text-white font-bold text-lg mb-3">1. Aceitação dos Termos</h2>
            <p>Ao criar uma conta no Marple, você concorda com estes Termos de Uso. O Marple é uma plataforma de inteligência artificial para auxílio jurídico, destinada exclusivamente a advogados regularmente inscritos na OAB.</p>
          </section>
          <section>
            <h2 className="text-white font-bold text-lg mb-3">2. Natureza do Serviço</h2>
            <p>O Marple é uma ferramenta de <strong className="text-white">auxílio e aceleração</strong> para profissionais do direito. As petições, pareceres e análises geradas pela plataforma são <strong className="text-white">sugestões baseadas em IA</strong> e devem ser sempre revisadas, validadas e assinadas pelo advogado responsável antes de qualquer uso profissional.</p>
            <p className="mt-3">O Marple não substitui o julgamento profissional do advogado e não se responsabiliza pelo uso indevido das peças geradas sem a devida revisão humana.</p>
          </section>
          <section>
            <h2 className="text-white font-bold text-lg mb-3">3. Uso Permitido</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>Uso exclusivo por advogados inscritos na OAB</li>
              <li>Geração de peças jurídicas para revisão e uso profissional</li>
              <li>Pesquisa e consulta de jurisprudência</li>
              <li>Gestão de clientes e processos do escritório</li>
            </ul>
          </section>
          <section>
            <h2 className="text-white font-bold text-lg mb-3">4. Uso Proibido</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>Uso por pessoas não habilitadas para exercício da advocacia</li>
              <li>Reprodução ou revenda do conteúdo gerado pela plataforma</li>
              <li>Engenharia reversa ou tentativa de acesso não autorizado</li>
              <li>Uso para fins ilegais ou antiéticos</li>
            </ul>
          </section>
          <section>
            <h2 className="text-white font-bold text-lg mb-3">5. Planos e Pagamentos</h2>
            <p>O Marple oferece planos pagos mensais e anuais. O cancelamento pode ser feito a qualquer momento, sem multa. Não há reembolso proporcional para períodos já pagos, exceto nos casos previstos no Código de Defesa do Consumidor.</p>
          </section>
          <section>
            <h2 className="text-white font-bold text-lg mb-3">6. Limitação de Responsabilidade</h2>
            <p>O Marple não se responsabiliza por decisões judiciais desfavoráveis decorrentes do uso das peças geradas pela plataforma sem a devida revisão profissional.</p>
          </section>
          <section>
            <h2 className="text-white font-bold text-lg mb-3">7. Contato</h2>
            <p>Para dúvidas sobre estes termos, entre em contato: <span style={{ color: '#D4AF37' }}>suporte@marple.com.br</span></p>
          </section>
        </div>
      </div>
    </div>
  )
}