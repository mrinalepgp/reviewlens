import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';

// Load .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of envConfig) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [key, ...value] = trimmed.split('=');
    if (key && value.length > 0) {
      let val = value.join('=').trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[key.trim()] = val;
    }
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  console.error('❌ Error: NEXT_PUBLIC_SUPABASE_URL is missing.');
  process.exit(1);
}

const accounts = [
  {
    email: 'reviewlens_admin@reviewlens.com',
    password: 'Admin@ReviewLens2026#',
    fullName: 'ReviewLens Admin',
    role: 'admin',
    planTier: 'Enterprise',
    credits: 99999,
    subscriptionStatus: 'enterprise'
  },
  {
    email: 'reviewlens_free@reviewlens.com',
    password: 'FreeUser@2026#',
    fullName: 'ReviewLens Free User',
    role: 'free',
    planTier: 'Free',
    credits: 3,
    subscriptionStatus: 'free'
  }
];

async function seed() {
  console.log('🚀 ReviewLens Auth Provisioning Script');
  console.log(`🔗 Supabase URL: ${supabaseUrl}`);

  if (supabaseServiceKey) {
    console.log('🔑 Using SUPABASE_SERVICE_ROLE_KEY (Direct Admin API)...');
    const adminClient = createClient(supabaseUrl!, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    for (const acc of accounts) {
      console.log(`\n⚙️ Processing ${acc.email} via Admin API...`);
      
      // List existing users to find if exists
      const { data: { users }, error: listError } = await adminClient.auth.admin.listUsers();
      if (listError) {
        console.error(`❌ Failed to list users:`, listError.message);
        continue;
      }

      const existingUser = users.find(u => u.email?.toLowerCase() === acc.email.toLowerCase());
      let userId: string;

      if (existingUser) {
        console.log(`ℹ️ User ${acc.email} exists (${existingUser.id}). Updating password & metadata...`);
        userId = existingUser.id;
        const { error: updateErr } = await adminClient.auth.admin.updateUserById(userId, {
          password: acc.password,
          email_confirm: true,
          user_metadata: { full_name: acc.fullName, role: acc.role, plan: acc.planTier.toLowerCase() },
          app_metadata: { role: acc.role, provider: 'email', providers: ['email'] }
        });
        if (updateErr) console.error(`⚠️ Update error:`, updateErr.message);
      } else {
        console.log(`✨ Creating user ${acc.email}...`);
        const { data: newUser, error: createErr } = await adminClient.auth.admin.createUser({
          email: acc.email,
          password: acc.password,
          email_confirm: true,
          user_metadata: { full_name: acc.fullName, role: acc.role, plan: acc.planTier.toLowerCase() },
          app_metadata: { role: acc.role, provider: 'email', providers: ['email'] }
        });
        if (createErr || !newUser.user) {
          console.error(`❌ Failed to create user:`, createErr?.message);
          continue;
        }
        userId = newUser.user.id;
      }

      // Upsert user_profiles
      const { error: profErr } = await adminClient
        .from('user_profiles')
        .upsert({
          id: userId,
          full_name: acc.fullName,
          credits: acc.credits,
          plan_tier: acc.planTier
        });
      if (profErr) console.error(`⚠️ Error updating user_profiles:`, profErr.message);
      else console.log(`✅ user_profiles configured: ${acc.credits} credits, ${acc.planTier} plan`);

      // Upsert sellers
      const { error: sellerErr } = await adminClient
        .from('sellers')
        .upsert({
          id: userId,
          full_name: acc.fullName,
          whatsapp_number: acc.role === 'admin' ? '+910000000000' : '',
          subscription_status: acc.subscriptionStatus
        });
      if (sellerErr) console.error(`⚠️ Error updating sellers:`, sellerErr.message);
      else console.log(`✅ sellers configured: ${acc.subscriptionStatus} status`);
    }

    console.log('\n🎉 Admin & Free accounts provisioned successfully!');
  } else {
    console.log('ℹ️ SUPABASE_SERVICE_ROLE_KEY not found in .env.local.');
    console.log('⚡ Attempting provisioning via public signUp API with anon key...');
    const client = createClient(supabaseUrl!, supabaseAnonKey!);

    for (const acc of accounts) {
      console.log(`\n⚙️ Signing up / verifying ${acc.email}...`);
      const { data, error } = await client.auth.signUp({
        email: acc.email,
        password: acc.password,
        options: {
          data: {
            full_name: acc.fullName,
            role: acc.role,
            plan: acc.planTier.toLowerCase()
          }
        }
      });

      if (error) {
        if (error.message.includes('already registered')) {
          console.log(`ℹ️ Account ${acc.email} is already registered.`);
        } else {
          console.error(`⚠️ SignUp error for ${acc.email}:`, error.message);
        }
      } else {
        console.log(`✅ Signed up ${acc.email}. User ID: ${data.user?.id}`);
      }
    }

    console.log('\n📌 Note: For guaranteed instant email confirmation and direct database role setup,');
    console.log('   you can also run the SQL script directly in your Supabase SQL Editor:');
    console.log('   📄 supabase/seed_users.sql');
  }
}

seed().catch(console.error);
