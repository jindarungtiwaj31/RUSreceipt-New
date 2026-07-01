# วิธีเผยแพร่ RUSreceipt-New ด้วย GitHub Pages

โปรเจกต์นี้เป็น Static Web App จึงเผยแพร่บน GitHub Pages ได้โดยไม่ต้องมี server

## โครงสร้างไฟล์ที่ต้องอยู่ชั้นบนสุดของ repo

```text
index.html
style.css
app.js
firebase-config.js
firebase.rules.json
README.md
FIREBASE_SETUP.md
GITHUB_PAGES_DEPLOY.md
.nojekyll
```

## ตั้งค่า GitHub Pages

1. เข้า repository `jindarungtiwaj31/RUSreceipt-New`
2. ไปที่ `Settings`
3. เลือกเมนู `Pages`
4. ที่หัวข้อ `Build and deployment` เลือก `Deploy from a branch`
5. เลือก Branch: `main`
6. เลือก Folder: `/(root)`
7. กด `Save`
8. รอ GitHub สร้างเว็บประมาณครู่หนึ่ง

## URL เว็บ

```text
https://jindarungtiwaj31.github.io/RUSreceipt-New/
```

## หลังอัปเดตไฟล์

เมื่อแก้ไฟล์และ commit เข้า branch `main` แล้ว GitHub Pages จะ deploy ใหม่อัตโนมัติ อาจต้องรอสักครู่และ refresh หน้าเว็บ

## ทดสอบหลัง deploy

1. เปิด URL เว็บ
2. Login ด้วย `admin` / `admin123`
3. ตรวจว่าเข้าหน้า Dashboard ได้
4. ทดลองเพิ่ม User 4 หลัก
5. ทดลองออกใบเสร็จ 1 รายการ
6. ทดลองพิมพ์ต้นฉบับ/สำเนา
7. ทดลองสำรองฐานข้อมูล JSON

## ปัญหาที่พบบ่อย

- เปิดเว็บแล้วขึ้นหน้าเปล่า: ตรวจว่า `index.html` อยู่ชั้นบนสุดของ repo
- CSS/JS ไม่โหลด: ตรวจชื่อไฟล์ `style.css` และ `app.js`
- ข้อมูลไม่ข้ามเครื่อง: ต้องตั้งค่า Firebase ใน `firebase-config.js`
- ยังเห็นหน้าเก่า: กด hard refresh หรือรอ GitHub Pages deploy ใหม่
