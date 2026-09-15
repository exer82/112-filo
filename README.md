# 112 Filo Yönetim Sistemi

Bu sürüm, mevcut HTML uygulamasını değiştirmeden Render gibi Node.js destekli servislerde yayınlamak için hazırlanmıştır.

## Render ayarları
- Runtime: Node
- Build Command: `npm install`
- Start Command: `npm start`

Bu sürüm PostgreSQL kullanmaz. Dolayısıyla önceki `postgres password authentication failed` hatası bu projede oluşmaz.

## Önemli
Araç ve servis kayıtları bu aşamada `localStorage` ile tarayıcıda tutulur. Site internette açılır ancak farklı cihazlarda ortak veri görünmez. Ortak veritabanı ikinci aşamada eklenebilir.
