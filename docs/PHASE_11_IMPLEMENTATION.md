# گزارش پیاده‌سازی فاز ۱۱ — بخش پایانی (Enterprise Integration + Production Audit)

## دامنه و هدف

تکمیل فاز ۱۱ با دو محور: (۱) فعال‌سازی **احراز هویت دمو (Mock Authentication)** به‌صورت سرتاسری تا ورود کاربران واقعاً کار کند، و (۲) **حذف صفحه‌های placeholder** مسیرها با اتصال داشبورد نقش‌محور، فهرست ماژول‌ها و صفحه‌های جزئیات به روتر. همه تغییرات در لایهٔ فرانت بوده و به بزنس‌لاجیک، مخزن‌ها/سرویس‌های اصلی، مجوزها و مدل داده دست نزده است.

## معماری

جریان ورود: `LoginPage → AuthProvider/AuthService.login → AuthRepository (InMemory seeded با داده دمو) → SessionRepository (Persistent با localStorage)`.

- مخزن‌های احراز هویت از قبل وجود داشتند (`src/core/auth`، `src/features/auth/repositories`)؛ مشکل، **seed خالی** و **نبود نشست پایدار** بود.
- دادهٔ هویت دمو **ساخته نشد**؛ از `src/demo` (کاربران/سازمان دمو) بازاستفاده شد تا هویت‌ها تکراری نباشند.
- مسیربندی: `PresentationRouter → RouteSurface` که هر مسیر را به کامپوننت واقعی ماژول/جزئیات نگاشت می‌کند.

## احراز هویت دمو

| فایل | نقش |
| --- | --- |
| `src/features/auth/demoAuthSeed.ts` | نگاشت کاربران دمو به `AuthRecord`ها، نگاشت `DemoRole → RoleCode` و ثابت `DEMO_PASSWORD` |
| `src/features/auth/repositories/PersistentSessionRepository.ts` | نشست پایدار در `localStorage` (کلید `kiagostar.session`) با fallback حافظه |
| `src/app/dependencies.ts` | تزریق `new InMemoryAuthRepository(demoAuthRecords)` و `new PersistentSessionRepository()` |
| `scripts/verify-auth.ts` | اثبات ورود/نگاشت نقش/مجوز/تداوم/خروج برای همهٔ نقش‌ها + اعتبار مسیرهای جزئیات |
| `package.json` (`verify:auth`) | اسکریپت در زنجیرهٔ `npm test` |

نام کاربری = ایمیل دمو (حروف کوچک)؛ رمز عبور ثابت `DEMO_PASSWORD = 'KiaGostar@1403'`.

| نقش | ایمیل نمونه | پس از ورود |
| --- | --- | --- |
| مدیرعامل (CEO) | `ceo@kiagostar.ir` | نقش `MAIN_MANAGER` → داشبورد اجرایی |
| مدیر واحد | `usr-mgr-sales@kiagostar.ir` و سایر واحدها | نقش `DEPARTMENT_MANAGER` → داشبورد مدیر واحد |
| دبیر (Secretary) | `{secretary.id}@kiagostar.ir` | نقش `SECRETARY` → داشبورد دبیر |
| کارمند | `employee1@kiagostar.ir` و … | نقش `EMPLOYEE` → داشبورد شخصی |

## مسیربندی و حذف placeholder

`src/app/routes/RouteSurface.tsx` + `src/app/routes/dashboardTargets.ts`:

| مسیر | کامپوننت |
| --- | --- |
| `/dashboard` | داشبورد نقش‌محور (CEO/مدیر/دبیر/کارمند) |
| `/meetings`, `/meetings/calendar`, `/meetings/requests`, `/meetings/create` | فهرست/تقویم/درخواست‌ها/ایجاد جلسه |
| `/meetings/:id` | `MeetingDetailsPage` |
| `/tasks`, `/tasks/create`, `/tasks/:id` | `TasksCollectionPage` / `CreateTaskPage` / `TaskDetailsPage` |
| `/reports`, `/reports/create`, `/reports/:id` | `ReportsCollectionPage` / `CreateReportPage` / `ReportDetailsPage` |
| `/requests`, `/requests/create`, `/requests/:id` | `RequestsCollectionPage` / `CreateRequestPage` / `RequestDetailsPage` |
| `/notifications` | `NotificationsSurface` (دادهٔ واقعی از سرویس اعلان) |

- `resolveDashboardTarget(target, id)` میان اهداف داشبورد (مثلاً «باز کردن جلسه از تقویم») و مسیر واقعی/جزئیات پل می‌زند.
- کنترل دسترسی در `PresentationRouter` از قبل فعال بود (`privateRoutes` + `capability` + `can`) و برای مسیرهای جزئیات با prefix-matching (`/meetings/…`) همان مجوز ماژول اعمال می‌شود.
- کارت/سطرها با کلیک به مسیر جزئیات هدایت می‌شوند و `onBack` به فهرست ماژول برمی‌گردد.

## کیفیت و اعتبارسنجی

```bash
npx tsc -b                # پاس
npm run lint              # پاس
npm run build             # پاس
npm test                  # همهٔ verify ها پاس (EXIT=0)
```

خروجی‌های کلیدی:
- `Mock authentication passed: login, role mapping, capabilities, session persistence and logout for all demo roles.`
- `Detail route wiring passed: dashboard targets resolve list/detail/create routes and demo records expose resolvable ids.`

## شکاف‌های باقی‌مانده برای آمادگی کامل تولید

- صفحه‌های ورود ماژول‌های `organization`، `files`، `audit`، `workflow` و `performance` هنوز state خالی («اطلاعاتی برای نمایش وجود ندارد») دارند؛ اتصال آن‌ها نیازمند data-ادغام با نوع‌های دامنه (evaluation/audit/workflow instance) است و در این گام پوشش داده نشد.
- مخزن‌ها درون‌حافظه‌ای/`localStorage` هستند؛ پیش از استقرار باید adapterهای API/پایگاه‌داده، توکن‌رنو/رفرش، «فراموشی رمز» و ثبت‌نام به محیط واقعی متصل شوند.
- تست‌های فعلی SSR-based هستند؛ تست مرورگر end-to-end (حضور user) هنوز اضافه نشده است.
- `README.md` هنوز قالب پیش‌فرض Vite است و باید مستندات پروژه جایگزین آن شود.
