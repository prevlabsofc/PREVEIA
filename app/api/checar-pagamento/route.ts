export async function GET(req: Request) {
    const id = new URL(req.url).searchParams.get('id')
    if (!id) return Response.json({ paid: false })
  
    try {
      const res = await fetch(`https://api.abacatepay.com/v1/billing/${id}`, {
        headers: { 'Authorization': `Bearer ${process.env.ABACATEPAY_API_KEY}` },
      })
      const data = await res.json()
      return Response.json({ paid: data.status === 'PAID', status: data.status })
    } catch {
      return Response.json({ paid: false })
    }
  }