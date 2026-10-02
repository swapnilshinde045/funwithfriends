import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testMessages() {
  const { data: users } = await supabase.from('users').select('id, username').limit(1);
  if (users && users.length > 0) {
    const { error } = await supabase.from('messages').upsert({
      id: 'welcome-msg-1',
      sender_id: users[0].id,
      message: '👋 Welcome to PlaySphere! Let the games begin! 🎮',
      created_at: new Date().toISOString()
    });
    if (error) {
      console.error('Error inserting message:', error.message);
    } else {
      console.log('✅ Inserted message successfully for user:', users[0].username);
    }
  }

  const { data: msgs, error: queryErr } = await supabase.from('messages').select('*');
  console.log('Total messages in Supabase:', msgs?.length);
  console.log(msgs);
}

testMessages().catch(console.error);
