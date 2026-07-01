// ตั้งค่าฐานข้อมูลกลางสำหรับระบบออกใบเสร็จ
// โปรเจกต์ Firebase: rmut-receipt-app
// หมายเหตุ: ค่า databaseURL ด้านล่างใช้ URL มาตรฐานกรณีสร้าง Realtime Database ที่ Singapore / asia-southeast1
// ถ้าใน Firebase Console แสดง databaseURL คนละค่า ให้คัดลอกจาก Realtime Database > Data มาแทนค่า databaseURL นี้

window.RECEIPT_APP_DATABASE_CONFIG = {
  enabled: true,
  provider: "firebase",
  appName: "rmut-receipt-app",
  firebaseSdkVersion: "10.12.5",
  path: "receipt-app/main",
  firebaseConfig: {
    apiKey: "AIzaSyDoQFHYeaWLE1AXbQp58Fqmtnoam6GTeOI",
    authDomain: "rmut-receipt-app.firebaseapp.com",
    databaseURL: "https://rmut-receipt-app-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "rmut-receipt-app",
    storageBucket: "rmut-receipt-app.firebasestorage.app",
    messagingSenderId: "794635845962",
    appId: "1:794635845962:web:0a8e7e2f77731b327b01b3",
    measurementId: "G-1NETTTH9Q7"
  }
};
