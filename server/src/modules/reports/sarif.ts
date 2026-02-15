/**
 * SARIF (Static Analysis Results Interchange Format) exporter
 * Converts scan findings to SARIF v2.1.0 format for integration
 * with CI/CD tools (GitHub, GitLab, Azure DevOps, etc.)
 *
 * Spec: https://docs.oasis-open.org/sarif/sarif/v2.1.0/sarif-v2.1.0.html
 */

interface SarifLevel {
  [key: string]: 'error' | 'warning' | 'note' | 'none';
}

const SEVERITY_TO_SARIF_LEVEL: SarifLevel = {
  CRITICAL: 'error',
  HIGH: 'error',
  MEDIUM: 'warning',
  LOW: 'note',
  INFO: 'none',
};

interface ScanFinding {
  id: string;
  title: string;
  severity: string;
  category: string;
  description: string;
  solution?: string;
  affectedComponent?: string;
  evidence?: string;
  cvssScore?: number;
  cweId?: string;
  cveId?: string;
  references?: string[];
  firstFoundAt?: string;
}

interface SarifReport {
  version: string;
  $schema: string;
  runs: Array<{
    tool: {
      driver: {
        name: string;
        version: string;
        informationUri: string;
        rules: Array<{
          id: string;
          name: string;
          shortDescription: { text: string };
          fullDescription?: { text: string };
          defaultConfiguration: { level: string };
          helpUri?: string;
          properties?: Record<string, any>;
        }>;
      };
    };
    results: Array<{
      ruleId: string;
      ruleIndex: number;
      level: string;
      message: { text: string };
      locations?: Array<{
        physicalLocation?: {
          artifactLocation: {
            uri: string;
            uriBaseId?: string;
          };
        };
        logicalLocations?: Array<{
          name: string;
          kind: string;
        }>;
      }>;
      fingerprints?: Record<string, string>;
      properties?: Record<string, any>;
    }>;
    invocations: Array<{
      executionSuccessful: boolean;
      startTimeUtc?: string;
      endTimeUtc?: string;
    }>;
    artifacts?: Array<{
      location: {
        uri: string;
      };
    }>;
  }>;
}

export function generateSarif(
  findings: ScanFinding[],
  scanMeta: {
    targetValue: string;
    scanId: string;
    startedAt?: string;
    completedAt?: string;
    profile?: string;
  },
): SarifReport {
  // Build unique rules from finding categories
  const ruleMap = new Map<string, { index: number; finding: ScanFinding }>();
  const rules: SarifReport['runs'][0]['tool']['driver']['rules'] = [];

  for (const finding of findings) {
    const ruleId = `VSCAN-${finding.category || 'UNKNOWN'}`;
    if (!ruleMap.has(ruleId)) {
      const index = rules.length;
      ruleMap.set(ruleId, { index, finding });
      rules.push({
        id: ruleId,
        name: finding.category || finding.title,
        shortDescription: { text: finding.title },
        fullDescription: finding.description ? { text: finding.description } : undefined,
        defaultConfiguration: {
          level: SEVERITY_TO_SARIF_LEVEL[finding.severity] || 'warning',
        },
        properties: {
          'security-severity': finding.cvssScore?.toString() || severityToCvss(finding.severity),
          tags: ['security', finding.category?.toLowerCase() || 'vulnerability'].filter(Boolean),
        },
      });
    }
  }

  // Build results
  const results: SarifReport['runs'][0]['results'] = findings.map((finding) => {
    const ruleId = `VSCAN-${finding.category || 'UNKNOWN'}`;
    const ruleEntry = ruleMap.get(ruleId)!;

    const result: SarifReport['runs'][0]['results'][0] = {
      ruleId,
      ruleIndex: ruleEntry.index,
      level: SEVERITY_TO_SARIF_LEVEL[finding.severity] || 'warning',
      message: {
        text: buildMessage(finding),
      },
      fingerprints: {
        vulnscanFindingId: finding.id,
      },
      properties: {
        severity: finding.severity,
        ...(finding.cvssScore && { cvssScore: finding.cvssScore }),
        ...(finding.cveId && { cveId: finding.cveId }),
        ...(finding.cweId && { cweId: finding.cweId }),
        ...(finding.firstFoundAt && { firstFoundAt: finding.firstFoundAt }),
      },
    };

    if (finding.affectedComponent) {
      result.locations = [
        {
          logicalLocations: [
            {
              name: finding.affectedComponent,
              kind: 'url',
            },
          ],
          physicalLocation: {
            artifactLocation: {
              uri: finding.affectedComponent,
            },
          },
        },
      ];
    }

    return result;
  });

  // Collect unique artifacts
  const artifactUris = new Set<string>();
  for (const finding of findings) {
    if (finding.affectedComponent) {
      artifactUris.add(finding.affectedComponent);
    }
  }

  return {
    version: '2.1.0',
    $schema: 'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json',
    runs: [
      {
        tool: {
          driver: {
            name: 'VulnScan ASM',
            version: '1.0.0',
            informationUri: 'https://vulnscan.io',
            rules,
          },
        },
        results,
        invocations: [
          {
            executionSuccessful: true,
            ...(scanMeta.startedAt && { startTimeUtc: scanMeta.startedAt }),
            ...(scanMeta.completedAt && { endTimeUtc: scanMeta.completedAt }),
          },
        ],
        artifacts: Array.from(artifactUris).map((uri) => ({
          location: { uri },
        })),
      },
    ],
  };
}

function buildMessage(finding: ScanFinding): string {
  let msg = finding.description || finding.title;
  if (finding.solution) {
    msg += `\n\nRemediation: ${finding.solution}`;
  }
  if (finding.evidence) {
    msg += `\n\nEvidence: ${finding.evidence}`;
  }
  if (finding.cveId) {
    msg += `\n\nCVE: ${finding.cveId}`;
  }
  return msg;
}

function severityToCvss(severity: string): string {
  switch (severity) {
    case 'CRITICAL': return '9.5';
    case 'HIGH': return '7.5';
    case 'MEDIUM': return '5.0';
    case 'LOW': return '2.5';
    case 'INFO': return '0.0';
    default: return '5.0';
  }
}
