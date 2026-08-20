import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const PLANOS: Record<string, { nome: string; mensal: number; anual: number }> = {
  starter: { nome: 'Plano Starter', mensal: 9700, anual: 97000 },
  plus: { nome: 'Plano Plus', mensal: 19700, anual: 197000 },
  premium: { nome: 'Plano Premium', mensal: 39700, anual: 397000 },
  enterprise: { nome: 'Plano Enterprise', mensal: 79700, anual: 797000 },
}

export async function POST(req: Request) {
  try {
    const { plano, lawyerId, email, anual } = await req.json()
    const config = PLANOS[plano]
    if (!config) return Response.json({ error: 'Plano inválido' }, { status: 400 })

    const valor = anual ? config.anual : config.mensal
    const intervalo = anual ? 'year' : 'month'

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: email,
      line_items: [{
        price_data: {
          currency: 'brl',
          product_data: { name: `${config.nome} (${anual ? 'Anual' : 'Mensal'})` },
          unit_amount: valor,
          recurring: { interval: intervalo as 'month' | 'year' },
        },
        quantity: 1,
      }],
      metadata: { lawyerId, plano },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/assinatura?sucesso=1`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/assinatura?cancelado=1`,
    })

    return Response.json({ url: session.url })
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}