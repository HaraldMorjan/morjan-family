/**
 * Resolve Cloudflare zone id for a zone name using an API token.
 *
 * Prefers CLOUDFLARE_API_TOKEN. Falls back to Wrangler OAuth token if present.
 */
import { readFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const zoneName = process.argv[2] || "morjan.family";

const readWranglerOauthToken = () => {
  const candidatePaths = [
    join(homedir(), ".wrangler", "config", "default.toml"),
    join(homedir(), "AppData", "Roaming", "xdg.config", ".wrangler", "config", "default.toml"),
    join(process.env.XDG_CONFIG_HOME || "", ".wrangler", "config", "default.toml")
  ].filter(Boolean);

  for (const configPath of candidatePaths) {
    if (!existsSync(configPath)) {
      continue;
    }

    const configText = readFileSync(configPath, "utf8");
    const oauthMatch = configText.match(/oauth_token\s*=\s*"([^"]+)"/);
    if (oauthMatch) {
      return oauthMatch[1];
    }
  }

  return "";
};

const apiToken = process.env.CLOUDFLARE_API_TOKEN || readWranglerOauthToken();

if (!apiToken) {
  console.error("No Cloudflare API token found. Run: npx wrangler login");
  process.exit(1);
}

const response = await fetch(
  `https://api.cloudflare.com/client/v4/zones?name=${encodeURIComponent(zoneName)}`,
  {
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json"
    }
  }
);

const payload = await response.json();
const zone = (payload.result || [])[0];

if (!zone?.id) {
  console.error(`Zone not found for ${zoneName}`);
  console.error(JSON.stringify(payload.errors || payload, null, 2));
  process.exit(1);
}

process.stdout.write(zone.id);
