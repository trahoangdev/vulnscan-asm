# CI/CD Integration Guide

Integrate VulnScan ASM into your CI/CD pipeline to automatically scan targets before or after deployment.

## Table of Contents

- [Authentication](#authentication)
- [GitHub Actions](#github-actions)
- [GitLab CI/CD](#gitlab-cicd)
- [Azure DevOps](#azure-devops)
- [Jenkins](#jenkins)
- [Generic CLI Usage](#generic-cli-usage)
- [SARIF Export for Code Scanning](#sarif-export-for-code-scanning)
- [Webhook Notifications](#webhook-notifications)

---

## Authentication

All API calls require an API key. Generate one from **Settings → API Keys** in the dashboard.

```bash
# Set as environment variable
export VULNSCAN_API_KEY="vsk_your_api_key_here"
export VULNSCAN_API_URL="https://your-vulnscan-instance.com/api/v1"
```

## GitHub Actions

### Basic Scan on Deploy

```yaml
# .github/workflows/security-scan.yml
name: Security Scan
on:
  push:
    branches: [main]
  schedule:
    - cron: '0 2 * * 1'  # Weekly on Monday at 2am

jobs:
  security-scan:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger VulnScan
        id: scan
        run: |
          RESPONSE=$(curl -s -X POST "${{ secrets.VULNSCAN_API_URL }}/scans" \
            -H "Authorization: Bearer ${{ secrets.VULNSCAN_API_KEY }}" \
            -H "Content-Type: application/json" \
            -d '{
              "targetId": "${{ secrets.VULNSCAN_TARGET_ID }}",
              "profile": "STANDARD"
            }')
          SCAN_ID=$(echo $RESPONSE | jq -r '.data.id')
          echo "scan_id=$SCAN_ID" >> $GITHUB_OUTPUT

      - name: Wait for Scan Completion
        run: |
          SCAN_ID="${{ steps.scan.outputs.scan_id }}"
          for i in $(seq 1 60); do
            STATUS=$(curl -s "${{ secrets.VULNSCAN_API_URL }}/scans/$SCAN_ID" \
              -H "Authorization: Bearer ${{ secrets.VULNSCAN_API_KEY }}" \
              | jq -r '.data.status')
            echo "Scan status: $STATUS (attempt $i/60)"
            if [ "$STATUS" = "COMPLETED" ] || [ "$STATUS" = "FAILED" ]; then
              break
            fi
            sleep 30
          done

      - name: Download SARIF Report
        run: |
          SCAN_ID="${{ steps.scan.outputs.scan_id }}"
          curl -s "${{ secrets.VULNSCAN_API_URL }}/reports/scans/$SCAN_ID/sarif" \
            -H "Authorization: Bearer ${{ secrets.VULNSCAN_API_KEY }}" \
            -o vulnscan-results.sarif

      - name: Upload SARIF to GitHub Security
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: vulnscan-results.sarif
          category: vulnscan-asm

      - name: Check for Critical Findings
        run: |
          SCAN_ID="${{ steps.scan.outputs.scan_id }}"
          CRITICAL=$(curl -s "${{ secrets.VULNSCAN_API_URL }}/scans/$SCAN_ID" \
            -H "Authorization: Bearer ${{ secrets.VULNSCAN_API_KEY }}" \
            | jq '.data.criticalCount')
          if [ "$CRITICAL" -gt 0 ]; then
            echo "::error::Found $CRITICAL critical vulnerabilities!"
            exit 1
          fi
```

### Pull Request Comment

```yaml
      - name: Comment PR with Results
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            const scanId = '${{ steps.scan.outputs.scan_id }}';
            // Fetch findings summary
            const resp = await fetch(
              `${{ secrets.VULNSCAN_API_URL }}/scans/${scanId}`,
              { headers: { Authorization: `Bearer ${{ secrets.VULNSCAN_API_KEY }}` } }
            );
            const { data } = await resp.json();
            const body = `## 🔒 VulnScan Results
            | Severity | Count |
            |----------|-------|
            | Critical | ${data.criticalCount || 0} |
            | High | ${data.highCount || 0} |
            | Medium | ${data.mediumCount || 0} |
            | Low | ${data.lowCount || 0} |
            | Info | ${data.infoCount || 0} |

            [View full report →](${process.env.CLIENT_URL}/scans/${scanId})`;
            github.rest.issues.createComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
              body
            });
```

---

## GitLab CI/CD

```yaml
# .gitlab-ci.yml
security-scan:
  stage: test
  image: curlimages/curl:latest
  variables:
    VULNSCAN_API_URL: $VULNSCAN_API_URL
    VULNSCAN_API_KEY: $VULNSCAN_API_KEY
    VULNSCAN_TARGET_ID: $VULNSCAN_TARGET_ID
  script:
    # Trigger scan
    - |
      SCAN_ID=$(curl -s -X POST "$VULNSCAN_API_URL/scans" \
        -H "Authorization: Bearer $VULNSCAN_API_KEY" \
        -H "Content-Type: application/json" \
        -d "{\"targetId\": \"$VULNSCAN_TARGET_ID\", \"profile\": \"STANDARD\"}" \
        | jq -r '.data.id')

    # Wait for completion
    - |
      for i in $(seq 1 60); do
        STATUS=$(curl -s "$VULNSCAN_API_URL/scans/$SCAN_ID" \
          -H "Authorization: Bearer $VULNSCAN_API_KEY" \
          | jq -r '.data.status')
        [ "$STATUS" = "COMPLETED" ] || [ "$STATUS" = "FAILED" ] && break
        sleep 30
      done

    # Download SARIF
    - |
      curl -s "$VULNSCAN_API_URL/reports/scans/$SCAN_ID/sarif" \
        -H "Authorization: Bearer $VULNSCAN_API_KEY" \
        -o gl-sast-report.json

    # Fail if critical findings
    - |
      CRITICAL=$(curl -s "$VULNSCAN_API_URL/scans/$SCAN_ID" \
        -H "Authorization: Bearer $VULNSCAN_API_KEY" \
        | jq '.data.criticalCount')
      [ "$CRITICAL" -gt 0 ] && exit 1 || true

  artifacts:
    reports:
      sast: gl-sast-report.json
  only:
    - main
    - merge_requests
```

---

## Azure DevOps

```yaml
# azure-pipelines.yml
trigger:
  branches:
    include: [main]

pool:
  vmImage: 'ubuntu-latest'

steps:
  - script: |
      SCAN_ID=$(curl -s -X POST "$(VULNSCAN_API_URL)/scans" \
        -H "Authorization: Bearer $(VULNSCAN_API_KEY)" \
        -H "Content-Type: application/json" \
        -d '{"targetId": "$(VULNSCAN_TARGET_ID)", "profile": "STANDARD"}' \
        | jq -r '.data.id')
      echo "##vso[task.setvariable variable=SCAN_ID]$SCAN_ID"
    displayName: 'Trigger VulnScan'

  - script: |
      for i in $(seq 1 60); do
        STATUS=$(curl -s "$(VULNSCAN_API_URL)/scans/$(SCAN_ID)" \
          -H "Authorization: Bearer $(VULNSCAN_API_KEY)" \
          | jq -r '.data.status')
        [ "$STATUS" = "COMPLETED" ] || [ "$STATUS" = "FAILED" ] && break
        sleep 30
      done
    displayName: 'Wait for Scan'

  - script: |
      curl -s "$(VULNSCAN_API_URL)/reports/scans/$(SCAN_ID)/sarif" \
        -H "Authorization: Bearer $(VULNSCAN_API_KEY)" \
        -o $(Build.ArtifactStagingDirectory)/vulnscan.sarif
    displayName: 'Download SARIF'

  - task: PublishBuildArtifacts@1
    inputs:
      PathtoPublish: '$(Build.ArtifactStagingDirectory)/vulnscan.sarif'
      ArtifactName: 'SecurityScan'
```

---

## Jenkins

```groovy
// Jenkinsfile
pipeline {
    agent any

    environment {
        VULNSCAN_API_URL = credentials('vulnscan-api-url')
        VULNSCAN_API_KEY = credentials('vulnscan-api-key')
        VULNSCAN_TARGET_ID = credentials('vulnscan-target-id')
    }

    stages {
        stage('Security Scan') {
            steps {
                script {
                    // Trigger scan
                    def response = sh(
                        script: """curl -s -X POST "${VULNSCAN_API_URL}/scans" \
                            -H "Authorization: Bearer ${VULNSCAN_API_KEY}" \
                            -H "Content-Type: application/json" \
                            -d '{"targetId": "${VULNSCAN_TARGET_ID}", "profile": "STANDARD"}'""",
                        returnStdout: true
                    ).trim()
                    def scanId = readJSON(text: response).data.id

                    // Wait for completion
                    def status = 'QUEUED'
                    for (int i = 0; i < 60 && status != 'COMPLETED' && status != 'FAILED'; i++) {
                        sleep(30)
                        def statusResp = sh(
                            script: """curl -s "${VULNSCAN_API_URL}/scans/${scanId}" \
                                -H "Authorization: Bearer ${VULNSCAN_API_KEY}" """,
                            returnStdout: true
                        ).trim()
                        status = readJSON(text: statusResp).data.status
                        echo "Scan status: ${status}"
                    }

                    // Download SARIF
                    sh """curl -s "${VULNSCAN_API_URL}/reports/scans/${scanId}/sarif" \
                        -H "Authorization: Bearer ${VULNSCAN_API_KEY}" \
                        -o vulnscan-results.sarif"""

                    // Check findings
                    def scanResp = sh(
                        script: """curl -s "${VULNSCAN_API_URL}/scans/${scanId}" \
                            -H "Authorization: Bearer ${VULNSCAN_API_KEY}" """,
                        returnStdout: true
                    ).trim()
                    def criticalCount = readJSON(text: scanResp).data.criticalCount
                    if (criticalCount > 0) {
                        error("Found ${criticalCount} critical vulnerabilities!")
                    }
                }
            }
        }
    }
    post {
        always {
            archiveArtifacts artifacts: 'vulnscan-results.sarif', allowEmptyArchive: true
        }
    }
}
```

---

## Generic CLI Usage

### Trigger a Scan

```bash
# Start a scan
SCAN_RESPONSE=$(curl -s -X POST "$VULNSCAN_API_URL/scans" \
  -H "Authorization: Bearer $VULNSCAN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "targetId": "YOUR_TARGET_ID",
    "profile": "DEEP",
    "scanConfig": {
      "excludePaths": ["/logout", "/api/health"],
      "maxConcurrent": 3,
      "requestDelay": 200
    }
  }')

SCAN_ID=$(echo $SCAN_RESPONSE | jq -r '.data.id')
echo "Scan started: $SCAN_ID"
```

### Poll for Results

```bash
# Wait for scan to complete
while true; do
  STATUS=$(curl -s "$VULNSCAN_API_URL/scans/$SCAN_ID" \
    -H "Authorization: Bearer $VULNSCAN_API_KEY" \
    | jq -r '.data.status')
  echo "Status: $STATUS"
  [ "$STATUS" = "COMPLETED" ] || [ "$STATUS" = "FAILED" ] && break
  sleep 15
done
```

### Export Results

```bash
# SARIF format (for GitHub/GitLab code scanning)
curl -s "$VULNSCAN_API_URL/reports/scans/$SCAN_ID/sarif" \
  -H "Authorization: Bearer $VULNSCAN_API_KEY" \
  -o results.sarif

# CSV export
curl -s "$VULNSCAN_API_URL/scans/$SCAN_ID/findings?format=csv" \
  -H "Authorization: Bearer $VULNSCAN_API_KEY" \
  -o findings.csv

# JSON export
curl -s "$VULNSCAN_API_URL/scans/$SCAN_ID/findings?format=json" \
  -H "Authorization: Bearer $VULNSCAN_API_KEY" \
  -o findings.json
```

---

## SARIF Export for Code Scanning

VulnScan ASM supports [SARIF v2.1.0](https://docs.oasis-open.org/sarif/sarif/v2.1.0/sarif-v2.1.0.html) export, which is compatible with:

- **GitHub Security** — Code Scanning alerts
- **GitLab SAST** — Security dashboard
- **Azure DevOps** — Advanced Security
- **VS Code** — SARIF Viewer extension
- **SonarQube** — External issues import

### Endpoint

```
GET /api/v1/reports/scans/:scanId/sarif
Authorization: Bearer <API_KEY>
Content-Type: application/sarif+json
```

### GitHub Code Scanning Upload

```yaml
- uses: github/codeql-action/upload-sarif@v3
  with:
    sarif_file: vulnscan-results.sarif
    category: vulnscan-asm
```

---

## Webhook Notifications

Configure webhooks in **Settings → Webhooks** to receive real-time notifications when scans complete.

### Webhook Payload

```json
{
  "event": "scan.completed",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "scanId": "clx...",
    "targetValue": "example.com",
    "status": "COMPLETED",
    "findings": {
      "critical": 0,
      "high": 2,
      "medium": 5,
      "low": 3,
      "info": 1
    },
    "duration": 1234,
    "dashboardUrl": "https://app.vulnscan.io/scans/clx..."
  }
}
```

### Supported Events

| Event | Description |
|-------|-------------|
| `scan.completed` | Scan finished (success or failure) |
| `scan.started` | Scan began processing |
| `finding.new` | New vulnerability discovered |
| `finding.fixed` | Previously open finding resolved |
| `target.verified` | Domain ownership verified |

---

## Environment Variables Reference

| Variable | Description | Required |
|----------|-------------|----------|
| `VULNSCAN_API_URL` | Base API URL (e.g., `https://app.vulnscan.io/api/v1`) | Yes |
| `VULNSCAN_API_KEY` | API key from Settings → API Keys | Yes |
| `VULNSCAN_TARGET_ID` | Target ID to scan | Yes |
| `VULNSCAN_PROFILE` | Scan profile: `QUICK`, `STANDARD`, `DEEP` | No (default: `STANDARD`) |
| `VULNSCAN_FAIL_ON_CRITICAL` | Exit with error if critical findings | No (default: `true`) |
