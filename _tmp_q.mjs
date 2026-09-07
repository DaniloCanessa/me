import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
const env = {};
for (const line of fs.readFileSync('.env.local','utf8').split(/\r?\n/)) { const m=line.match(/^([A-Z_]+)=(.*)$/); if(m) env[m[1]]=m[2].trim().replace(/^["']|["']$/g,''); }
const db = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth:{persistSession:false} });
console.log(JSON.stringify((await db.from('users').select('id,name,email,role,is_active')).data, null, 1));
console.log('clients con assigned_to:', JSON.stringify((await db.from('clients').select('id,nombre,assigned_to')).data));
