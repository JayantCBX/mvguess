import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const dist = path.join(root, "dist");
const failures = [], warnings = [], passes = [];
const fail = (m) => failures.push(m); const pass = (m) => passes.push(m); const warn = (m) => warnings.push(m);
const allFiles = fs.existsSync(dist) ? fs.readdirSync(dist, { recursive: true, withFileTypes: true }).filter((e) => e.isFile()).map((e) => path.join(e.parentPath, e.name)) : [];
const relative = (file) => path.relative(dist, file).replaceAll("\\", "/");
const textFiles = allFiles.filter((f) => /\.(?:js|css|html|json)$/i.test(f));
const combined = textFiles.map((f) => fs.readFileSync(f, "utf8")).join("\n");
const manifestPath = path.join(dist, "manifest.json");
let manifest;
if (!fs.existsSync(manifestPath)) fail("dist/manifest.json is missing"); else try { manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")); pass("Manifest is valid JSON"); } catch { fail("Manifest is invalid JSON"); }
if (manifest) {
  manifest.manifest_version === 3 ? pass("Manifest V3") : fail("manifest_version must be 3");
  manifest.description?.length <= 132 ? pass("Description length") : fail("Description exceeds 132 characters");
  const approved = new Set(["storage", "sidePanel"]); const bad = (manifest.permissions ?? []).filter((p) => !approved.has(p)); bad.length ? fail(`Unapproved permissions: ${bad.join(", ")}`) : pass("Permissions are minimal");
  JSON.stringify(manifest.host_permissions) === JSON.stringify(["https://movie-guess-battle.netlify.app/*"]) ? pass("Exact production host permission") : fail("Host permissions are not the approved exact origin");
  const csp = manifest.content_security_policy?.extension_pages ?? "";
  /unsafe-eval|fonts\.googleapis|fonts\.gstatic|script-src[^;]*https?:|script-src[^;]*\*/i.test(csp) ? fail("CSP permits unsafe or remote resources") : pass("Strict extension CSP");
  const referenced = [manifest.action?.default_popup, manifest.side_panel?.default_path, manifest.background?.service_worker, ...Object.values(manifest.icons ?? {})].filter(Boolean);
  for (const file of referenced) fs.existsSync(path.join(dist, file)) ? pass(`Referenced file exists: ${file}`) : fail(`Manifest-referenced file missing: ${file}`);
}
const forbiddenPatterns = [
  [/<script[^>]+src=["']https?:/i, "remote script element"], [/\bimport\s*\(["']https?:/i, "remote JavaScript import"], [/\beval\s*\(/, "eval()"], [/\bnew\s+Function\s*\(/, "new Function()"],
  [/fonts\.(?:googleapis|gstatic)\.com/i, "Google Fonts"], [/localhost|127\.0\.0\.1/i, "localhost URL"], [/@supabase|supabase\.co|postgrest|realtime-js|functions-js/i, "Supabase code"], [/service[_-]?role|-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/i, "secret/private key pattern"]
];
for (const [re, label] of forbiddenPatterns) re.test(combined) ? fail(`Production output contains ${label}`) : pass(`No ${label}`);
for (const file of allFiles) {
  const rel = relative(file);
  if (/\.map$|(^|\/)\.env(?:\.|$)|(^|\/)dist\//i.test(rel)) fail(`Forbidden output file: ${rel}`);
  if (/\.(?:ts|tsx|test\.[^.]+)$/i.test(rel)) fail(`Source/test file in output: ${rel}`);
}
if (!allFiles.length) fail("Production output is empty");
const connectHosts = [...combined.matchAll(/https:\/\/([\w.-]+)/g)].map((m) => m[1]);
// React production bundles contain a static reactjs.org error-decoder URL; it is not fetched by extension code.
const unexpected = [...new Set(connectHosts.filter((h) => !["movie-guess-battle.netlify.app", "github.com", "reactjs.org"].includes(h)))];
unexpected.length ? warn(`Review packaged URL hosts: ${unexpected.join(", ")}`) : pass("No unexpected production URL hosts");
console.log(`CWS audit: ${passes.length} passed, ${warnings.length} warnings, ${failures.length} failures`);
for (const m of warnings) console.warn(`WARN: ${m}`); for (const m of failures) console.error(`FAIL: ${m}`);
console.log(failures.length ? "Final CWS package readiness: NOT READY" : "Final CWS package readiness: READY");
process.exitCode = failures.length ? 1 : 0;
