import { createClient } from '@supabase/supabase-js'

const url  = "https://xykqnppajszeubflrmgk.supabase.co"
const anon = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5a3FucHBhanN6ZXViZmxybWdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0MjY4MDIsImV4cCI6MjA4NzAwMjgwMn0.2CHoFf-4CWoszAsjYS-_bzwiLHA9ONAYvlo3GGp1c2s"

export const supabase = createClient(url, anon)