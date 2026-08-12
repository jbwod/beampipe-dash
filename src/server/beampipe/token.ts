export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export function isTokenPair(value: unknown): value is TokenPair {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<TokenPair>;
  return (
    typeof candidate.access_token === "string" &&
    typeof candidate.refresh_token === "string" &&
    candidate.token_type === "bearer"
  );
}
