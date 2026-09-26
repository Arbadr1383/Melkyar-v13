# Schema دیتابیس ملک‌یار

پیاده‌سازی فعلی: IndexedDB (یک Database به نام `melkyar_db`، هر Entity یک
Object Store). هر Store یک `id` خودکار (autoIncrement) دارد.

## Entityهای پیاده‌سازی‌شده در این فاز

### properties (فایل‌های ملکی)
تمام فیلدهای بخش ۴ سند، به‌اضافهٔ:
- `id`, `code` (کد فایل، خودکار مثل `MK-1001`)
- `ownerId` → اشاره به owners (در این فاز چون ماژول owners مستقل نیست، اطلاعات
  مالک به‌صورت Embedded در خودِ property نگه داشته می‌شود: `ownerName`,
  `ownerPhone`. وقتی ماژول owners در Priority 2 اضافه شود، این دو فیلد به یک
  رابطهٔ واقعی (ownerId) migrate می‌شوند و منسوخ اعلام می‌گردند)
- `priceHistory: [{date, field, oldValue, newValue, changedBy}]` — پیادهٔ
  بخش ۲۵ سند (تاریخچهٔ تغییرات) برای فیلد قیمت، به‌عنوان الگوی نمونه برای
  تعمیم به بقیهٔ فیلدها در فازهای بعد
- هر فیلد نامشخص، مقدار `null` می‌گیرد و در UI به‌صورت «نامشخص» نمایش داده
  می‌شود — هرگز حدس زده نمی‌شود (طبق بخش ۳۷ سند)
- `createdAt`, `updatedAt`

### customers (مشتری‌ها)
تمام فیلدهای بخش ۹ سند:
`name, phone, type, budgetMin, budgetMax, desiredAreas[], desiredMeterage,
desiredBedrooms, requiredFeatures[], dealType, description, lastContact,
nextFollowup, status, favoriteProperties[], visitedProperties[],
sentProperties[], tags[], communicationHistory[], createdAt, updatedAt`

`status` مقادیر بخش ۹: `seeking | wanted | not_contacted | following |
active | inactive | closed_deal`

### activities (Audit Log سبک)
`{id, entityType, entityId, action, field, oldValue, newValue, actor, date}`
پایهٔ Audit Log کلی سیستم (بخش ۳۰ و ۲۵) — در این فاز فقط برای تغییر قیمت
property استفاده می‌شود؛ در فازهای بعد به تمام Entityها تعمیم می‌یابد.

### settings
`{key, value}` — key-value ساده، برای تنظیمات مثل تم (روشن/تاریک)، وزن
معیارهای Matching (بخش ۱۰ سند — هنوز پیاده نشده)، فرمول کمیسیون (بخش ۱۸).

## Entityهای رزروشده برای فازهای بعد (هنوز در دیتابیس ساخته نشده‌اند)

مطابق بخش ۳۶ سند، این Entityها باید در فازهای بعد اضافه شوند و روابطشان با
Entityهای فعلی برقرار شود تا از Duplicate Data جلوگیری شود:

```
users            → روابط با roles, permissions, activities (audit "actor")
roles / permissions
owners           → properties.ownerId جایگزین ownerName/ownerPhone می‌شود
builders         → projects → properties (فایل‌های پیش‌فروش مرتبط)
projects
visits           → customerId + propertyId
followups        → customerId (و به‌صورت اختیاری propertyId)
deals            → propertyId + buyerId + sellerId(customerId/ownerId)
commissions      → dealId
transactions     → accountId
accounts         → (بانک/کارت/نقد/دفتر/شخصی)
loans
partners         → همکاران (طلب/بدهی/تسویه)
media            → propertyId (در این فاز، عکس‌ها به‌صورت base64 Embedded
                    در property.media[] هستند؛ در فاز بعد به Store مستقل
                    با propertyId منتقل می‌شوند تا حجم property سبک بماند)
messages
notifications
tags             → در این فاز tags[] به‌صورت آرایهٔ رشته در خودِ Entity است؛
                    تبدیل به Store مستقل با رنگ/دسته در فاز بعد
subscriptions
```

## چرا این جداسازی مرحله‌ای؟

طبق قانون بخش ۵۳ سند: «هر قابلیت جدیدی که اضافه می‌شود نباید باعث خراب شدن
قابلیت‌های قبلی شود.» ساختن ۲۵ Entity به‌صورت نصفه‌کاره ریسک ناسازگاری در فاز
بعد را بالا می‌برد. به‌جای آن، هر Entity وقتی کامل اضافه می‌شود که ماژولی که
واقعاً از آن استفاده می‌کند هم ساخته شود.


### userRequests
درخواست‌های ساخت کاربر جدید در نسخه 6 برای تأیید سازنده نگهداری می‌شوند؛ اطلاعات قبلی حذف نمی‌شود.
