// Maakt een HS256-JWT voor de lokale teststack (anon- of service_role-sleutel).
import crypto from "node:crypto";
const [secret, role] = process.argv.slice(2);
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const body = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ iss: "supabase-local", role, iat: 1700000000, exp: 2000000000 })}`;
const sig = crypto.createHmac("sha256", secret).update(body).digest("base64url");
process.stdout.write(`${body}.${sig}`);
