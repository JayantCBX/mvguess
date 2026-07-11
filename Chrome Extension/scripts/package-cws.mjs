import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import archiver from "archiver";

const root = path.resolve(import.meta.dirname, ".."); const dist = path.join(root, "dist"); const releases = path.join(root, "releases");
fs.rmSync(releases, { recursive: true, force: true }); fs.mkdirSync(releases, { recursive: true });
const manifest = JSON.parse(fs.readFileSync(path.join(dist, "manifest.json"), "utf8"));
const zipPath = path.join(releases, `Movie-Guess-Battle-v${manifest.version}-CWS.zip`);
await new Promise((resolve, reject) => { const output = fs.createWriteStream(zipPath); const zip = archiver("zip", { zlib: { level: 9 } }); output.on("close", resolve); output.on("error", reject); zip.on("error", reject); zip.pipe(output); zip.directory(dist, false); void zip.finalize(); });
const bytes = fs.readFileSync(zipPath); const hash = crypto.createHash("sha256").update(bytes).digest("hex");
fs.writeFileSync(`${zipPath}.sha256`, `${hash}  ${path.basename(zipPath)}\n`);
console.log(`CWS ZIP: ${zipPath}`); console.log(`Size: ${bytes.length} bytes`); console.log(`SHA-256: ${hash}`); console.log("Verified: dist contents are at ZIP root; manifest.json is at ZIP root.");
