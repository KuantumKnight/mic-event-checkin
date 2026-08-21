const required = ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "DEMO_ORGANIZER_EMAIL", "DEMO_ORGANIZER_PASSWORD"];
for (const name of required) if (!process.env[name]) throw new Error(`Missing ${name}`);

const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, "");
const headers = { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`, "Content-Type": "application/json" };
const email = process.env.DEMO_ORGANIZER_EMAIL.toLowerCase().trim();

const usersResponse = await fetch(`${baseUrl}/auth/v1/admin/users?per_page=1000`, { headers });
if (!usersResponse.ok) throw new Error(`Could not list Auth users (${usersResponse.status})`);
const usersBody = await usersResponse.json();
let user = usersBody.users?.find((candidate) => candidate.email?.toLowerCase() === email);
if (!user) {
  const createResponse = await fetch(`${baseUrl}/auth/v1/admin/users`, { method: "POST", headers, body: JSON.stringify({ email, password: process.env.DEMO_ORGANIZER_PASSWORD, email_confirm: true, user_metadata: { full_name: process.env.DEMO_ORGANIZER_NAME || "MIC Demo Organizer" } }) });
  if (!createResponse.ok) throw new Error(`Could not create demo organizer (${createResponse.status}): ${await createResponse.text()}`);
  user = await createResponse.json();
}

const profileResponse = await fetch(`${baseUrl}/rest/v1/profiles?id=eq.${user.id}`, { method: "PATCH", headers: { ...headers, Prefer: "return=minimal" }, body: JSON.stringify({ full_name: process.env.DEMO_ORGANIZER_NAME || "MIC Demo Organizer", role: "organizer" }) });
if (!profileResponse.ok) throw new Error(`Could not promote demo profile (${profileResponse.status}): ${await profileResponse.text()}`);
console.log(`Ready: ${email} is an organizer. The account is confirmed and no Supabase table editing is required.`);
