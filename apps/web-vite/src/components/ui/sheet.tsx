import * as React from 'react'
import { cn } from 'cn'
import { Dialog as SheetPrimitive } from 'radix-ui'
import { XIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'

// Adaptado de shadcn/ui a docs/diseno.md y a la decisión 0009:
// - side="responsivo": hoja inferior en el celular, panel lateral derecho desde tablet.
// - Radio de 12px, sombra `shadow-overlay`, fondo sin desenfoque (plana).
// - Botón de cerrar de 44px con texto accesible en español.

function Sheet({ ...props }: React.ComponentProps<typeof SheetPrimitive.Root>) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />
}

function SheetTrigger({ ...props }: React.ComponentProps<typeof SheetPrimitive.Trigger>) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />
}

function SheetClose({ ...props }: React.ComponentProps<typeof SheetPrimitive.Close>) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />
}

function SheetPortal({ ...props }: React.ComponentProps<typeof SheetPrimitive.Portal>) {
  return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />
}

function SheetOverlay({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Overlay>) {
  return (
    <SheetPrimitive.Overlay
      data-slot="sheet-overlay"
      className={cn(
        'data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 fixed inset-0 z-50 bg-black/20 duration-150',
        className,
      )}
      {...props}
    />
  )
}

const lados = {
  derecha:
    'inset-y-0 right-0 h-full w-full max-w-md border-l data-open:slide-in-from-right-10 data-closed:slide-out-to-right-10',
  abajo:
    'inset-x-0 bottom-0 max-h-[90dvh] rounded-t-xl border-t data-open:slide-in-from-bottom-10 data-closed:slide-out-to-bottom-10',
  responsivo: cn(
    // Celular: hoja inferior
    'inset-x-0 bottom-0 max-h-[90dvh] rounded-t-xl border-t data-open:slide-in-from-bottom-10 data-closed:slide-out-to-bottom-10',
    // Desde tablet: panel lateral derecho
    'md:inset-x-auto md:inset-y-0 md:right-0 md:h-full md:max-h-none md:w-full md:max-w-md md:rounded-none md:border-t-0 md:border-l md:data-open:slide-in-from-right-10 md:data-closed:slide-out-to-right-10',
  ),
} as const

function SheetContent({
  className,
  children,
  side = 'responsivo',
  showCloseButton = true,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Content> & {
  side?: keyof typeof lados
  showCloseButton?: boolean
}) {
  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Content
        data-slot="sheet-content"
        data-side={side}
        className={cn(
          'bg-popover text-popover-foreground shadow-overlay data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 border-border fixed z-50 flex flex-col overflow-y-auto duration-200 ease-out',
          lados[side],
          className,
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <SheetPrimitive.Close data-slot="sheet-close" asChild>
            <Button variant="ghost" size="icon" className="absolute top-2 right-2">
              <XIcon weight="bold" />
              <span className="sr-only">Cerrar</span>
            </Button>
          </SheetPrimitive.Close>
        )}
      </SheetPrimitive.Content>
    </SheetPortal>
  )
}

function SheetHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sheet-header"
      className={cn('flex flex-col gap-1 px-4 pt-5 pb-2 pr-14 md:px-6', className)}
      {...props}
    />
  )
}

function SheetFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn('mt-auto flex flex-col gap-2 p-4 md:px-6', className)}
      {...props}
    />
  )
}

function SheetTitle({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Title>) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn('text-foreground text-lg font-medium', className)}
      {...props}
    />
  )
}

function SheetDescription({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Description>) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn('text-muted-foreground text-sm', className)}
      {...props}
    />
  )
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
}
