const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  const { error } = await supabase
    .from('profiles')
    .update({ role: 'government' })
    .neq('role', 'government'); // update everyone to government
      
  if (error) {
    console.error("Update error:", error);
  } else {
    console.log(`Updated everyone to government role for testing!`);
  }
}

run();
