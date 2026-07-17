export type ScopeClassification =
  | "non-sensitive"
  | "sensitive"
  | "restricted"
  | "unknown";

export type SourceLocation = {
  path: string;
  line: number;
};

export type ScopeInventoryItem = {
  scope: string;
  classification: ScopeClassification;
  locations: SourceLocation[];
  sourceUrl: string;
};

export type OAuthEvidenceManifest = {
  schemaVersion: 1;
  app: {
    name: string;
    supportEmailDomain: string;
    homepageUrl: string;
    privacyPolicyUrl: string;
  };
  oauth: {
    authorizedDomains: string[];
    redirectUris: string[];
    declaredScopes: string[];
  };
  features: Array<{
    name: string;
    route: string;
    scopes: string[];
  }>;
  evidence: {
    domainOwnershipVerified: boolean;
    video: {
      completed: boolean;
      steps: Array<{
        title: string;
        route: string;
        scopes: string[];
      }>;
    };
  };
  checks: {
    publicUrls: boolean;
  };
};

export type FindingSeverity = "blocker" | "manual" | "complete";

export type FindingCategory =
  | "scope"
  | "domain"
  | "public-surface"
  | "evidence"
  | "boundary"
  | "safety";

export type Finding = {
  ruleId: string;
  severity: FindingSeverity;
  blocking: boolean;
  category: FindingCategory;
  title: string;
  message: string;
  remediation: string;
  evidence: string[];
  sourceUrl: string;
};

export type PublicSurfaceEvidence = {
  homepageHtml?: string;
  homepageFinalUrl?: string;
  error?: string;
};

export type EvaluationInput = {
  manifest: OAuthEvidenceManifest;
  scopes: ScopeInventoryItem[];
  safetyFindings?: Finding[];
  publicSurface?: PublicSurfaceEvidence;
};

export type StoryboardStep = {
  index: number;
  title: string;
  route: string;
  scopes: string[];
};

export type ScanResult = {
  product: "ScopeParity";
  rulesetVersion: string;
  rulesetReviewedAt: string;
  reportId: string;
  manifestDigestSha256: string;
  generatedAt: string;
  manifestPath: string;
  scannedFiles: number;
  stoppedAtRestrictedScopeBoundary: boolean;
  summary: {
    blockers: number;
    manual: number;
    complete: number;
  };
  scopes: ScopeInventoryItem[];
  findings: Finding[];
  storyboard: StoryboardStep[];
};

export type ScanProjectOptions = {
  root: string;
  manifestPath: string;
  checkUrls?: boolean;
  publicSurface?: PublicSurfaceEvidence;
};

export type DiscoveredFiles = {
  files: string[];
  safetyFindings: Finding[];
};
