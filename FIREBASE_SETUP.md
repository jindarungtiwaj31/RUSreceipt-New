# วิธีตั้งค่า Firebase Realtime Database สำหรับ RUSreceipt-New

ระบบนี้ใช้งานได้ทันทีด้วย Local DB ใน browser แต่ถ้าต้องการให้หลายเครื่องใช้ข้อมูลชุดเดียวกัน ให้ตั้งค่า Firebase Realtime Database แล้วใส่ค่าใน `firebase-config.js`

## 1. สร้าง Firebase project

1. เข้า Firebase Console
2. กด Add project
3. ตั้งชื่อ project เช่น `rusreceipt-new`
4. สร้าง project ให้เสร็จ

## 2. เพิ่ม Web App

1. ใน Firebase project กดไอคอน Web App
2. ตั้งชื่อ app เช่น `RUSreceipt-New`
3. คัดลอกค่า `firebaseConfig`

## 3. เปิด Realtime Database

1. ไปที่ Build > Realtime Database
2. กด Create Database
3. เลือก region ตามต้องการ เช่น Singapore / asia-southeast1
4. เริ่มต้นด้วย Test mode ได้เฉพาะช่วงทดสอบ

## 4. แก้ไฟล์ firebase-config.js

เปลี่ยน `enabled` จาก `false` เป็น `true` และใส่ค่า config ให้ครบ

```js
window.RECEIPT_APP_DATABASE_CONFIG = {
  enabled: true,
  provider: "firebase",
  appName: "RUSreceipt-New",
  firebaseSdkVersion: "10.12.5",
  path: "receipt-app/RUSreceipt-New",
  firebaseConfig: {
    apiKey: "ใส่ค่าจาก Firebase",
    authDomain: "ใส่ค่าจาก Firebase",
    databaseURL: "ใส่ค่าจาก Realtime Database",
    projectId: "ใส่ค่าจาก Firebase",
    storageBucket: "ใส่ค่าจาก Firebase",
    messagingSenderId: "ใส่ค่าจาก Firebase",
    appId: "ใส่ค่าจาก Firebase"
  }
};
```

## 5. ตั้งค่า Rules

นำเนื้อหาใน `firebase.rules.json` ไปวางที่ Realtime Database > Rules แล้วกด Publish

ค่า rules ปัจจุบันเปิดอ่าน/เขียนเฉพาะ path นี้:

```text
receipt-app/RUSreceipt-New
```

## 6. ตรวจสถานะหน้าเว็บ

เมื่อเปิดเว็บแล้ว ถ้าเชื่อมต่อสำเร็จ ป้ายมุมบนจะแสดงว่า:

```text
ฐานข้อมูลกลางเชื่อมต่อแล้ว
```

ถ้ายังไม่ได้ตั้ง Firebase หรือ config ไม่ครบ เว็บจะยังใช้งานด้วย Local DB ได้ตามปกติ

## หมายเหตุด้านความปลอดภัย

Rules ในตัวอย่างเหมาะสำหรับทดสอบ ถ้าใช้งานข้อมูลจริงควรเพิ่ม Firebase Authentication และจำกัดสิทธิ์อ่าน/เขียนให้เข้มงวดกว่าเดิม
