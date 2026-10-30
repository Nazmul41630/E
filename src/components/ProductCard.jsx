import { Link } from 'react-router-dom';
import { useShop } from '../context/ShopContext';
import { discountPercent, formatTaka } from '../data/products';
import { dprSet, thumb } from '../utils/image';
import { IconCart, IconStar } from './Icons';

export function Stars({ rating, reviews, compact = false }) {
  return (
    <span className={`rating ${compact ? 'compact' : ''}`}>
      <IconStar />
      <b>{rating.toFixed(1)}</b>
      {!compact && reviews != null && <small>({reviews})</small>}
    </span>
  );
}

export default function ProductCard({ product, index = 0 }) {
  const { addToCart } = useShop();
  const off = discountPercent(product);

  return (
    <article className="pcard reveal" style={{ '--i': index }}>
      <div className="pcard-media">
        <Link to={`/product/${product.slug}`} aria-label={product.name}>
          <img
            src={thumb(product.image, 480)}
            srcSet={dprSet(product.image, 480, 760)}
            alt={product.name}
            loading="lazy"
            decoding="async"
          />
        </Link>
        {off > 0 && <span className="badge-off">-{off}%</span>}
        {product.badge && <span className="badge-tag">{product.badge}</span>}
        {product.outOfStock && (
          <>
            <span className="stock-veil" />
            <span className="stock-label">Out of Stock</span>
          </>
        )}
      </div>
      <div className="pcard-body">
        <Link to={`/product/${product.slug}`} className="pcard-title">
          {product.name}
        </Link>
        <p className="pcard-bn">{product.bn}</p>
        <div className="pcard-rating">
          <Stars rating={product.rating} reviews={product.reviews} compact />
          {product.sizes && <span className="pcard-size">১ পাউন্ড থেকে</span>}
        </div>
        <div className="pcard-prices">
          <strong>{formatTaka(product.price)}</strong>
          {product.oldPrice && <del>{formatTaka(product.oldPrice)}</del>}
        </div>
        <button
          type="button"
          className="btn-add"
          disabled={product.outOfStock}
          onClick={() => addToCart(product)}
        >
          <IconCart />
          {product.outOfStock ? 'স্টকে নেই' : 'Add to Cart'}
        </button>
      </div>
    </article>
  );
}
