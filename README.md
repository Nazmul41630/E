# CakeHaus BD

বাংলাদেশি কেক শপের স্টোরফ্রন্ট ও এডমিন প্যানেল — React 19 + Vite 8 + Cloudflare Pages Functions + D1।
প্রোডাক্ট, ক্যাটাগরি, ব্যানার, সেটিংস, সোশ্যাল, অর্ডার ও এডমিন লগইন — সব সার্ভারে (D1) থাকে।

## চালানো (লোকাল)

```bash
npm install
npm run db:local   # D1 টেবিল তৈরি
npm run db:seed    # ৮ ক্যাটাগরি, ১৬ প্রোডাক্ট, ৩ ব্যানার, সেটিংস
npm run db:admin   # এডমিন বানায়, র‍্যান্ডম পাসওয়ার্ড প্রিন্ট করে (একবার সেভ করুন)
npm run api        # Pages Functions + লোকাল D1 → http://127.0.0.1:8788
npm run dev        # Vite → http://localhost:5199 (/api প্রক্সি হয় 8788-এ)
```

দুই টার্মিনাল লাগবে: একটা `npm run api`, আরেকটা `npm run dev`।
এডমিন: `/admin/login` · লোকাল D1 ফাইল: `.wrangler/state` (গিটে যায় না)।

## API

- `GET /api/bootstrap` — স্টোরের সব পাবলিক ডেটা (এক রিকোয়েস্টে)
- `POST /api/auth/login|logout|password`, `GET /api/auth/me`
- `POST /api/orders` · `GET /api/orders?phone=` · `GET /api/orders/:code?phone=`
- `GET/PATCH/DELETE /api/admin/orders…`, `PUT /api/admin/{products|categories|banners|settings|social}`
- `POST /api/upload` — ImgBB-তে যায়; key শুধু সার্ভারে (D1 settings), ব্রাউজারে কখনো আসে না

দাম, ডিসকাউন্ট, ডেলিভারি চার্জ সার্ভারেই হিসাব হয় — ব্রাউজারের পাঠানো টাকার উপর ভরসা করা হয় না।
সেশন: HttpOnly কুকি (`ch_session`), PBKDF2-SHA256 ১৫০k, লগইনে রেট লিমিট।

## ক্লাউডফ্লেয়ারে ডিপ্লয়

লাইভ: https://cakehaus.pages.dev (Pages প্রজেক্ট `cakehaus`, D1 `cakehaus-db` — id `wrangler.toml`-এ বসানো আছে)।

`.dev.vars` (git-ignored) এ থাকতে হবে:

```
CLOUDFLARE_API_TOKEN=<Pages:Edit + D1:Edit>
CLOUDFLARE_ACCOUNT_ID=45b5ef7259b44bd812a740d8fc452d28
```

```bash
set -a; . ./.dev.vars; set +a
npm run build
npx wrangler pages deploy dist --project-name cakehaus
```

রিমোট D1 রিসিট/সিড লাগলে:

```bash
npx wrangler d1 execute cakehaus-db --remote --file=db/schema.sql
npx wrangler d1 execute cakehaus-db --remote --file=db/seed.sql
node scripts/seed-admin.mjs --remote
```

নোট: `wrangler.toml`-এ Pages `account_id` সাপোর্ট করে না, তাই কমান্ড চালানোর আগে env-এ `CLOUDFLARE_ACCOUNT_ID` দিতে হবে।

## ছবি আপলোড

`/admin/settings`-এ ImgBB API key সেভ করলে অ্যাডমিন প্যানেলের যেকোনো ছবি সার্ভার হয়ে ImgBB-তে যায় এবং `https://i.ibb.co/...` লিংক ফেরত আসে। key না থাকলে আপলোড বন্ধ ও স্পষ্ট বার্তা দেখায়। key কখনো ক্লায়েন্টে পাঠানো হয় না — শুধু `imgbbKeySet` বুলিয়ান।
