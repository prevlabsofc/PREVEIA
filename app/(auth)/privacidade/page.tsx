'use client'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function PrivacidadePage() {
  return (
    <div className="min-h-screen py-12 px-6" style={{ background: '#050505' }}>
      <div className="max-w-3xl mx-auto">
        <Link href="/registro" className="flex items-center gap-2 text-sm mb-8" style={{ color: '#D4AF37' }}>
          <ArrowLeft size={16}/> Voltar
        </Link>
        <h1 className="text-3xl font-black text-white mb-2">Política de Privacidade</h1>
        <p className="text-gray-400 text-sm mb-8">Última atualização: Janeiro de 2026</p>
        <div className="space-y-6 text-gray-300 text-sm leading-relaxed">
          <section>
            <h2 className="text-white font-bold text-lg mb-3">1. Dados Coletados</h2>
            <p>Coletamos apenas os dados necessários para o funcionamento da plataforma:</p>
            <ul className="list-disc pl-5 space-y-2 mt-3">
              <li><strong className="text-white">Dados de cadastro:</strong> nome, email, CPF, número OAB, UF</li>
              <li><strong className="text-white">Dados de uso:</strong> petições geradas, clientes cadastrados</li>
              <li><strong className="text-white">Dados de pagamento:</strong> processados pelo Stripe e Abacatepay (não armazenamos dados de cartão)</li>
            </ul>
          </section>
          <section>
            <h2 className="text-white font-bold text-lg mb-3">2. Uso dos Dados</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>Prestação dos serviços contratados</li>
              <li>Envio de comunicações sobre a plataforma</li>
              <li>Melhoria dos modelos de IA (dados anonimizados)</li>
              <li>Cumprimento de obrigações legais</li>
            </ul>
          </section>
          <section>
            <h2 className="text-white font-bold text-lg mb-3">3. Proteção dos Dados (LGPD)</h2>
            <p>Em conformidade com a Lei Geral de Proteção de Dados (Lei 13.709/2018), você tem direito a:</p>
            <ul className="list-disc pl-5 space-y-2 mt-3">
              <li>Acessar seus dados pessoais</li>
              <li>Corrigir dados incorretos</li>
              <li>Solicitar exclusão da sua conta e dados</li>
              <li>Revogar consentimento a qualquer momento</li>
            </ul>
          </section>
          <section>
            <h2 className="text-white font-bold text-lg mb-3">4. Compartilhamento</h2>
            <p>Não vendemos seus dados. Compartilhamos apenas com parceiros essenciais para o funcionamento do serviço (Supabase, Stripe, Anthropic, Resend) sob acordos de confidencialidade.</p>
          </section>
          <section>
            <h2 className="text-white font-bold text-lg mb-3">5. Exclusão de Conta</h2>
            <p>Você pode solicitar a exclusão completa da sua conta e dados a qualquer momento através das Configurações da plataforma ou pelo email: <span style={{ color: '#D4AF37' }}>privacidade@marple.com.br</span></p>
          </section>
          <section>
            <h2 className="text-white font-bold text-lg mb-3">6. Contato DPO</h2>
            <p>Encarregado de Proteção de Dados: <span style={{ color: '#D4AF37' }}>privacidade@marple.com.br</span></p>
          </section>
        </div>
      </div>
    </div>
  )
}