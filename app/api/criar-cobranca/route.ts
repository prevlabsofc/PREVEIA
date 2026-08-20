export async function POST(req: Request) {
    const { plano, preco, nome, email, cpf, celular, lawyerId } = await req.json()
  
    try {
      const res = await fetch('https://api.abacatepay.com/v1/billing/create', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.ABACATEPAY_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: Math.round(preco * 100),
          description: `Marple — Plano ${plano}`,
          expiresIn: 1800,
          methods: ['PIX', 'CREDIT_CARD'],
          metadata: { lawyer_id: lawyerId, plano },
          customer: { name: nome, cellphone: celular, email, taxId: cpf },
        }),
      })
  
      const data = await res.json()
      return Response.json({
        qrCode: data.pixQrCode || '',
        billingId: data.id || '',
        checkoutUrl: data.url || '',
      })
    } catch {
      return Response.json({ error: 'erro_cobranca' }, { status: 500 })
    }
  }