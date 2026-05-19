import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ladwfnabjitolymkyyek.supabase.co'

const supabaseKey = 'sb_publishable_tzJiRPYHnXSUMklPduPTiQ_2xewVxoe'

export const supabase = createClient(
  supabaseUrl,
  supabaseKey
)