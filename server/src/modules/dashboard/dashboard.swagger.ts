/**
 * @swagger
 * /dashboard/stats:
 *   get:
 *     tags: [Dashboard]
 *     summary: Get aggregated dashboard statistics
 *     description: Returns targets, scans, assets, vulnerabilities breakdown, trend, and top vulnerable assets.
 *     responses:
 *       200:
 *         description: Dashboard statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 targets:
 *                   type: object
 *                   properties:
 *                     total: { type: integer }
 *                     byStatus: { type: object }
 *                 scans:
 *                   type: object
 *                   properties:
 *                     total: { type: integer }
 *                     recent: { type: array, items: { $ref: '#/components/schemas/Scan' } }
 *                 assets:
 *                   type: object
 *                   properties:
 *                     total: { type: integer }
 *                 vulnerabilities:
 *                   type: object
 *                   properties:
 *                     total: { type: integer }
 *                     bySeverity: { type: object }
 *                     byStatus: { type: object }
 *                     byCategory: { type: array, items: { type: object } }
 *                     trend: { type: array, items: { type: object } }
 *                 topVulnerableAssets:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: { type: string }
 *                       value: { type: string }
 *                       type: { type: string }
 *                       vulnCount: { type: integer }
 *                       criticalCount: { type: integer }
 *                       highCount: { type: integer }
 */
