import { createClientComponentClient, createServerComponentClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const createClient = () => {
  return createClientComponentClient({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  });
};

export const createServerClient = () => {
  const cookieStore = cookies();
  
  return createServerComponentClient({
    cookies: () => cookieStore,
  });
};