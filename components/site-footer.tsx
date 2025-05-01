import Link from "next/link"

export function SiteFooter() {
  return (
    <footer className="border-t py-6 md:py-0">
      <div className="container flex flex-col items-center justify-between gap-4 md:h-16 md:flex-row">
        <div className="flex flex-col items-center gap-4 px-8 md:flex-row md:gap-2 md:px-0">
          <img
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/logo-5IpyrcCFJpEhB5Auw0LUlSwojuw1W9.webp"
            alt="GM PROMO Logo"
            className="h-6 w-auto"
          />
          <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
            &copy; {new Date().getFullYear()} GM PROMO. Todos os direitos reservados.
          </p>
        </div>
        <div className="flex gap-4">
          <Link href="#" className="text-sm text-muted-foreground hover:text-foreground">
            Termos
          </Link>
          <Link href="#" className="text-sm text-muted-foreground hover:text-foreground">
            Privacidade
          </Link>
          <Link href="#" className="text-sm text-muted-foreground hover:text-foreground">
            Contato
          </Link>
        </div>
      </div>
    </footer>
  )
}
