import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { api, notify, peekBootstrap } from '../api/client';
import { categories as seedCategories, products as seedProducts } from '../data/products';

const CatalogContext = createContext(null);

export function CatalogProvider({ children }) {
  const boot = peekBootstrap();
  const [products, setProducts] = useState(() => boot?.products ?? []);
  const [categories, setCategories] = useState(() => boot?.categories ?? []);

  const refresh = useCallback(async () => {
    try {
      const data = await api('/bootstrap');
      setProducts(data.products);
      setCategories(data.categories);
    } catch {
      /* keep last known catalog */
    }
  }, []);

  const persistProducts = useCallback(
    async (next) => {
      setProducts(next);
      try {
        const data = await api('/admin/products', { method: 'PUT', body: { products: next } });
        setProducts(data.products);
      } catch (err) {
        notify(err.message);
        await refresh();
      }
    },
    [refresh],
  );

  const persistCategories = useCallback(
    async (next) => {
      setCategories(next);
      try {
        const data = await api('/admin/categories', { method: 'PUT', body: { categories: next } });
        setCategories(data.categories);
      } catch (err) {
        notify(err.message);
        await refresh();
      }
    },
    [refresh],
  );

  const addProduct = useCallback(
    (product) => persistProducts([product, ...products]),
    [persistProducts, products],
  );

  const updateProduct = useCallback(
    (id, patch) => persistProducts(products.map((p) => (p.id === id ? { ...p, ...patch } : p))),
    [persistProducts, products],
  );

  const deleteProduct = useCallback(
    (id) => persistProducts(products.filter((p) => p.id !== id)),
    [persistProducts, products],
  );

  const toggleStock = useCallback(
    (id) => persistProducts(products.map((p) => (p.id === id ? { ...p, outOfStock: !p.outOfStock } : p))),
    [persistProducts, products],
  );

  const resetProducts = useCallback(
    () => persistProducts(seedProducts.map((p) => ({ ...p }))),
    [persistProducts],
  );

  const addCategory = useCallback(
    (category) => persistCategories([...categories, category]),
    [persistCategories, categories],
  );

  const updateCategory = useCallback(
    (slug, patch) =>
      persistCategories(categories.map((c) => (c.slug === slug ? { ...c, ...patch, slug: c.slug } : c))),
    [persistCategories, categories],
  );

  const deleteCategory = useCallback(
    (slug) => persistCategories(categories.filter((c) => c.slug !== slug)),
    [persistCategories, categories],
  );

  const moveCategory = useCallback(
    (slug, dir) => {
      const from = categories.findIndex((c) => c.slug === slug);
      const to = from + dir;
      if (from < 0 || to < 0 || to >= categories.length) return;
      const next = [...categories];
      [next[from], next[to]] = [next[to], next[from]];
      persistCategories(next);
    },
    [persistCategories, categories],
  );

  const resetCategories = useCallback(
    () => persistCategories(seedCategories.map((c) => ({ ...c }))),
    [persistCategories],
  );

  const value = useMemo(
    () => ({
      products,
      categories,
      addProduct,
      updateProduct,
      deleteProduct,
      toggleStock,
      resetProducts,
      addCategory,
      updateCategory,
      deleteCategory,
      moveCategory,
      resetCategories,
    }),
    [
      products,
      categories,
      addProduct,
      updateProduct,
      deleteProduct,
      toggleStock,
      resetProducts,
      addCategory,
      updateCategory,
      deleteCategory,
      moveCategory,
      resetCategories,
    ],
  );

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog() {
  const ctx = useContext(CatalogContext);
  if (!ctx) throw new Error('useCatalog must be used inside CatalogProvider');
  return ctx;
}
