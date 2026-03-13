TeachFlow
Backend API Documentation
V1.0 — 2026

Base URL	https://teachflowbackend-production.up.railway.app
Auth Type	Bearer JWT Token
Content-Type	application/json
Response Format	{ "data": ..., "message": "..." }
Error Format	{ "statusCode": 400, "message": "..." }
 
1. Authentication
Barcha so'rovlar (auth endpointlardan tashqari) Authorization headerini talab qiladi:
Authorization: Bearer <jwt_token>
1.1 Google OAuth Login
 GET   /auth/google
Foydalanuvchini Google login sahifasiga yo'naltiradi. Browser orqali ochiladi.
Auth muvaffaqiyatli bo'lgach frontend ga redirect:
https://betamatch.vercel.app/auth/callback?token=<jwt_token>
1.2 Google OAuth Callback
 GET   /auth/google/callback
Google tomonidan chaqiriladi. To'g'ridan chaqirilmaydi.
1.3 Dev Login (faqat development)
 POST   /auth/dev-login
Request body:
{ "phone": "+998901234567" }
Response:
{ "data": { "access_token": "eyJ..." }, "message": "Login successful" }

2. Settings (Profil)
Barcha so'rovlar JWT talab qiladi.
2.1 Profil olish
 GET   /settings/profile
Response:
{   "data": {     "id": "uuid",     "short_id": "482910",     "first_name": "Asror",     "last_name": "Ibrohimov",     "email": "user@gmail.com",     "phone": null,     "plan": "free",     "language": "uz_latin",     "theme": "light",     "created_at": "2026-03-05T..."   } }
2.2 Profil yangilash
 PATCH   /settings/profile
Maydon	Tur	Tavsif
first_name	string (optional)	Ism
last_name	string (optional)	Familiya
language	uz_latin | uz_cyril | ru | en	Ilova tili
theme	light | dark	Ilova temasi
2.3 App Lock o'rnatish
 PATCH   /settings/app-lock
{ "code": "1234" }
2.4 App Lock tekshirish
 POST   /settings/app-lock/verify
{ "code": "1234" }
2.5 App Lock o'chirish
 DELETE   /settings/app-lock

 
3. Groups (Guruhlar)
3.1 Guruhlar ro'yxati
 GET   /groups
Query params (optional): ?archived=true
Response:
{   "data": [     {       "id": "uuid",       "name": "Junior English A1",       "monthly_fee": 500000,       "lesson_days": ["monday", "wednesday", "friday"],       "lesson_time": "14:00",       "color": "#3B82F6",       "is_archived": false,       "created_at": "2026-03-05T..."     }   ] }
3.2 Bitta guruh
 GET   /groups/:id
Response — guruh + KPI:
{   "data": {     "id": "uuid",     "name": "Junior English A1",     "monthly_fee": 500000,     "lesson_days": ["monday", "wednesday"],     "lesson_time": "14:00",     "color": "#3B82F6",     "total_students": 8,     "debtors": 2,     "attendance_percent": 92   } }
3.3 Guruh yaratish
 POST   /groups
Maydon	Tur	Tavsif
name	string (required)	Guruh nomi
monthly_fee	number (required)	Oylik to'lov (so'm)
lesson_days	array (required)	['monday','tuesday','wednesday','thursday','friday','saturday','sunday']
lesson_time	string (required)	24 soatlik format: '14:00'
color	string (optional)	Rang: '#3B82F6'
Request example:
{   "name": "Junior English A1",   "monthly_fee": 500000,   "lesson_days": ["monday", "wednesday", "friday"],   "lesson_time": "14:00",   "color": "#3B82F6" }
3.4 Guruh yangilash
 PATCH   /groups/:id
Xuddi yaratish bilan bir xil maydonlar, barchasi optional.
3.5 Guruhni arxivlash
 PATCH   /groups/:id/archive
Body kerak emas. Guruh arxivlanadi (o'chirilmaydi).

 
4. Students (O'quvchilar)
4.1 O'quvchilar ro'yxati
 GET   /students
Query params (optional): ?group_id=uuid&archived=true
4.2 Bitta o'quvchi
 GET   /students/:id
Response:
{   "data": {     "id": "uuid",     "student_code": "482910",     "first_name": "Ali",     "last_name": "Valiyev",     "phone": "+998901234567",     "parent_name": "Vali Valiyev",     "parent_phone": "+998901234568",     "is_archived": false,     "created_at": "2026-03-05T..."   } }
4.3 O'quvchi yaratish
 POST   /students
Maydon	Tur	Tavsif
first_name	string (required)	Ism
last_name	string (required)	Familiya
phone	string | null	Telefon raqam
parent_name	string | null	Ota-ona ismi
parent_phone	string | null	Ota-ona telefoni
Request example:
{   "first_name": "Ali",   "last_name": "Valiyev",   "phone": "+998901234567",   "parent_name": "Vali Valiyev",   "parent_phone": "+998901234568" }
4.4 O'quvchi yangilash
 PATCH   /students/:id
Maydonlar: first_name, last_name, phone, parent_name, parent_phone — barchasi optional.
MUHIM: group_id bu endpointga YUBORILMAYDI!
4.5 O'quvchini arxivlash
 PATCH   /students/:id/archive
Body kerak emas.
4.6 Guruhga qo'shish
 POST   /students/:id/groups
{ "group_id": "uuid" }
Response: { message: 'Student added to group' }
4.7 Guruhdan chiqarish
 DELETE   /students/:id/groups/:groupId
Body kerak emas.

 
5. Attendance (Davomat)
5.1 Davomat qo'shish (bulk)
 POST   /attendance
Request example:
{   "records": [     {       "group_id": "uuid",       "student_id": "uuid",       "date": "2026-03-05",       "status": "present"     },     {       "group_id": "uuid",       "student_id": "uuid",       "date": "2026-03-05",       "status": "absent"     }   ] }
status qiymatlari: present | late | absent | excused
5.2 Guruh davomati
 GET   /attendance/group/:groupId
Query params: ?month=2026-03
5.3 O'quvchi davomati
 GET   /attendance/student/:studentId
Query params: ?month=2026-03

6. Payments (To'lovlar)
6.1 To'lovlar ro'yxati
 GET   /payments
Query params: ?student_id=uuid&group_id=uuid&month_year=2026-03&status=paid
6.2 To'lov yaratish
 POST   /payments
Maydon	Tur	Tavsif
student_id	UUID (required)	O'quvchi IDsi
group_id	UUID (required)	Guruh IDsi
amount	number (required)	Summa (so'm)
month_year	string (required)	Format: '2026-03'
payment_method	string (required)	cash | card | click | transfer
status	string (required)	paid | partial | promised | prepaid
promised_date	string | null	Format: '2026-03-10' (status=promised da)
note	string | null	Izoh
6.3 To'lov yangilash
 PATCH   /payments/:id
Xuddi yaratish maydonlari, barchasi optional.
6.4 To'lovni arxivlash
 PATCH   /payments/:id/archive
6.5 Qarzdorlar
 GET   /payments/debtors
Response: qarzdor o'quvchilar ro'yxati + umumiy qarz summasi.
6.6 Moliyaviy hisobot
 GET   /payments/reports
Query params: ?month_year=2026-03
Response: expected_revenue, received, remaining, prepaid + to'lov usullari breakdown.

 
7. Reminders (Eslatmalar)
7.1 Eslatmalar ro'yxati
 GET   /reminders
Query params: ?type=promised_payment&status=overdue
7.2 Eslatma yaratish
 POST   /reminders
Maydon	Tur	Tavsif
student_id	UUID (required)	O'quvchi IDsi
type	string (required)	promised_payment | debt_due
due_date	string (required)	Format: '2026-03-10' (YYYY-MM-DD)
Request example:
{   "student_id": "uuid",   "type": "promised_payment",   "due_date": "2026-03-10" }
MUHIM: type faqat 'promised_payment' yoki 'debt_due' bo'lishi shart!
MUHIM: due_date faqat 'YYYY-MM-DD' formatda!
7.3 Eslatmalar xulosasi
 GET   /reminders/summary
Response: overdue, due_today, upcoming_3days sonlari.
7.4 Eslatma yangilash
 PATCH   /reminders/:id
7.5 Eslatmani arxivlash
 PATCH   /reminders/:id/archive

8. Messages (Xabarlar)
8.1 Xabar yuborish
 POST   /messages/send
Maydon	Tur	Tavsif
group_id	UUID | null	Guruh IDsi (guruhga yuborishda)
student_id	UUID | null	O'quvchi IDsi (individualga)
template_key	string (required)	Template kaliti
content	string (required)	Xabar matni
8.2 Xabarlar tarixi
 GET   /messages
8.3 Templatelar
 GET   /messages/templates
Response: 5 ta oldindan belgilangan template ro'yxati.

9. Archive (Arxiv)
9.1 Arxiv ro'yxati
 GET   /archive
Query params: ?type=group|student|payment
9.2 Arxivdan tiklash
 POST   /archive/restore
{ "type": "group", "id": "uuid" }
type qiymatlari: group | student | payment
9.3 Arxivni export qilish
 GET   /archive/export
Query params: ?format=pdf|excel

 
10. Admin API
Admin endpointlari Admin JWT token talab qiladi (user tokenidan farqli).
10.1 Admin login
 POST   /admin/auth/login
{ "username": "superadmin", "password": "..." }
Response:
{ "data": { "access_token": "eyJ...", "role": "super_admin" } }
10.2 Yangi admin yaratish
 POST   /admin/auth/create-admin
Faqat super_admin roli uchun. Admin JWT talab qiladi.
{ "username": "admin2" }
Response: { username, password } — parol avtomatik generatsiya qilinadi.

11. Xato Kodlari
Kod	Nomi	Ma'no
200	OK	Muvaffaqiyatli
201	Created	Yangi resurs yaratildi
400	Bad Request	Noto'g'ri so'rov (validation xato)
401	Unauthorized	Token yo'q yoki yaroqsiz — /login ga redirect
403	Forbidden	Ruxsat yo'q
404	Not Found	Resurs topilmadi
409	Conflict	Allaqachon mavjud (duplicate)
500	Server Error	Backend xatosi

12. Muhim Eslatmalar
•	Barcha so'rovlarda Content-Type: application/json bo'lishi shart
•	401 xatosida localStorage tozalansin va /login ga redirect qilinsin
•	UUID bo'lishi kerak bo'lgan joylarga 'N/A', '', undefined YUBORILMASIN — faqat null
•	lesson_time faqat '14:00' formatida (24 soatlik, HH:mm)
•	lesson_days faqat array: ['monday', 'wednesday']
•	month_year faqat '2026-03' formatida (YYYY-MM)
•	due_date faqat '2026-03-05' formatida (YYYY-MM-DD)
•	reminder type faqat 'promised_payment' yoki 'debt_due'
•	payment_method: cash | card | click | transfer
•	payment status: paid | partial | promised | prepaid
•	attendance status: present | late | absent | excused
•	PATCH /students/:id ga group_id YUBORILMAYDI
TeachFlow Backend API — V1.0 — 2026
