export default function ProductSkeleton() {
  return (
    <div className="animate-pulse space-y-4 rounded-2xl bg-card p-4 shadow-sm" aria-label="Chargement du produit" role="status">
      <div className="aspect-square rounded-2xl bg-slate-200" />
      <div className="space-y-3">
        <div className="h-5 w-4/5 rounded bg-slate-200" />
        <div className="h-4 w-3/5 rounded bg-slate-200" />
        <div className="h-12 w-full rounded-xl bg-slate-200" />
      </div>
      <span className="sr-only">Chargement des informations produit...</span>
    </div>
  )
}
