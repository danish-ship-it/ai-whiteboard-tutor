// Records a demo lesson through the real pipeline of a running dev server, so the
// home page can play it instantly with no AI calls. Review the result before committing.
// Run: node scripts/make-demo.mjs <slug> "<topic>" [baseUrl]
import { writeFileSync } from "node:fs";

const [slug, topic, base = "http://localhost:3000"] = process.argv.slice(2);
if (!slug || !/^[a-z0-9-]+$/.test(slug) || !topic) throw new Error('usage: node scripts/make-demo.mjs <slug> "<topic>"');

async function post(path, body) {
  const response = await fetch(base + path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await response.json();
  if (!response.ok) throw new Error(`${path}: ${data.error}`);
  return data;
}

const { lesson, token } = await post("/api/lesson", { topic });
const narration = await post("/api/narration", { token });
writeFileSync(`public/demos/${slug}.mp3`, Buffer.from(narration.audioBase64, "base64"));
writeFileSync(
  `src/lib/demos/${slug}.json`,
  JSON.stringify({ topic, lesson, mimeType: narration.mimeType, alignment: narration.alignment, normalizedAlignment: narration.normalizedAlignment }),
);
console.log(`${slug}: "${lesson.title}", ${lesson.scenes.length} scenes, audio ${Math.round(narration.audioBase64.length / 1365)} KB`);
