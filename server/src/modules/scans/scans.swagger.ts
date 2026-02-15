/**
 * @swagger
 * /scans:
 *   get:
 *     tags: [Scans]
 *     summary: List scans
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: targetId
 *         schema: { type: string }
 *       - in: query
 *         name: status
 *         schema: { type: string, description: 'Comma-separated: QUEUED,RUNNING,COMPLETED,FAILED,CANCELLED' }
 *     responses:
 *       200:
 *         description: Paginated scan list
 *   post:
 *     tags: [Scans]
 *     summary: Start a new scan
 *     description: Creates a scan job. Target must be verified. Rate-limited to 5/min.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateScanRequest'
 *     responses:
 *       201:
 *         description: Scan queued
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Scan'
 *       403:
 *         description: Target not verified
 *       429:
 *         description: Rate limit exceeded
 *
 * /scans/{id}:
 *   get:
 *     tags: [Scans]
 *     summary: Get scan details
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Scan details with finding/result counts
 *       404:
 *         description: Not found
 *
 * /scans/{id}/cancel:
 *   post:
 *     tags: [Scans]
 *     summary: Cancel a running or queued scan
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Scan cancelled
 *       404:
 *         description: Scan not found or not cancellable
 *
 * /scans/{id}/findings:
 *   get:
 *     tags: [Scans]
 *     summary: List vulnerability findings for a scan
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *       - in: query
 *         name: severity
 *         schema: { type: string, description: 'Comma-separated severities' }
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Paginated findings
 *
 * /scans/{id}/results:
 *   get:
 *     tags: [Scans]
 *     summary: Get raw scan module results
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Raw scan results by module
 */
