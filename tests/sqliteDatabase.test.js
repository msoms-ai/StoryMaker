import test from 'node:test';
import assert from 'node:assert/strict';
import { sqliteDB, readDB, writeDB } from '../sqliteDatabase.js';

test('SQLite Database Layer: CRUD and Compatibility', async (t) => {
  await t.test('reads seeded users and stories accurately', () => {
    const users = sqliteDB.getUsers();
    assert.ok(Array.isArray(users), 'Users must be an array');
    assert.ok(users.length >= 1, 'Should contain at least 1 user');

    const admin = sqliteDB.getUserByEmail('qisas.admin@msoms.ai');
    assert.ok(admin, 'Admin user must exist in SQLite');
    assert.strictEqual(admin.role, 'Admin');
  });

  await t.test('creates, reads, and deletes a story atomically in SQLite', () => {
    const testStory = {
      id: 'test_story_99999',
      userId: 'u_admin',
      category: 'adventure',
      status: 'draft',
      title: 'رحلة الاختبار',
      slides: [
        { index: 0, title: 'مشهد تجريبي', text: 'هذا نص تجريبي للتحقق من قاعدة بيانات SQLite.' }
      ]
    };

    sqliteDB.saveStory(testStory);

    const fetched = sqliteDB.getStory('test_story_99999');
    assert.ok(fetched, 'Fetched story must exist');
    assert.strictEqual(fetched.title, 'رحلة الاختبار');
    assert.strictEqual(fetched.slides.length, 1);

    // Clean up
    sqliteDB.deleteStory('test_story_99999');
    const deleted = sqliteDB.getStory('test_story_99999');
    assert.strictEqual(deleted, null, 'Story must be deleted');
  });

  await t.test('readDB() compatibility bridge returns all expected collections', () => {
    const db = readDB();
    assert.ok(db.settings, 'Settings must exist');
    assert.ok(Array.isArray(db.categories), 'Categories must be an array');
    assert.ok(Array.isArray(db.users), 'Users must be an array');
    assert.ok(Array.isArray(db.stories), 'Stories must be an array');
  });
});
