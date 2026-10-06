# 🎲 Random Group

21 talabani 4 ta guruhga (5+5+5+6) tasodifiy bo'lish. Guruhlar faqat 21/21 bo'lgach, serverda aniqlanadi.

## Papkalar
```
random-group/
├── server.js        # Express + SQLite (butun mantiq shu yerda)
├── package.json
├── .env.example
├── .gitignore
└── public/
    ├── index.html, app.js    # talaba sahifasi
    ├── admin.html, admin.js  # o'qituvchi paneli (/admin)
    └── style.css
```

## Lokal ishga tushirish
```bash
npm install
cp .env.example .env     # ADMIN_PASSWORD ni o'zgartiring
npm start
```
Talaba: http://localhost:3000 · Admin: http://localhost:3000/admin

## Render.com'ga joylash (bepul)
1. Loyihani GitHub'ga yuklang (`.env` yuklanmaydi).
2. render.com → New → Web Service → repozitoriyni tanlang.
3. Build Command: `npm install` · Start Command: `npm start` · Plan: Free.
4. Environment bo'limida `ADMIN_PASSWORD` ni qo'shing.
5. Deploy tugagach `https://nomi.onrender.com` havolasini talabalarga yuboring.

Eslatma: bepul rejada server 15 daqiqa harakatsizlikdan keyin uxlaydi (birinchi ochilish ~30–60 soniya),
va qayta ishga tushganda baza o'chishi mumkin. Dars boshlanishidan oldin havolani o'zingiz bir marta oching
va random tugagunicha qayta deploy qilmang.
Railway'da ham xuddi shunday: `npm start`, o'zgaruvchi `ADMIN_PASSWORD`.
