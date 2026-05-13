// db.js
// MongoDB에 한 번만 연결하고, 어디서든 같은 연결을 꺼내 쓸 수 있게 해주는 파일.

const { MongoClient } = require('mongodb');

let client;
let db;

// 서버가 시작될 때 1회 호출됩니다.
async function connectDB() {
  if (db) return db; // 이미 연결돼 있으면 재사용

  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB || 'todoapp';

  if (!uri) {
    throw new Error('.env 파일에 MONGODB_URI가 설정돼 있지 않아요.');
  }

  client = new MongoClient(uri);
  await client.connect();
  db = client.db(dbName);
  console.log(`[MongoDB] 연결 성공 (db: ${dbName})`);
  return db;
}

// 라우트/컨트롤러에서 호출. 컬렉션 핸들을 돌려줍니다.
function getCollection(name) {
  if (!db) {
    throw new Error('DB가 아직 연결되지 않았어요. connectDB()부터 호출하세요.');
  }
  return db.collection(name);
}

module.exports = { connectDB, getCollection };
