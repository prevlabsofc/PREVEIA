import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(req: Request) {
  try {
    const token = (req.headers.get('Authorization') || '').replace('Bearer ', '')
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    const { data: { user }, error } = await supabase.auth.getUser(token)
    if (error || !user) return Response.json({ error: 'unauthorized' }, { status: 401 })

    const { data: lawyer } = await supabaseAdmin.from('lawyers').select('stripe_subscription_id').eq('id', user.id).single()
    if (!lawyer?.stripe_subscription_id) return Response.json({ error: 'Nenhuma assinatura ativa' }, { status: 400 })

    // Cancela no fim do período (não imediatamente)
    await stripe.subscriptions.update(lawyer.stripe_subscription_id, { cancel_at_period_end: true })

    await supabaseAdmin.from('notifications').insert({
      lawyer_id: user.id,
      title: 'Assinatura cancelada. Você ainda tem acesso até o fim do período.',
      type: 'warning',
    })

    return Response.json({ ok: true })
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}