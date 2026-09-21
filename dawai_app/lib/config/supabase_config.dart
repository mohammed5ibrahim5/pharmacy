class SupabaseConfig {
  static const String url = String.fromEnvironment(
    'SUPABASE_URL',
    defaultValue: 'https://zlrtlnczobiqajnjbcte.supabase.co',
  );
  static const String anonKey = String.fromEnvironment(
    'SUPABASE_ANON_KEY',
    defaultValue: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpscnRsbmN6b2JpcWFqbmpiY3RlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU4NDQ2MDcsImV4cCI6MjEwMTQyMDYwN30.qwk_nRkWCDcUXHY7iEkEXxbM3ZHRCH4OBMaKeRfHPmM',
  );
}
