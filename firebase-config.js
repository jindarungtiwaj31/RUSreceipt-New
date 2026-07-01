// Firebase config สำหรับ RUSreceipt-New
// ค่าเริ่มต้นปิด Firebase ไว้ก่อน เพื่อให้เว็บรันได้ทันทีด้วย Local DB
// เมื่อต้องการใช้งานหลายเครื่อง ให้สร้าง Firebase Realtime Database แล้วนำ config มาใส่ด้านล่าง

window.RECEIPT_APP_DATABASE_CONFIG = {
  enabled: false,
  provider: "firebase",
  appName: "RUSreceipt-New",
  firebaseSdkVersion: "10.12.5",
  path: "receipt-app/RUSreceipt-New",
  firebaseConfig: {
    apiKey: "",
    authDomain: "",
    databaseURL: "",
    projectId: "",
    storageBucket: "",
    messagingSenderId: "",
    appId: ""
  }
};
