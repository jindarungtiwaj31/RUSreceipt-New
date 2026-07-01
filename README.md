# RUSreceipt-New

เว็บระบบออกใบเสร็จรับเงินสำหรับมหาวิทยาลัยเทคโนโลยีราชมงคลสุวรรณภูมิ สร้างเป็นโปรเจกต์ใหม่โดยคงกระบวนการทำงานแบบ template เดิม: ใช้งานผ่าน GitHub Pages, ไฟล์หลัก `index.html`, ระบบ Admin/User, ฐานข้อมูลในเครื่อง และเตรียมต่อ Firebase Realtime Database สำหรับใช้งานหลายเครื่อง

## URL เว็บ

```text
https://jindarungtiwaj31.github.io/RUSreceipt-New/
```

## ไฟล์หลัก

```text
index.html
style.css
app.js
firebase-config.js
firebase.rules.json
FIREBASE_SETUP.md
GITHUB_PAGES_DEPLOY.md
.nojekyll
```

## ฟีเจอร์ที่มีในเวอร์ชันนี้

- หน้า Login แยก Admin และ User
- Admin เริ่มต้น: `admin` / `admin123`
- Admin สร้าง User ด้วยรหัสตัวเลข 4 หลัก
- เปิด/ปิด User ได้
- ตั้งค่าชื่อหน่วยงาน ชื่อระบบ ที่อยู่ และรหัส Admin ได้
- จัดการข้อมูลหลังบ้าน: คำนำหน้า รายการชำระเงิน โครงการ และธนาคาร/วิธีชำระเงิน
- จัดการเล่มใบเสร็จ Prefix เลขเริ่มต้น เลขสิ้นสุด และเลขถัดไป
- ออกใบเสร็จและพิมพ์ต้นฉบับ
- พิมพ์สำเนาจากหน้ารายงาน
- ยกเลิกใบเสร็จจากหน้ารายงาน
- Export รายงานเป็น CSV
- สำรอง/นำเข้าฐานข้อมูล JSON
- ใช้ Local DB ได้ทันที และเตรียมต่อ Firebase สำหรับฐานข้อมูลกลาง

## วิธีใช้งานเร็ว

1. เปิด URL GitHub Pages
2. Login ด้วย Admin: `admin` / `admin123`
3. ไปที่ `ตั้งค่า Admin` แล้วเปลี่ยนรหัสผ่าน
4. ไปที่ `ผู้ใช้งาน` เพื่อเพิ่ม User 4 หลัก
5. ไปที่ `ข้อมูลหลังบ้าน` เพื่อเพิ่มรายการชำระเงิน/โครงการ/ธนาคาร
6. ไปที่ `เล่มใบเสร็จ` เพื่อตั้งค่าเล่มและเลขใบเสร็จ
7. ไปที่ `ออกใบเสร็จ` เพื่อบันทึกและพิมพ์

## ฐานข้อมูล

ค่าเริ่มต้นใช้ `localStorage` ใน browser เพื่อให้เว็บใช้งานได้ทันทีโดยไม่ต้องตั้งค่า server

ถ้าต้องใช้งานหลายเครื่องร่วมกัน ให้ตั้งค่า Firebase ในไฟล์ `firebase-config.js` แล้วนำ rules จาก `firebase.rules.json` ไปวางใน Firebase Console

อ่านขั้นตอนใน `FIREBASE_SETUP.md`

## GitHub Pages

โปรเจกต์นี้เป็น Static Web App ใช้งานได้บน GitHub Pages โดยให้ตั้งค่า:

```text
Settings > Pages
Source: Deploy from a branch
Branch: main
Folder: /(root)
```

อ่านขั้นตอนใน `GITHUB_PAGES_DEPLOY.md`

## หมายเหตุด้านความปลอดภัย

เว็บนี้เป็น Static App ที่รันบน browser จึงเหมาะกับงานภายใน/ต้นแบบ/เดโม หากใช้กับข้อมูลเงินจริงในสภาพแวดล้อมสาธารณะ ควรเพิ่ม backend หรือ Firebase Authentication + Rules ที่เข้มงวดกว่าเดิม เพราะ JavaScript ฝั่ง browser ไม่สามารถซ่อนรหัสผ่านหรือสิทธิ์ Admin ได้ 100%
