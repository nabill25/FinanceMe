const url = 'https://tdszqodqspwddcnywesl.supabase.co/auth/v1/signup';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkc3pxb2Rxc3B3ZGRjbnl3ZXNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQzMTQ0NDYsImV4cCI6MjA5OTg5MDQ0Nn0.ZOwk-hg4jQlpz7v6WTUAeFgJQw2yPuutuLXZJRtyFUg';

fetch(url, {
  method: 'POST',
  headers: {
    'apikey': anonKey,
    'Authorization': `Bearer ${anonKey}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'test_direct_api@example.com',
    password: 'password123',
    data: { full_name: 'Direct API Test' }
  })
})
.then(res => {
  console.log('Status:', res.status);
  return res.text();
})
.then(text => console.log('Response:', text))
.catch(err => console.error('Error:', err.message));
