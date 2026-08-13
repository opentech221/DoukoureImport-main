import { Mic } from 'lucide-react'

export default function AudioWhatsAppFab() {
  const message = encodeURIComponent('Bonjour Doukoure Import, je souhaite vous laisser un message vocal au sujet d’une commande.')
  return (
    <a
      href={`https://wa.me/221770000000?text=${message}`}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-36 right-4 z-30 flex items-center gap-2 rounded-full bg-success px-4 py-3 text-xs font-bold text-white shadow-lg transition hover:bg-emerald-700 md:bottom-6 md:right-6"
      aria-label="Laisser un message vocal sur WhatsApp"
    >
      <Mic size={17} />
      <span className="hidden sm:inline">Message vocal WhatsApp</span>
    </a>
  )
}
