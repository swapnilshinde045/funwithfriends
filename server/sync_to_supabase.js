import { createClient } from '@supabase/supabase-js';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log('Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const dbPath = path.join(__dirname, 'data/playsphere.db');
const db = new Database(dbPath);

async function syncAllData() {
  console.log('🔄 Syncing local data to Supabase...');

  // 1. Sync Users
  const users = db.prepare('SELECT * FROM users').all();
  console.log(`Found ${users.length} users in local database.`);
  if (users.length > 0) {
    for (const u of users) {
      const { error } = await supabase.from('users').upsert({
        id: u.id,
        username: u.username,
        email: u.email,
        password_hash: u.password_hash,
        avatar: u.avatar,
        role: u.role || 'user',
        bio: u.bio || '',
        status: u.status || 'offline',
        last_seen: u.last_seen || new Date().toISOString(),
        created_at: u.created_at || new Date().toISOString(),
      });
      if (error) console.error('Error inserting user:', u.username, error.message);
      else console.log('✅ Synced user:', u.username);
    }
  }

  // 2. Sync Friends
  const friends = db.prepare('SELECT * FROM friends').all();
  if (friends.length > 0) {
    for (const f of friends) {
      await supabase.from('friends').upsert({
        id: f.id,
        sender_id: f.sender_id,
        receiver_id: f.receiver_id,
        status: f.status,
        created_at: f.created_at,
        updated_at: f.updated_at,
      });
    }
    console.log(`✅ Synced ${friends.length} friend relations.`);
  }

  // 3. Sync Rooms
  const rooms = db.prepare('SELECT * FROM rooms').all();
  if (rooms.length > 0) {
    for (const r of rooms) {
      await supabase.from('rooms').upsert({
        id: r.id,
        room_code: r.room_code,
        room_type: r.room_type,
        host_id: r.host_id,
        status: r.status,
        max_players: r.max_players,
        is_private: r.is_private,
        created_at: r.created_at,
        updated_at: r.updated_at,
      });
    }
    console.log(`✅ Synced ${rooms.length} rooms.`);
  }

  console.log('🎉 Supabase sync complete!');
}

syncAllData().catch(console.error);
