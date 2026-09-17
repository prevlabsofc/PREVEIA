import { notFound } from 'next/navigation'

/** Bloqueia /dev/* em produção no Server Component (antes do client bundle). */
export default function DevLayout({ children }: { children: React.ReactNode }) {
  if (process.env.NODE_ENV === 'production') notFound()
  return children
}
