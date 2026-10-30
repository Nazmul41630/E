# CakeHaus BD

বাংলাদেশি কেক শপের স্টোরফ্রন্ট ও এডমিন প্যানেল — React 19 + Vite 8, ডেটা localStorage-এ (ট্যাবের মধ্যে লাইভ সিঙ্ক)।

## চালানো

```bash
npm install
npm run dev      # http://localhost:5199
npm run build
npm run preview
```

## রুট

- `/` স্টোরফ্রন্ট · `/shop` · `/product/:id` · `/cart` · `/checkout` · `/orders` · `/status`
- `/admin` — ড্যাশবোর্ড, প্রোডাক্ট, অর্ডার, ব্যানার, সোশ্যাল ও যোগাযোগ

## ছবি আপলোড

`ImageField` কম্পোনেন্ট আগে ImgBB-তে ছবি পাঠায় (`/admin/settings`-এ API key থাকলে) এবং `https://i.ibb.co/...` লিংক ফেরত দেয় — তাই ছবি স্ট্যাটিক হোস্টেও দেখায়। key না থাকলে `POST /api/upload` (Vite plugin মিডলওয়্যার, magic-byte যাচাই, ৮MB সীমা, `public/uploads/`) ব্যবহার হয়। ImgBB key শুধু ব্রাউজারের localStorage-এ থাকে, কোডে বা গিটহাবে যায় না।
