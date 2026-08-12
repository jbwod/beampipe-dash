export function eagleUrlFromGraphUrl(graphUrl: string, eagleBase = "https://eagle.icrar.org") {
  let source: URL;
  try {
    source = new URL(graphUrl);
  } catch {
    return null;
  }
  if (source.hostname === "eagle.icrar.org") return source.toString();

  const github = githubGraphParts(source);
  if (!github) return null;
  const target = new URL(eagleBase);
  target.searchParams.set("service", "GitHub");
  target.searchParams.set("repository", `${github.owner}/${github.repository}`);
  target.searchParams.set("branch", github.branch);
  target.searchParams.set("path", github.path);
  target.searchParams.set("filename", github.filename);
  return target.toString();
}

function githubGraphParts(url: URL) {
  const parts = url.pathname.split("/").filter(Boolean);
  if (url.hostname === "github.com" && parts[2] === "blob" && parts.length >= 6) {
    return graphParts(parts[0], parts[1], parts[3], parts.slice(4));
  }
  if (url.hostname === "raw.githubusercontent.com" && parts.length >= 5) {
    return graphParts(parts[0], parts[1], parts[2], parts.slice(3));
  }
  return null;
}

function graphParts(owner: string, repository: string, branch: string, fileParts: string[]) {
  const filename = fileParts.at(-1);
  if (!filename?.endsWith(".graph")) return null;
  return { owner, repository, branch, path: fileParts.slice(0, -1).join("/"), filename };
}
