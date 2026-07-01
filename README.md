# ระบบออกใบเสร็จรับเงิน RMUT

ชุดนี้เป็นเวอร์ชันพร้อมอัป GitHub Pages

## เริ่มใช้งานเร็ว

1. แตกไฟล์ ZIP
2. อัปโหลดไฟล์ทั้งหมดขึ้น GitHub repository
3. เปิด GitHub Pages จาก `Settings > Pages`
4. เลือก `main` และ `/(root)`
5. รอลิงก์เว็บจาก GitHub Pages

ฐานข้อมูลกลางใช้ Firebase Realtime Database โปรดอ่าน `FIREBASE_SETUP.md`

---

# ระบบออกใบเสร็จรับเงิน มทร.สุวรรณภูมิ

## สถานะ Firebase ในแพ็กนี้

แพ็กนี้ใส่ค่า Firebase config ของโปรเจกต์ `rmut-receipt-app` ให้แล้วในไฟล์ `firebase-config.js` และเปิด `enabled: true` แล้ว

สิ่งที่ยังต้องตรวจใน Firebase Console ก่อนใช้งานหลายเครื่องจริง:

1. เปิดใช้งาน Realtime Database แล้ว
2. ตรวจว่า Database URL ตรงกับค่าใน `firebase-config.js`
3. นำ rules จากไฟล์ `firebase.rules.json` ไปวางใน Realtime Database > Rules แล้วกด Publish

ถ้าเปิดเว็บแล้วมุมบนขึ้นว่า `ฐานข้อมูลกลางเชื่อมต่อแล้ว` แปลว่าพร้อมใช้หลายเครื่องแล้ว


แพ็กนี้เป็นเว็บแอป `HTML/CSS/JavaScript` สำหรับออกใบเสร็จรับเงิน พร้อมระบบหลังบ้าน Admin/User และรองรับฐานข้อมูลกลางผ่าน **Firebase Realtime Database** เพื่อให้ใช้งานหลายเครื่องร่วมกันได้

## สถานะไฟล์นี้

เวอร์ชันนี้ทำให้ครบขึ้นแล้ว:

- ใช้งานผ่านไฟล์หลัก `index.html`
- มีหน้า Login แยก Admin และ User
- Admin เป็นผู้กำหนดรหัส User เองทั้งหมด รหัสต้องเป็นตัวเลข 4 หลัก
- Admin เปิด/ปิด User ได้
- Admin เปลี่ยน Username/Password ของ Admin ได้จากหน้า `ตั้งค่า Admin`
- มีฐานข้อมูลกลางผ่าน Firebase Realtime Database สำหรับหลายเครื่อง
- ถ้ายังไม่ได้ตั้ง Firebase ระบบจะใช้ Local DB ในเครื่องนี้ก่อน
- มีปุ่มสำรอง/นำเข้าฐานข้อมูล JSON
- ออกใบเสร็จต้นฉบับ/สำเนา
- จัดการคำนำหน้า รายการชำระเงิน โครงการ ธนาคาร เล่มใบเสร็จ ใบเสร็จ และรายงาน
- เลขใบเสร็จใช้ Firebase transaction เมื่อเปิดฐานข้อมูลกลาง เพื่อลดปัญหาเลขซ้ำจากหลายเครื่อง

## ไฟล์ที่ต้องอัปโหลดขึ้น GitHub Pages

อัปโหลดทุกไฟล์ในโฟลเดอร์นี้ขึ้น Repository:

- `index.html`
- `firebase-config.js`
- `FIREBASE_SETUP.md`
- `firebase.rules.json`
- โฟลเดอร์ `assets`
- `.nojekyll`



## วิธีเผยแพร่ด้วย GitHub Pages 

แพ็กนี้พร้อมสำหรับ GitHub Pages แล้ว ให้ดูขั้นตอนละเอียดในไฟล์ `GITHUB_PAGES_DEPLOY.md`

สรุปสั้น ๆ:

1. สร้าง GitHub repository ใหม่ เช่น `receipt-app`
2. อัปโหลดไฟล์ทั้งหมดในโฟลเดอร์นี้ โดยให้ `index.html` อยู่ชั้นบนสุด
3. ไปที่ `Settings > Pages`
4. Source เลือก `Deploy from a branch`
5. Branch เลือก `main` และ Folder เลือก `/(root)`
6. กด `Save`
7. ใช้ลิงก์ประมาณ `https://USERNAME.github.io/receipt-app/`

## วิธีเผยแพร่ให้ผู้อื่นเข้าใช้งาน

แพ็กนี้เตรียมไฟล์สำหรับ Firebase Hosting ให้แล้ว ได้แก่ `firebase.json` และ `.firebaserc`

วิธี deploy แบบสั้น:

```bash
npm install -g firebase-tools
firebase login
firebase use rmut-receipt-app
firebase deploy
```

หลัง deploy สำเร็จ ให้ส่งลิงก์ `https://rmut-receipt-app.web.app` หรือ URL ที่ Firebase แสดงให้ผู้ใช้งาน

อ่านรายละเอียดในไฟล์ `DEPLOY.md`

## วิธีเผยแพร่ด้วย GitHub Pages

1. เข้า GitHub แล้วสร้าง Repository ใหม่ เช่น `receipt-app`
2. อัปโหลดไฟล์ทั้งหมดในโฟลเดอร์นี้ขึ้น Repository
3. เข้าเมนู `Settings`
4. เลือก `Pages`
5. ที่ `Build and deployment` เลือก `Deploy from a branch`
6. เลือก Branch เป็น `main`
7. เลือก Folder เป็น `/root`
8. กด `Save`
9. รอ GitHub สร้างเว็บ แล้วเปิด URL ที่ GitHub Pages แสดงให้

## บัญชีเริ่มต้น

- Admin username: `admin`
- Admin password: `admin123`

หลังเข้าได้แล้ว แนะนำให้ไปที่แท็บ `ตั้งค่า Admin` แล้วเปลี่ยนรหัสผ่านทันที

## วิธีใช้งาน User 4 หลัก

1. เข้า Admin
2. ไปที่แท็บ `ผู้ใช้งาน`
3. กรอกรหัส User เป็นตัวเลข 4 หลัก เช่น `1234`
4. กรอกชื่อผู้ใช้งาน
5. กด `เพิ่ม User`
6. เครื่อง User ใช้รหัส 4 หลักนี้เพื่อเข้าสู่ระบบ

หมายเหตุ: ระบบไม่มี User ตัวอย่างติดมาแล้ว เพื่อให้ Admin เป็นผู้กำหนดเองทั้งหมด

## ฐานข้อมูลกลางหลายเครื่อง

ระบบนี้ใช้ไฟล์ `firebase-config.js` เพื่อเชื่อม Firebase Realtime Database

ถ้ายังไม่ได้ตั้งค่า Firebase ระบบจะแสดงสถานะ `Local DB` และข้อมูลจะอยู่เฉพาะเครื่องนั้น

เมื่อตั้งค่า Firebase แล้ว ทุกเครื่องที่เปิด URL เดียวกันจะใช้ข้อมูลเดียวกัน เช่น User, เล่มใบเสร็จ, ใบเสร็จ, รายงาน และข้อมูลหลังบ้านทั้งหมด

ดูวิธีตั้งค่าทีละขั้นตอนในไฟล์ `FIREBASE_SETUP.md`

## วิธีสำรองข้อมูล

เข้า Admin > `ฐานข้อมูลกลาง` แล้วใช้ปุ่ม:

- `สำรองฐานข้อมูล JSON` เพื่อดาวน์โหลดข้อมูลทั้งหมด
- `นำเข้า JSON` เพื่อกู้คืนข้อมูลจากไฟล์สำรอง
- `ส่งข้อมูลเครื่องนี้ขึ้นฐานกลาง` เพื่อ push ข้อมูล local ไปที่ Firebase หลังตั้งค่า Firebase สำเร็จ

## หมายเหตุด้านความปลอดภัย

เว็บนี้เป็น Static App ที่รันบน browser จึงเหมาะกับงานภายใน/ต้นแบบ/เดโม หากใช้กับข้อมูลเงินจริงในสภาพแวดล้อมสาธารณะ ควรเพิ่ม backend หรือ Firebase Authentication + Rules ที่เข้มงวดกว่าเดิม เพราะ JavaScript ฝั่ง browser ไม่สามารถซ่อนรหัสผ่านหรือสิทธิ์ Admin ได้ 100%
