import { Link } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import HeroSlider from '../components/HeroSlider';
import { IconArrow } from '../components/Icons';
import { useCatalog } from '../context/CatalogContext';
import { useSettings } from '../context/SettingsContext';
import { dprSet, thumb } from '../utils/image';

function SectionHead({ title, to, label = 'View All' }) {
  return (
    <div className="section-head">
      <div>
        <h2>{title}</h2>
      </div>
      {to && (
        <Link to={to} className="view-all">
          {label} <IconArrow />
        </Link>
      )}
    </div>
  );
}

export default function Home() {
  const { products, categories } = useCatalog();
  const { promo } = useSettings();
  const showPromo =
    promo.enabled && Boolean(promo.title.trim() || promo.desc.trim() || promo.code.trim() || promo.ctaLabel.trim());
  const latest = products.slice(0, 10);
  const birthday = products.filter((p) => p.category === 'birthday').slice(0, 5);
  const sweetBites = products
    .filter((p) => ['cheesecakes', 'cupcakes', 'brownies', 'gift'].includes(p.category))
    .slice(0, 5);

  return (
    <main className="home">
      <section className="container">
        <HeroSlider />
      </section>

      <section className="section container" id="categories">
        <SectionHead title="Shop by Category" to="/shop" />
        <div className="cat-grid">
          {categories.map((c, i) => (
            <Link
              to={`/shop?cat=${c.slug}`}
              className="cat-tile reveal"
              key={c.slug}
              style={{ '--i': i }}
            >
              <span className="cat-img">
                <img
                  src={thumb(c.image, 240)}
                  srcSet={dprSet(c.image, 240, 480)}
                  alt=""
                  loading="lazy"
                  decoding="async"
                />
              </span>
              <strong>{c.name}</strong>
              <small>{c.bn}</small>
            </Link>
          ))}
        </div>
      </section>

      {showPromo && (
        <section className="container">
          <div className="promo-band reveal">
            <div>
              {promo.kicker.trim() && <span className="promo-kicker">{promo.kicker}</span>}
              {promo.title.trim() && <h3>{promo.title}</h3>}
              {promo.desc.trim() && <p>{promo.desc}</p>}
            </div>
            <div className="promo-right">
              {promo.code.trim() && <span className="coupon">{promo.code}</span>}
              {promo.ctaLabel.trim() && (
                <Link to={promo.ctaTo.trim() || '/shop'} className="btn dark">
                  {promo.ctaLabel} <IconArrow />
                </Link>
              )}
            </div>
          </div>
        </section>
      )}

      <section className="section container">
        <SectionHead title="Latest Products" to="/shop" />
        <div className="product-grid">
          {latest.map((p, i) => (
            <ProductCard product={p} key={p.id} index={i} />
          ))}
        </div>
        <div className="center-row">
          <Link to="/shop" className="btn outline">
            See More Products
          </Link>
        </div>
      </section>

      <section className="section soft-bg">
        <div className="container">
          <SectionHead title="Birthday Cakes" to="/shop?cat=birthday" />
          <div className="product-grid">
            {birthday.map((p, i) => (
              <ProductCard product={p} key={p.id} index={i} />
            ))}
          </div>
        </div>
      </section>

      <section className="section container">
        <SectionHead title="Sweet Bites" to="/shop?cat=cupcakes" />
        <div className="product-grid">
          {sweetBites.map((p, i) => (
            <ProductCard product={p} key={p.id} index={i} />
          ))}
        </div>
      </section>
    </main>
  );
}
