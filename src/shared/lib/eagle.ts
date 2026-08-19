export function eagleUrlFromGraphUrl(graphUrl: string, eagleBase = "https://eagle.icrar.org") {
  let source: URL;
  try {
    source = new URL(graphUrl);
  } catch {
    return null;
  }
  if (source.hostname === "eagle.icrar.org") return source.toString();

  // EAGLE loads raw files with service=Url. Mapping them through GitHub repo
  // params breaks refs/heads/... URLs (branch becomes "refs").
  if (isRawGraphUrl(source)) {
    const target = new URL(eagleBase);
    target.searchParams.set("service", "Url");
    target.searchParams.set("url", source.toString());
    return target.toString();
  }

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

function isRawGraphUrl(url: URL) {
  const parts = url.pathname.split("/").filter(Boolean);
  const filename = parts.at(-1);
  if (!filename?.endsWith(".graph")) return false;
  if (url.hostname === "raw.githubusercontent.com") return parts.length >= 4;
  return url.hostname === "github.com" && parts[2] === "raw" && parts.length >= 5;
}

function githubGraphParts(url: URL) {
  const parts = url.pathname.split("/").filter(Boolean);
  if (url.hostname !== "github.com" || (parts[2] !== "blob" && parts[2] !== "tree")) {
    return null;
  }
  const rest = parseRefAndFile(parts.slice(3));
  if (!rest) return null;
  return graphParts(parts[0], parts[1], rest.branch, rest.fileParts);
}

function parseRefAndFile(segments: string[]) {
  if (
    segments[0] === "refs" &&
    (segments[1] === "heads" || segments[1] === "tags") &&
    segments.length >= 4
  ) {
    return { branch: segments[2], fileParts: segments.slice(3) };
  }
  if (segments.length >= 2) {
    return { branch: segments[0], fileParts: segments.slice(1) };
  }
  return null;
}

function graphParts(owner: string, repository: string, branch: string, fileParts: string[]) {
  const filename = fileParts.at(-1);
  if (!filename?.endsWith(".graph")) return null;
  const directory = fileParts.slice(0, -1).join("/");
  return { owner, repository, branch, path: directory || ".", filename };
}
