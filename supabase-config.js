
// ==========================================
// SUPABASE CONFIGURATION
// ==========================================
// Instructions:
// 1. Go to https://supabase.com and create a new project.
// 2. Go to Project Settings -> API.
// 3. Copy the "Project URL" and paste it below.
// 4. Copy the "anon" / "public" key and paste it below.

const SUPABASE_URL = 'INSERT_YOUR_PROJECT_URL_HERE'; // e.g., https://xyz.supabase.co
const SUPABASE_KEY = 'INSERT_YOUR_ANON_KEY_HERE';   // e.g., eyJhbGciOiJIUzI1NiIsInR...

// Initialize Supabase Client
let supabase;

if (typeof supabase !== 'undefined') {
    // If supabase-js is loaded directly
    supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
} else if (window.supabase && window.supabase.createClient) {
    // If loaded via CDN as global object
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
} else {
    // Should be handled by script include in HTML
    console.log("Supabase client waiting for SDK initialization...");
}
