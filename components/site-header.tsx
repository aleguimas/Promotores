"use client"

import { CartDrawer } from "./cart-drawer"
import { useCart } from "../contexts/cart-context"
import { ModeToggle } from "./mode-toggle"
import { AuthButton } from "./auth-button"
import Link from "next/link"
import { useAuth } from "../contexts/auth-context"

export function SiteHeader() {
  const { totalValue, totalItems } = useCart()
  const { isAuthenticated } = useAuth()

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2">
            <img
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/logo-5IpyrcCFJpEhB5Auw0LUlSwojuw1W9.webp"
              alt="GM PROMO Logo"
              className="h-8 w-auto"
            />
          </Link>

          {isAuthenticated && (
            <nav className="ml-6 hidden md:flex">
              <ul className="flex items-center gap-6">
                <li>
                  <Link href="/meus-pedidos" className="text-sm font-medium transition-colors hover:text-primary">
                    Meus Pedidos
                  </Link>
                </li>
              </ul>
            </nav>
          )}
        </div>

        <div className="flex items-center gap-4">
          {totalItems > 0 && (
            <div className="text-sm">
              <span className="text-muted-foreground">Total:</span> <strong>R$ {totalValue.toFixed(2)}</strong>
            </div>
          )}
          <AuthButton />
          <ModeToggle />
          <CartDrawer />
        </div>
      </div>
    </header>
  )
}
