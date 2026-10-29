// Renders the sample documents in scripts/samples to PNGs in public/samples.
// Needs Google Chrome. Set CHROME to its path if it isn't in the default macOS location.
import { execFileSync } from "node:child_process";
import { readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const chrome = process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const sourceDir = path.join(root, "scripts", "samples");

for (const file of readdirSync(sourceDir).filter((name) => name.endsWith(".html"))) {
  const output = path.join(root, "public", "samples", file.replace(/\.html$/, ".png"));
  execFileSync(
    chrome,
    [
      "--headless=new",
      "--disable-gpu",
      "--hide-scrollbars",
      "--force-device-scale-factor=1",
      "--window-size=1275,1650",
      `--screenshot=${output}`,
      pathToFileURL(path.join(sourceDir, file)).href,
    ],
    { stdio: "ignore" },
  );
  console.log(`Rendered ${path.relative(root, output)}`);
}
