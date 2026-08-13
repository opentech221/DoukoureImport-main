import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import {
  ShoppingCart,
  Share2,
  ChevronLeft,
  Star,
  Package,
  AlertTriangle,
  Heart,
} from "lucide-react";
import ShippingOptionSelector, {
  type ShippingSelectionPayload,
} from "../components/ShippingOptionSelector";
import MediaRichCarousel, {
  type MediaItem,
} from "../components/MediaRichCarousel";
import ProductStickyActions from "../components/ProductStickyActions";
import { DEFAULT_RATES, formatXOF } from "../utils/pricingEngine";
import { getPostgrestClient } from "../lib/getPostgrestClient";
import type { CartItem } from "../components/product/CartSheet";

const CartSheet = lazy(() => import("../components/product/CartSheet"));

// ---------------------------------------------------------------------------
// Données produit
// ---------------------------------------------------------------------------

const FALLBACK_PRODUCT = {
  name: "Nike Air Max 2024 — Édition Dakar",
  subtitle: "Sneakers homme cuir premium · Taille 42 EU",
  ref: "PROD-AIRMAX-2024",
  basePriceXOF: 45_000,
  estimatedWeight: 1.2,
  dimensions: { lengthCm: 32, widthCm: 22, heightCm: 12 },
  rating: 4.8,
  reviews: 142,
  shareUrl: "https://doukoure-import.sn/produit/nike-air-max-2024",
  imageUrl:
    "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=640&h=640&fit=crop&auto=format",
};

// Vidéo de démonstration publique (Big Buck Bunny clip court)
const DEMO_VIDEO_URL =
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4";

const MEDIA: MediaItem[] = [
  {
    type: "IMAGE",
    url: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=640&h=640&fit=crop&auto=format",
    thumbnail:
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=120&h=120&fit=crop&auto=format",
    alt: "Nike Air Max 2024 vue principale",
  },
  {
    type: "IMAGE",
    url: "https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=640&h=640&fit=crop&auto=format",
    thumbnail:
      "https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=120&h=120&fit=crop&auto=format",
    alt: "Nike Air Max 2024 vue latérale",
  },
  {
    type: "VIDEO",
    url: DEMO_VIDEO_URL,
    thumbnail:
      "https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?w=120&h=120&fit=crop&auto=format",
    alt: "Vidéo présentation 360°",
    duration: "24s",
  },
  {
    type: "IMAGE",
    url: "https://images.unsplash.com/photo-1584735175315-9d5df23be1be?w=640&h=640&fit=crop&auto=format",
    thumbnail:
      "https://images.unsplash.com/photo-1584735175315-9d5df23be1be?w=120&h=120&fit=crop&auto=format",
    alt: "Nike Air Max 2024 détail semelle",
  },
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Props {
  onNavigate?: (target: { screen: string; productId?: string | number | null; orderRef?: string | null }) => void;
  productId?: string | number | null;
}

// ---------------------------------------------------------------------------
// Composant principal
// ---------------------------------------------------------------------------

export default function ProductPage({ onNavigate, productId }: Props) {
  const [product, setProduct] = useState(FALLBACK_PRODUCT);
  const [loadingProduct, setLoadingProduct] = useState(false);
  const [productLoadError, setProductLoadError] = useState<string | null>(null);
  const [liked, setLiked] = useState(false);
  const [selection, setSelection] = useState<ShippingSelectionPayload | null>(
    null
  );
  const [cartOpen, setCartOpen] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  const depositAmount = selection?.pricing.depositAmount ?? 0;
  const balanceAmount = selection?.pricing.estimatedBalance ?? 0;
  const shippingOption = selection?.option ?? "AIR_EXPRESS";

  useEffect(() => {
    async function loadProduct() {
      if (productId === null || productId === undefined) {
        setProduct(FALLBACK_PRODUCT);
        setProductLoadError(null);
        return;
      }

      setLoadingProduct(true);
      setProductLoadError(null);
      const db = await getPostgrestClient();

      const { data, error } = await db
        .from("products")
        .select(
          "id, name, price_xof, rating, image_url, badge, subtitle, share_url, estimated_weight_kg, length_cm, width_cm, height_cm"
        )
        .eq("id", productId)
        .maybeSingle();

      if (error) {
        setProduct(FALLBACK_PRODUCT);
        setProductLoadError("Impossible de charger ce produit pour le moment. Données de secours affichées.");
        setLoadingProduct(false);
        return;
      }

      if (!data) {
        setProduct(FALLBACK_PRODUCT);
        setProductLoadError("Produit introuvable. Données de secours affichées.");
        setLoadingProduct(false);
        return;
      }

      const weight = Number(data.estimated_weight_kg);
      const length = Number(data.length_cm);
      const width = Number(data.width_cm);
      const height = Number(data.height_cm);

      const hasCustomDimensions =
        Number.isFinite(length) &&
        Number.isFinite(width) &&
        Number.isFinite(height) &&
        length > 0 &&
        width > 0 &&
        height > 0;

      const hasCustomWeight = Number.isFinite(weight) && weight > 0;

      setProduct({
        ...FALLBACK_PRODUCT,
        name: data.name ?? FALLBACK_PRODUCT.name,
        ref: String(data.id ?? productId),
        basePriceXOF: data.price_xof ?? FALLBACK_PRODUCT.basePriceXOF,
        rating: data.rating ?? FALLBACK_PRODUCT.rating,
        shareUrl:
          data.share_url ?? `https://doukoure-import.sn/produit/${data.id ?? productId}`,
        imageUrl: data.image_url ?? FALLBACK_PRODUCT.imageUrl,
        estimatedWeight: hasCustomWeight ? weight : FALLBACK_PRODUCT.estimatedWeight,
        dimensions: hasCustomDimensions
          ? { lengthCm: length, widthCm: width, heightCm: height }
          : FALLBACK_PRODUCT.dimensions,
        subtitle:
          data.subtitle ??
          (data.badge && String(data.badge).trim().length > 0
            ? `${FALLBACK_PRODUCT.subtitle} · ${data.badge}`
            : FALLBACK_PRODUCT.subtitle),
      });

      setLoadingProduct(false);
    }

    loadProduct();
  }, [productId]);

  const mediaList = useMemo(() => {
    return [
      {
        ...MEDIA[0],
        url: product.imageUrl,
        thumbnail: product.imageUrl,
        alt: `${product.name} vue principale`,
      },
      ...MEDIA.slice(1),
    ];
  }, [product.imageUrl, product.name]);

  function handleShare() {
    const text = `${product.name} — disponible sur Doukoure Import à partir de ${formatXOF(product.basePriceXOF)} FCFA. ${product.shareUrl}`;
    if (navigator.share) {
      navigator.share({ title: product.name, text, url: product.shareUrl }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text);
    }
  }

  function handleAddToCart() {
    setCartItems((prev) => [
      ...prev,
      {
        productName: product.name,
        shippingOption,
        depositAmount,
        balanceAmount,
      },
    ]);
    setCartOpen(true);
  }

  function handleOrderCreated(orderRef: string, target: "tracking" | "delivery" = "tracking") {
    onNavigate?.({ screen: target, orderRef });
  }

  return (
    <>
      <div
        className="min-h-screen pb-2"
        style={{
          background: "#F8FAFC",
          fontFamily: "'Plus Jakarta Sans', sans-serif",
        }}
      >
        {/* ── Header ── */}
        <div
          className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3"
          style={{ background: "#1E1B4B" }}
        >
          <button
            onClick={() => onNavigate?.({ screen: "home" })}
            className="p-2 rounded-lg transition-transform active:scale-90"
            style={{ background: "rgba(255,255,255,0.12)" }}
            aria-label="Retour"
          >
            <ChevronLeft size={18} className="text-white" />
          </button>

          <span className="text-white font-semibold text-sm flex-1 truncate">
            Fiche Produit {productId ? `#${productId}` : ''}
          </span>

          {/* Favoris */}
          <button
            onClick={() => setLiked((l) => !l)}
            className="p-2 rounded-lg transition-all active:scale-90"
            style={{ background: "rgba(255,255,255,0.12)" }}
            aria-label={liked ? "Retirer des favoris" : "Ajouter aux favoris"}
          >
            <Heart
              size={18}
              fill={liked ? "#f87171" : "none"}
              style={{ color: liked ? "#f87171" : "white" }}
            />
          </button>

          {/* Partage natif */}
          <button
            onClick={handleShare}
            className="p-2 rounded-lg transition-transform active:scale-90"
            style={{ background: "rgba(255,255,255,0.12)" }}
            aria-label="Partager"
          >
            <Share2 size={18} className="text-white" />
          </button>

          {/* Panier */}
          <button
            onClick={() => setCartOpen(true)}
            className="p-2 rounded-lg transition-transform active:scale-90 relative"
            style={{ background: "rgba(255,255,255,0.12)" }}
            aria-label="Panier"
          >
            <ShoppingCart size={18} className="text-white" />
            {cartItems.length > 0 && (
              <span
                className="absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center text-white font-bold border border-indigo-800"
                style={{ background: "#059669", fontSize: 9 }}
              >
                {cartItems.length}
              </span>
            )}
          </button>
        </div>

        {/* ── Carrousel Média ── */}
        <div className="bg-white">
          <MediaRichCarousel mediaList={mediaList} aspectRatio={0.82} />
        </div>

        {/* ── Infos produit ── */}
        <div className="px-4 pt-4 pb-3 bg-white border-b border-slate-100">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <h1
                className="font-extrabold text-lg leading-tight"
                style={{ color: "#1E1B4B" }}
              >
                {product.name}
              </h1>
              <p className="text-slate-500 text-sm mt-1">{product.subtitle}</p>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <div
                className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold"
                style={{ background: "#F0FDF4", color: "#059669" }}
              >
                <Star size={11} fill="#059669" /> {product.rating}
              </div>
              <span className="text-xs text-slate-400">
                {product.reviews} avis
              </span>
            </div>
          </div>

          {loadingProduct && (
            <p className="text-xs mt-1.5" style={{ color: "#64748B" }}>
              Chargement des informations produit...
            </p>
          )}

          {productLoadError && (
            <p className="text-xs mt-1.5" style={{ color: "#B45309" }}>
              {productLoadError}
            </p>
          )}

          {/* Badges */}
          <div className="flex flex-wrap items-center gap-2 mt-2.5">
            <span
              className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full"
              style={{ background: "#EEF2FF", color: "#4338CA" }}
            >
              <Package size={10} /> {product.estimatedWeight} kg estimé
            </span>
            <span className="text-xs text-slate-400">
              {product.dimensions.lengthCm}×{product.dimensions.widthCm}×
              {product.dimensions.heightCm} cm
            </span>
            <span
              className="text-xs font-semibold px-2.5 py-1 rounded-full"
              style={{ background: "#FFF7ED", color: "#D97706" }}
            >
              Stock limité
            </span>
          </div>

          {/* Disclaimer pesée */}
          <div
            className="mt-3 flex items-start gap-2.5 p-3 rounded-xl"
            style={{ background: "#FFFBEB" }}
          >
            <AlertTriangle
              size={14}
              style={{ color: "#D97706" }}
              className="mt-0.5 shrink-0"
            />
            <p className="text-xs leading-snug" style={{ color: "#92400E" }}>
              Le poids indiqué est <strong>estimé</strong>. Le solde final sera
              ajusté après pesée réelle à notre entrepôt en Chine. Vous serez
              notifié par WhatsApp.
            </p>
          </div>
        </div>

        {/* ── ShippingOptionSelector ── */}
        <div className="px-4 pt-5 pb-4 bg-white border-b border-slate-100">
          <ShippingOptionSelector
            basePriceXOF={product.basePriceXOF}
            estimatedWeight={product.estimatedWeight}
            dimensions={product.dimensions}
            rates={DEFAULT_RATES}
            defaultOption="AIR_EXPRESS"
            onSelectionChange={setSelection}
          />
        </div>

        {/* Espace pour la barre sticky */}
        <div className="h-36" />
      </div>

      {/* ── CTA Sticky ── */}
      <ProductStickyActions
        productName={product.name}
        productRef={product.ref}
        depositAmountXOF={depositAmount}
        selectedShippingOption={shippingOption}
        basePriceXOF={product.basePriceXOF}
        balanceXOF={balanceAmount}
        estimatedWeight={product.estimatedWeight}
        onAddToCart={handleAddToCart}
        onOrderCreated={handleOrderCreated}
      />

      {/* ── Mini-panier ── */}
      {cartOpen && (
        <Suspense fallback={null}>
          <CartSheet
            items={cartItems}
            onClose={() => setCartOpen(false)}
            onRemove={(i) =>
              setCartItems((prev) => prev.filter((_, idx) => idx !== i))
            }
          />
        </Suspense>
      )}
    </>
  );
}
