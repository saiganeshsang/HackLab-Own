import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ladwfnabjitolymkyyek.supabase.co'

const supabaseKey = 'sb_publishable_m8HkZLtMKyuwpsa5tUBk8g_a9sSm7bG'

export const supabase = createClient(
  supabaseUrl,
  supabaseKey
)