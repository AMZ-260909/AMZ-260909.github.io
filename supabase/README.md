# Shared chapter likes setup

1. Create your own project at https://supabase.com.
2. Open the project's SQL Editor, create a new query, paste the entire contents of `likes.sql` from this directory, and run it.
3. Get the Project URL and Publishable key from the project's Connect dialog or Settings / API Keys.
4. Enter these values as `url` and `publishableKey` at the top of `likes.js` in the repository root. Do not use a Secret key or service_role key.
5. Commit and push the website changes. Wait for GitHub Pages to finish deploying, then open Chapter 1.
6. Verify: the initial count is 0; clicking changes it to 1; refreshing keeps it at 1 and shows that you have already liked the chapter. Open the same chapter in another browser: it should show 1, then 2 after liking. Refresh in the original browser: it should now show 2. Chapter 2 should have its own independent count.

Before configuration, the page displays “Likes coming soon” and a dash instead of a made-up count. Once configured, failed requests can be retried by clicking the heart. Like requests are safe to retry: each combination of browser identifier and chapter can appear only once in the database. The website uses only a public API key. Anonymous users cannot directly read or modify the underlying records; only two functions with specific purposes are exposed.

Duplicate likes are prevented per browser, not per verified person. Switching browsers, clearing site data, or deliberately generating a new identifier allows another like; this lightweight approach does not provide strict protection against artificially inflated counts. Totals are fetched when the page opens and after a like. Refresh to see likes added by other readers. The browser stores only a random identifier; the database stores the shared count.

Official documentation: https://supabase.com/docs/guides/getting-started/api-keys and https://supabase.com/docs/guides/database/functions
