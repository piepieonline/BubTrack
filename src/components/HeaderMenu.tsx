import type { ComponentChildren } from 'preact'
import { useState } from 'preact/hooks'

const APP_VERSION: string = import.meta.env.VITE_APP_VERSION

export function HeaderMenu({ children }: { children: ComponentChildren }) {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)

  return (
    <div class="header-menu">
      <button class="menu-toggle" aria-label="Menu" aria-expanded={open} onClick={() => setOpen(!open)}>☰</button>
      {open && (
        <>
          <div class="menu-backdrop" onClick={close} />
          <div class="menu-panel" onClick={close}>
            {children}
            <p class="menu-footer">Version {APP_VERSION}</p>
          </div>
        </>
      )}
    </div>
  )
}
