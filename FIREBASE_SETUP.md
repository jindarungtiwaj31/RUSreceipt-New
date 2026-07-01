# วิธีตั้งค่าฐานข้อมูลกลาง Firebase Realtime Database

โปรเจกต์นี้เป็นเว็บ Static HTML/CSS/JavaScript แต่เพิ่มตัวเชื่อม Firebase Realtime Database เพื่อให้หลายเครื่องใช้ข้อมูลเดียวกันได้

> แพ็กนี้ใส่ค่า Firebase config ที่ผู้ใช้ส่งมาแล้ว แต่ยังต้องเปิด Realtime Database และตั้ง Rules ใน Firebase Console ด้วยบัญชีของผู้ใช้งานจริง


## ตั้งค่า Firebase ของโปรเจกต์นี้เรียบร้อยแล้ว

ไฟล์ `firebase-config.js` ในแพ็กนี้ใส่ค่า Firebase ที่คุณส่งมาแล้ว และเปิด `enabled: true` แล้ว

ค่าที่ใส่ไว้:

```js
projectId: "rmut-receipt-app"
authDomain: "rmut-receipt-app.firebaseapp.com"
storageBucket: "rmut-receipt-app.firebasestorage.app"
appId: "1:794635845962:web:0a8e7e2f77731b327b01b3"
measurementId: "G-1NETTTH9Q7"
databaseURL: "https://rmut-receipt-app-default-rtdb.asia-southeast1.firebasedatabase.app"
```

หมายเหตุสำคัญ: ค่า config ที่ส่งมายังไม่มี `databaseURL` ผมจึงใส่ URL มาตรฐานสำหรับ Realtime Database ที่สร้างในโซน Singapore / asia-southeast1 ให้แล้ว ถ้าคุณสร้าง Database ใน location อื่น ให้ไปที่ Firebase Console > Realtime Database > Data แล้วคัดลอก URL จริงมาแทนค่า `databaseURL` ใน `firebase-config.js`

## 1) ตรวจ Project Firebase

โปรเจกต์ที่ใช้คือ `rmut-receipt-app` และใส่ Web App config ใน `firebase-config.js` แล้ว ขั้นตอนที่เหลือคือเปิด Realtime Database และตั้ง Rules

## 2) เปิด Realtime Database

1. ใน Firebase Console ไปที่ `Build` > `Realtime Database`
2. กด `Create Database`
3. เลือก location ใกล้ไทย เช่น Singapore / asia-southeast1 ถ้ามีให้เลือก
4. เลือกเริ่มต้นแบบ Test mode ได้ในช่วงทดสอบ

## 3) ตรวจค่า databaseURL ใน firebase-config.js

ไฟล์นี้ตั้ง `enabled: true` แล้ว และใส่ config หลักครบแล้ว ยกเว้น `databaseURL` ที่ Firebase config ที่ส่งมาไม่มีมาให้ ผมใส่ค่าเริ่มต้นเป็น Singapore / asia-southeast1:

```js
databaseURL: "https://rmut-receipt-app-default-rtdb.asia-southeast1.firebasedatabase.app"
```

ถ้า Realtime Database ของคุณอยู่ location อื่น ให้เปลี่ยนค่า `databaseURL` ให้ตรงกับ URL ที่เห็นในหน้า Realtime Database > Data

## 4) ตั้ง Rules สำหรับช่วงทดสอบ

ไปที่ Realtime Database > `Rules` แล้วใส่ rules จากไฟล์ `firebase.rules.json`

Rules ชุดนี้เปิดอ่าน/เขียนเฉพาะ path `receipt-app` สำหรับงานทดสอบ/เดโม:

```json
{
  "rules": {
    "receipt-app": {
      ".read": true,
      ".write": true
    },
    ".read": false,
    ".write": false
  }
}
```

สำคัญ: ถ้าใช้งานจริงกับข้อมูลเงินจริงหรือเปิดสาธารณะ ควรเพิ่มระบบ Firebase Authentication หรือ backend เพิ่มเติม เพราะ Rules แบบทดสอบเปิดให้หน้าเว็บอ่าน/เขียนฐานข้อมูลได้

## 5) อัปโหลดขึ้น GitHub Pages

หลังตรวจ `firebase-config.js` แล้ว ให้อัปโหลดไฟล์ทั้งหมดขึ้น GitHub Pages

ทุกเครื่องที่เปิด URL เดียวกันจะเห็นข้อมูลเดียวกัน และสถานะบนเว็บจะขึ้นว่า `ฐานข้อมูลกลางเชื่อมต่อแล้ว`

## 6) วิธีเริ่มใช้งานหลังเชื่อมฐานกลาง

1. เข้า Admin ด้วย `admin / admin123`
2. ไปแท็บ `ตั้งค่า Admin` แล้วเปลี่ยนรหัสผ่าน Admin
3. ไปแท็บ `ผู้ใช้งาน` แล้วเพิ่ม User 4 หลักเอง
4. ไปแท็บ `เล่มที่/เลขที่` ตรวจสอบเล่มใบเสร็จที่ใช้งานอยู่
5. เครื่อง User เข้าเว็บ URL เดียวกัน แล้วล็อกอินด้วยรหัส 4 หลักที่ Admin สร้าง

## 7) กรณีมีข้อมูล local เดิมก่อนเปิด Firebase

1. ตั้งค่า Firebase ให้เรียบร้อย
2. เข้า Admin > `ฐานข้อมูลกลาง`
3. กด `ส่งข้อมูลเครื่องนี้ขึ้นฐานกลาง`
4. เปิดอีกเครื่องด้วย URL เดียวกันเพื่อตรวจว่าข้อมูล sync แล้ว

## 8) การสำรองและกู้คืนข้อมูล

เข้า Admin > `ฐานข้อมูลกลาง`

- กด `สำรองฐานข้อมูล JSON` เพื่อเก็บข้อมูลทั้งหมด
- กด `นำเข้า JSON` เพื่อกู้คืนข้อมูลจากไฟล์สำรอง

ควรสำรองก่อนลบเล่มใบเสร็จหรือก่อนแก้ไขข้อมูลสำคัญ
