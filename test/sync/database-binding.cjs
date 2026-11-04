// Test composition root only: production repositories use the real Watermelon
// Database supplied by the test, never the user's default on-device file.
let database;
Object.defineProperty(exports, 'database', { get: () => {
  if (!database) throw new Error('The test must bind a disposable Watermelon database first.');
  return database;
} });
exports.bindDatabase = (value) => { database = value; };
