export async function GET() {
  const manifest = {
    name: "Marple — Inteligência Jurídica com IA",
    short_name: "Marple",
    description: "Plataforma de IA para advogados previdenciaristas",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#050505",
    theme_color: "#D4AF37",
    orientation: "portrait-primary",
    icons: [
      { src: "/logo.png", sizes: "192x192", type: "image/png" },
      { src: "/logo.png", sizes: "512x512", type: "image/png" }
    ],
    categories: ["business", "productivity"],
    lang: "pt-BR"
  }
  return new Response(JSON.stringify(manifest), {
    headers: {
      'Content-Type': 'application/manifest+json',
      'Access-Control-Allow-Origin': '*',
    }
  })
}
