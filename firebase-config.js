// Firebase config สำหรับ RUSreceipt-New
// Database URL ที่ใช้งาน:
// https://rusreceipt-default-rtdb.asia-southeast1.firebasedatabase.app/
//
// หมายเหตุ: ตั้งค่าให้เปิด Firebase แล้ว โดยใช้ databaseURL ที่ให้มา
// หากต้องการ config เต็ม ให้คัดลอกจาก Firebase Console > Project settings > Your apps > Web app มาแทนค่าเพิ่มเติมได้

window.RECEIPT_APP_DATABASE_CONFIG = {
  enabled: true,
  provider: "firebase",
  appName: "RUSreceipt-New",
  firebaseSdkVersion: "10.12.5",
  path: "receipt-app/RUSreceipt-New",
  firebaseConfig: {
    apiKey: "database-url-only",
    authDomain: "rusreceipt.firebaseapp.com",
    databaseURL: "https://rusreceipt-default-rtdb.asia-southeast1.firebasedatabase.app/",
    projectId: "rusreceipt",
    storageBucket: "rusreceipt.firebasestorage.app",
    messagingSenderId: "",
    appId: "database-url-only"
  }
};
