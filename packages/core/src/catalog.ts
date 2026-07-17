import type { ScopeClassification } from "./types.js";

export const RULESET_VERSION = "2026.07.18.2";
export const RULESET_REVIEWED_AT = "2026-07-18";

export const GOOGLE_SCOPE_CATALOG_URL =
  "https://developers.google.com/identity/protocols/oauth2/scopes";
export const GOOGLE_RESTRICTED_SCOPE_URL =
  "https://support.google.com/cloud/answer/13464325?hl=en";

const restrictedScopes = new Set([
  "https://mail.google.com/",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.metadata",
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/gmail.insert",
  "https://www.googleapis.com/auth/gmail.compose",
  "https://www.googleapis.com/auth/gmail.settings.basic",
  "https://www.googleapis.com/auth/gmail.settings.sharing",
  "https://www.googleapis.com/auth/drive",
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/drive.activity",
  "https://www.googleapis.com/auth/drive.activity.readonly",
  "https://www.googleapis.com/auth/drive.metadata",
  "https://www.googleapis.com/auth/drive.metadata.readonly",
  "https://www.googleapis.com/auth/drive.scripts",
  "https://www.googleapis.com/auth/drive.meet.readonly",
]);

const nonSensitiveScopes = new Set([
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/drive.appdata",
  "https://www.googleapis.com/auth/drive.appfolder",
  "https://www.googleapis.com/auth/drive.install",
]);

const sensitiveScopes = new Set([
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.events.readonly",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.labels",
  "https://www.googleapis.com/auth/drive.apps.readonly",
]);

export function normalizeScope(scope: string): string {
  const value = scope.trim().replace(/[),;]+$/u, "");
  if (value === "https://mail.google.com") return "https://mail.google.com/";
  return value;
}

export function classifyScope(scopeInput: string): ScopeClassification {
  const scope = normalizeScope(scopeInput);
  if (restrictedScopes.has(scope)) return "restricted";
  if (nonSensitiveScopes.has(scope)) return "non-sensitive";
  if (sensitiveScopes.has(scope)) return "sensitive";
  return "unknown";
}

export function isRestrictedScope(scope: string): boolean {
  return classifyScope(scope) === "restricted";
}
