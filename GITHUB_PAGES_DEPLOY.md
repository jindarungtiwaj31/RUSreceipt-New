# วิธีเผยแพร่ด้วย GitHub Pages

## ไฟล์ชุดนี้พร้อมอัป GitHub Pages แล้ว

ให้แตก ZIP ก่อน แล้วอัปโหลดไฟล์/โฟลเดอร์ทั้งหมดขึ้น GitHub repository โดยให้ `index.html` อยู่ชั้นบนสุดของ repository

โครงสร้างที่ถูกต้อง:

```txt
index.html
firebase-config.js
firebase.rules.json
README.md
FIREBASE_SETUP.md
GITHUB_PAGES_DEPLOY.md
.nojekyll
assets/
  university-logo.png
```

> หมายเหตุ: โลโก้มุมซ้ายบนถูกฝังไว้ใน `index.html` แล้ว ต่อให้ path รูปมีปัญหา โลโก้ก็ยังแสดงได้

## ขั้นตอนตั้งค่า GitHub Pages

1. สร้าง repository ใหม่ เช่น `receipt-app`
2. แตกไฟล์ ZIP นี้
3. อัปโหลดไฟล์ทั้งหมดเข้า repository ห้ามอัปโหลด ZIP ทั้งก้อน
4. ไปที่ `Settings` > `Pages`
5. เลือก:
   - Source: `Deploy from a branch`
   - Branch: `main`
   - Folder: `/(root)`
6. กด `Save`
7. รอประมาณ 1-10 นาที

ลิงก์เว็บจะเป็นรูปแบบ:

```txt
https://USERNAME.github.io/receipt-app/
```

## ก่อนใช้งานหลายเครื่องจริง

ต้องตั้งค่า Firebase Realtime Database ให้เรียบร้อยก่อน:

1. เปิด Firebase Console
2. เข้าโปรเจกต์ `rmut-receipt-app`
3. เปิด `Realtime Database`
4. ไปที่ `Rules`
5. นำเนื้อหาในไฟล์ `firebase.rules.json` ไปวาง
6. กด `Publish`

ถ้าไม่เปิด Realtime Database ระบบอาจยังทำงานแบบ Local DB ในเครื่องเดียว
