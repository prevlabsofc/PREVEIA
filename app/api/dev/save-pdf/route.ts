import { NextRequest, NextResponse } from 'next/server'
import { writeFile } from 'fs/promises'
import path from 'path'

/** Só para teste local — salva PDF (ou imagem) gerado no browser. */
export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'disabled' }, { status: 404 })
  }
  const buf = Buffer.from(await req.arrayBuffer())
  const ct = req.headers.get('content-type') || ''
  const name =
    ct.includes('image') || req.headers.get('x-filename')?.endsWith('.jpg')
      ? 'tmp-pdf-page1.jpg'
      : 'petição - ana-lucia-ferreira.pdf'
  const out = path.join(process.cwd(), name)
  await writeFile(out, buf)
  return NextResponse.json({ ok: true, path: out, bytes: buf.length })
}
