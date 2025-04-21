"use client"

import { CartDrawer } from "./cart-drawer"
import { useCart } from "../contexts/cart-context"
import { ModeToggle } from "./mode-toggle"

export function SiteHeader() {
  const { totalValue, totalItems } = useCart()

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-bold text-lg">Marketplace Promotor</span>
        </div>

        <div className="flex items-center gap-4">
          {totalItems > 0 && (
            <div className="text-sm">
              <span className="text-muted-foreground">Total:</span> <strong>R$ {totalValue.toFixed(2)}</strong>
            </div>
          )}
          <ModeToggle />
          <CartDrawer />
        </div>
      </div>
    </header>
  )
}
