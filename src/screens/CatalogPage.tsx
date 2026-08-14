import { useEffect, useMemo, useState } from 'react'
import { ChevronRight, FolderOpen, Loader2, Search, ShoppingBag } from 'lucide-react'
import { getPostgrestClient } from '../lib/getPostgrestClient'

type CatalogProduct = { id: number | string; name: string; category: string; price_xof: number; image_url: string; badge?: string }

const FALLBACK_PRODUCTS: CatalogProduct[] = [
  { id: 1, name: 'Sneakers Nike Air Max', category: 'Mode & chaussures', price_xof: 58750, image_url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=420&h=320&fit=crop&auto=format', badge: 'Populaire' },
  { id: 2, name: 'Montre Xiaomi Smart Band 8', category: 'Électronique', price_xof: 42300, image_url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=420&h=320&fit=crop&auto=format', badge: 'Nouveau' },
  { id: 3, name: 'Sac à main cuir PU', category: 'Mode & accessoires', price_xof: 31500, image_url: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=420&h=320&fit=crop&auto=format' },
  { id: 4, name: 'Écouteurs Bluetooth TWS', category: 'Électronique', price_xof: 18200, image_url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=420&h=320&fit=crop&auto=format', badge: 'Promo' },
]

const CATEGORY_ICONS: Record<string, string> = {
  'Mode & chaussures': '👟',
  'Mode & accessoires': '👜',
  Électronique: '🎧',
  Maison: '🏠',
  Beauté: '✨',
  Autres: '📦',
}

interface Props { onBack?: () => void; onOpenProduct: (productId: number | string) => void }

export default function CatalogPage({ onBack, onOpenProduct }: Props) {
  const [products, setProducts] = useState<CatalogProduct[]>(FALLBACK_PRODUCTS)
  const [selectedCategory, setSelectedCategory] = useState('Toutes')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadProducts() {
      try {
        const db = await getPostgrestClient()
        const response = await db.from('products').select('id, name, price_xof, image_url, badge, category').order('rating', { ascending: false }).limit(40)
        if (Array.isArray(response.data) && response.data.length > 0) {
          setProducts(response.data.map((product) => ({ ...product, category: product.category ?? 'Autres' })))
        }
      } finally {
        setLoading(false)
      }
    }
    loadProducts().catch(() => setLoading(false))
  }, [])

  const categories = useMemo(() => ['Toutes', ...Array.from(new Set(products.map(product => product.category)))], [products])
  const filteredProducts = products.filter(product => (selectedCategory === 'Toutes' || product.category === selectedCategory) && product.name.toLowerCase().includes(query.toLowerCase()))

  return (
    <div className="h-full overflow-y-auto bg-surface pb-24">
      <header className="sticky top-0 z-20 border-b border-border bg-card/95 px-4 py-4 backdrop-blur md:px-8"><div className="mx-auto flex max-w-7xl items-center gap-3"><button type="button" onClick={onBack} className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface-muted text-text md:hidden" aria-label="Retour"><ChevronRight className="rotate-180" size={18} /></button><div><p className="text-xs font-semibold text-text-muted">Explorez notre sélection</p><h1 className="text-xl font-extrabold text-text">Catalogue</h1></div><ShoppingBag className="ml-auto text-success" size={22} /></div><label className="relative mx-auto mt-4 block max-w-7xl"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-subtle" /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Rechercher un produit" className="h-10 w-full rounded-xl border border-border bg-surface-muted pl-9 pr-4 text-sm text-text outline-none focus:border-focus" /></label></header>
      <main className="mx-auto max-w-7xl space-y-6 px-4 py-5 md:px-8"><section><div className="mb-3 flex items-center gap-2"><FolderOpen size={17} className="text-success" /><h2 className="text-sm font-extrabold text-text">Catégories</h2></div><div className="flex gap-2 overflow-x-auto pb-2">{categories.map(category => <button type="button" key={category} onClick={() => setSelectedCategory(category)} className={`flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold ${selectedCategory === category ? 'border-primary bg-primary text-white' : 'border-border bg-card text-text-muted'}`}><span>{CATEGORY_ICONS[category] ?? '🛍️'}</span>{category}</button>)}</div></section><section><div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-extrabold text-text">{selectedCategory === 'Toutes' ? 'Tous les produits' : selectedCategory}</h2><span className="text-xs font-semibold text-text-muted">{filteredProducts.length} articles</span></div>{loading ? <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" /></div> : <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">{filteredProducts.map(product => <button type="button" key={product.id} onClick={() => onOpenProduct(product.id)} className="overflow-hidden rounded-2xl border border-border bg-card text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><div className="relative"><img src={product.image_url} alt={product.name} className="h-36 w-full object-cover bg-surface-muted" />{product.badge && <span className="absolute left-2 top-2 rounded-full bg-primary px-2 py-1 text-[10px] font-bold text-white">{product.badge}</span>}</div><div className="p-3"><p className="line-clamp-2 text-xs font-bold text-text">{product.name}</p><p className="mt-2 font-mono text-sm font-extrabold text-success">{new Intl.NumberFormat('fr-SN').format(product.price_xof)} <span className="text-[10px] font-normal text-text-muted">FCFA</span></p></div></button>)}</div>}</section></main>
    </div>
  )
}
