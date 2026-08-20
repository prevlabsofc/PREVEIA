import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const DOCS_LIMIT: Record<string, number> = {
  starter: 100, plus: 200, premium: 500, enterprise: 999999,
}

export async function POST(req: Request) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err: any) {
    return Response.json({ error: `Webhook error: ${err.message}` }, { status: 400 })
  }

  // Verifica idempotência: se já processamos esse evento, ignora
  const { data: existing } = await supabaseAdmin.from('stripe_events').select('id').eq('id', event.id).single()
  if (existing) {
    return Response.json({ received: true, duplicate: true })
  }

  // Marca o evento como processado ANTES de executar (evita corrida em retries simultâneos)
  const { error: insertErr } = await supabaseAdmin.from('stripe_events').insert({ id: event.id })
  if (insertErr) {
    return Response.json({ received: true, duplicate: true })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const lawyerId = session.metadata?.lawyerId
    const plano = session.metadata?.plano

    if (lawyerId && plano) {
      await supabaseAdmin.from('lawyers').update({
        plan: plano,
        docs_limit: DOCS_LIMIT[plano] || 100,
        stripe_customer_id: session.customer as string,
        stripe_subscription_id: session.subscription as string,
      }).eq('id', lawyerId)

      await supabaseAdmin.from('notifications').insert({
        lawyer_id: lawyerId,
        title: `Pagamento confirmado! Plano ${plano} ativado.`,
        type: 'success',
      })
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object as Stripe.Subscription
    await supabaseAdmin.from('lawyers').update({ plan: 'trial', docs_limit: 5 }).eq('stripe_subscription_id', sub.id)
  }

  return Response.json({ received: true })
}