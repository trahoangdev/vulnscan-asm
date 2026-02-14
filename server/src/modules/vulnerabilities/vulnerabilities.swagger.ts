/**
 * @swagger
 * /vulnerabilities:
 *   get:
 *     tags: [Vulnerabilities]
 *     summary: List vulnerability findings
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: severity
 *         schema: { type: string, description: 'Comma-separated: CRITICAL,HIGH,MEDIUM,LOW,INFO' }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [OPEN, IN_PROGRESS, FIXED, ACCEPTED, FALSE_POSITIVE] }
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *       - in: query
 *         name: targetId
 *         schema: { type: string }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Paginated vulnerability findings
 *
 * /vulnerabilities/stats:
 *   get:
 *     tags: [Vulnerabilities]
 *     summary: Get vulnerability statistics
 *     responses:
 *       200:
 *         description: Counts by severity, status, category
 *
 * /vulnerabilities/{id}:
 *   get:
 *     tags: [Vulnerabilities]
 *     summary: Get vulnerability detail
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Full vulnerability detail with evidence, remediation
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/VulnFinding'
 *       404:
 *         description: Not found
 *
 * /vulnerabilities/{id}/status:
 *   put:
 *     tags: [Vulnerabilities]
 *     summary: Update vulnerability status
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateVulnStatusRequest'
 *     responses:
 *       200:
 *         description: Status updated
 *       400:
 *         description: Validation error
 */
