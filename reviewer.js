const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

/**
 * Turborepo PR Reviewer (Native JSON Implementation)
 * Resolves workspace paths on-demand via npm dependency resolution.
 */
async function run() {
  console.log("Initializing quality review analysis.");

  // Cache for resolved workspace directory paths
  const pkgPathCache = new Map();

  /**
   * Resolve repository-relative location for a specific package.
   * Utilizes npm's dependency resolution manifest for accuracy.
   */
  function getWorkspaceDir(pkgName) {
    if (pkgPathCache.has(pkgName)) return pkgPathCache.get(pkgName);

    try {
      // Direct resolution of workspace location via npm list
      const output = execSync(`npm ls ${pkgName} --json`, { encoding: "utf8" });
      const data = JSON.parse(output);

      // Access the resolved path from the dependency tree
      const resolved = data.dependencies[pkgName]?.resolved;
      if (!resolved) return null;

      // Extract the directory path by removing the 'file:' protocol and normalizing
      const rawPath = resolved.replace(/^file:/, "");
      const absolutePath = path.resolve(rawPath);
      const relativePath = path.relative(process.cwd(), absolutePath);

      pkgPathCache.set(pkgName, relativePath);
      return relativePath;
    } catch (e) {
      console.error(`Failed to resolve workspace path for: ${pkgName}`);
      return null;
    }
  }

  // Execute quality review and capture JSON-structured log output
  let output = "";
  try {
    output = execSync("npx turbo run check-types --json --continue=always", {
      encoding: "utf8",
      stdio: ["inherit", "pipe", "pipe"],
    }).toString();
  } catch (e) {
    output = (e.stdout || "") + (e.stderr || "");
  }

  // Parse structured logs and aggregate repository-relative error paths
  const lines = output.split("\n");
  const errors = [];

  for (const line of lines) {
    if (!line.trim()) continue;

    try {
      const entry = JSON.parse(line);

      // Identify task entries containing valid TypeScript error signatures
      if (entry.source?.includes("#") && entry.text?.includes(": - error TS")) {
        // Dynamically extract package name from source field (e.g. "web#check-types")
        const [pkgName] = entry.source.split("#");
        const workspaceDir = getWorkspaceDir(pkgName);

        if (!workspaceDir) {
          console.error(`Failed to resolve workspace path for: ${pkgName}`);
          continue;
        }

        const separatorIndex = entry.text.indexOf(" - ");
        if (separatorIndex !== -1) {
          const fileLine = entry.text.substring(0, separatorIndex);
          const rawMsg = entry.text.substring(separatorIndex + 3);

          const [filePath, lineNum] = fileLine.split(":");

          errors.push({
            path: path.join(workspaceDir, filePath),
            line: parseInt(lineNum),
            body: `[TS] ${rawMsg.trim()}`,
          });
        }
      }
    } catch (e) {
      // Safely ignore non-JSON stream entries
      continue;
    }
  }

  if (errors.length === 0) {
    console.log("Analysis complete: No issues identified.");
    return;
  }

  console.log(`Discovered ${errors.length} issues. Posting PR Review.`);

  // Final reporting via GitHub REST API
  const event = JSON.parse(
    fs.readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"),
  );
  const prNumber = event.pull_request?.number;

  if (!prNumber) {
    console.log("Non-PR context identified: Generating workflow annotations.");
    for (const error of errors) {
      console.log(
        `::error file=${error.path},line=${error.line}::${error.body}`,
      );
    }
    return;
  }

  const apiUrl = `${process.env.GITHUB_API_URL}/repos/${process.env.GITHUB_REPOSITORY}/pulls/${prNumber}/reviews`;
  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: JSON.stringify({
      event: "COMMENT",
      body: `### Turborepo Type-Check Analysis\nDiscovered **${errors.length}** issues that require attention.`,
      comments: errors.map((e) => ({
        path: e.path,
        line: e.line,
        body: e.body,
        side: "RIGHT",
      })),
    }),
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error("Failed to post PR Review:", errorData);
    process.exit(1);
  }

  console.log("PR Review successfully posted.");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
