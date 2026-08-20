import { NextRequest, NextResponse } from 'next/server'

/**
 * Converte URL de imagem (ex.: Supabase Storage) em data-URL no servidor,
 * evitando CORS/broken-image no html2canvas do cliente.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as { url?: string }
    const url = String(body.url || '').trim()
    if (!url || !/^https?:\/\//i.test(url)) {
      return NextResponse.json({ error: 'url inválida' }, { status: 400 })
    }

    const res = await fetch(url, {
      headers: { Accept: 'image/*,*/*' },
      cache: 'no-store',
    })
    if (!res.ok) {
      return NextResponse.json(
        { error: `falha ao baixar logo (${res.status})` },
        { status: 502 },
      )
    }

    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.length < 32) {
      return NextResponse.json({ error: 'imagem vazia' }, { status: 502 })
    }
    if (buf.length > 4 * 1024 * 1024) {
      return NextResponse.json({ error: 'imagem muito grande' }, { status: 413 })
    }

    let ct = (res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase()
    if (!ct.startsWith('image/')) {
      // Inferir pelo magic number
      if (buf[0] === 0x89 && buf[1] === 0x50) ct = 'image/png'
      else if (buf[0] === 0xff && buf[1] === 0xd8) ct = 'image/jpeg'
      else if (buf[0] === 0x47 && buf[1] === 0x49) ct = 'image/gif'
      else if (buf[0] === 0x52 && buf[1] === 0x49) ct = 'image/webp'
      else ct = 'image/png'
    }

    const dataUrl = `data:${ct};base64,${buf.toString('base64')}`
    return NextResponse.json({ dataUrl })
  } catch (e) {
    console.error('[logo-data-url]', e)
    return NextResponse.json({ error: 'erro interno' }, { status: 500 })
  }
}
