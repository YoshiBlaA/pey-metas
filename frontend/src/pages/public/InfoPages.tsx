// "¿Cómo funciona?" y "Preguntas frecuentes": páginas informativas simples (no hay diseño en Figma),
// con las mismas piezas que el resto del sitio público (tarjetas, tipografía y colores).
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useIsDesktopWidth } from '../../hooks/useMediaQuery'
import { AppBar } from '../../components/Layouts'
import { ButtonLink } from '../../components/Button'
import { HeartIcon, PhoneIcon, QrIcon, ShieldIcon, TrophyIcon } from '../../components/Icons'

function InfoShell({ title, intro, children }: { title: string; intro: string; children: ReactNode }) {
  const desktop = useIsDesktopWidth()
  if (!desktop)
    return (
      <div className="pb-10">
        <AppBar title={title} backTo="/" />
        <div className="ui-content" style={{ gap: 16 }}>
          <p className="t-body">{intro}</p>
          {children}
          <ButtonLink to="/">Ver metas</ButtonLink>
        </div>
      </div>
    )
  return (
    <div className="mx-auto flex w-full max-w-[880px] flex-col gap-6 pt-6">
      <nav className="t-crumb" aria-label="Ruta">
        <Link to="/" className="hover:text-ink-700">Metas</Link><span className="mx-1.5">/</span><span>{title}</span>
      </nav>
      <div className="flex flex-col gap-2">
        <h1 className="text-[40px] font-extrabold leading-[48px]">{title}</h1>
        <p className="t-bodyL">{intro}</p>
      </div>
      {children}
      <ButtonLink to="/" className="!w-60">Ver metas</ButtonLink>
    </div>
  )
}

const STEPS = [
  { icon: HeartIcon, title: 'Elige una meta', text: 'Explora las metas abiertas y entra a la que quieras apoyar. Verás cuánto se ha reunido y cuánto falta.' },
  { icon: QrIcon, title: 'Genera tu QR de CoDi', text: 'Escoge un monto sugerido o escribe el tuyo. Puedes dejar tu nombre y un mensaje, o aportar como anónimo.' },
  { icon: PhoneIcon, title: 'Paga desde tu banco', text: 'Escanea el QR con la app de tu banco (o descárgalo y ábrelo ahí). El QR vence a los 20 minutos.' },
  { icon: TrophyIcon, title: 'Listo, la barra avanza', text: 'En cuanto el banco confirma el pago, tu aportación aparece en la meta. Al llegar al 100 % la meta se cierra sola.' },
]

export function HowItWorksPage() {
  return (
    <InfoShell title="¿Cómo funciona?" intro="Aportar a una meta toma menos de un minuto y no necesitas crear una cuenta.">
      <ol className="grid gap-3.5 md:grid-cols-2 md:gap-5">
        {STEPS.map((s, i) => (
          <li key={s.title} className="ui-card !flex-row items-start" style={{ gap: 14 }}>
            <span className="ui-tile size-11 shrink-0 bg-brand-50 text-brand-700"><s.icon className="size-5" /></span>
            <div className="flex flex-col gap-1">
              <span className="t-cap !font-semibold !text-brand-700">Paso {i + 1}</span>
              <h2 className="t-h3">{s.title}</h2>
              <p className="t-body">{s.text}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="ui-card ui-card-flat !flex-row !gap-2.5 !border-brand-100 !bg-brand-50">
        <ShieldIcon className="mt-0.5 size-[18px] shrink-0 text-brand-700" />
        <span className="t-body !text-brand-700">
          Los pagos se hacen con CoDi, el sistema de cobros del Banco de México, a través de Pey. Nosotros nunca vemos los datos de tu tarjeta ni de tu cuenta.
        </span>
      </div>
    </InfoShell>
  )
}

const FAQ = [
  { q: '¿Tiene alguna comisión?', a: 'No. El monto que eliges es el que se cobra y el que se suma a la meta.' },
  { q: '¿Qué bancos aceptan CoDi?', a: 'La mayoría de los bancos en México: BBVA, Banorte, Santander, Banamex, HSBC, Scotiabank, Banco Azteca, entre otros. Busca la opción "CoDi" o "Cobrar/Pagar con QR" en tu app.' },
  { q: '¿Puedo aportar como anónimo?', a: 'Sí. Marca "Aportar como anónimo" y en la meta aparecerás como "Anónimo".' },
  { q: '¿Qué pasa si el QR vence?', a: 'Cada QR dura 20 minutos. Si vence sin pagarse no se cobra nada; solo genera uno nuevo desde la meta.' },
  { q: 'Ya pagué, ¿por qué no aparece mi aportación?', a: 'Normalmente se refleja en segundos, en cuanto tu banco confirma el pago. Si tarda, deja abierta la pantalla del QR: se actualiza sola.' },
  { q: '¿Puedo aportar a una meta lograda?', a: 'No. Cuando una meta llega al 100 % se cierra y ya no recibe aportaciones. Puedes apoyar otra meta abierta.' },
  { q: '¿Cómo creo una meta?', a: 'Las metas las crea el equipo de administración de Pey Metas. Si quieres publicar una, contáctanos.' },
]

export function FaqPage() {
  const [open, setOpen] = useState<number | null>(0)
  return (
    <InfoShell title="Preguntas frecuentes" intro="Lo que más nos preguntan sobre las aportaciones con CoDi.">
      <section className="ui-card !gap-0 !py-1">
        {FAQ.map((item, i) => (
          <div key={item.q} className={i ? 'border-t border-line' : ''}>
            <button
              className="flex w-full items-center justify-between gap-3 py-3.5 text-left"
              onClick={() => setOpen(open === i ? null : i)}
              aria-expanded={open === i}
            >
              <span className="t-strong">{item.q}</span>
              <span className={`text-[20px] font-semibold text-brand-700 transition ${open === i ? 'rotate-45' : ''}`} aria-hidden>+</span>
            </button>
            {open === i && <p className="t-body pb-4">{item.a}</p>}
          </div>
        ))}
      </section>
    </InfoShell>
  )
}
