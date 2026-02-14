/**
 * @swagger
 * /assets:
 *   get:
 *     tags: [Assets]
 *     summary: List discovered assets
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
 *         name: type
 *         schema: { type: string, enum: [SUBDOMAIN, IP_ADDRESS, URL, API_ENDPOINT] }
 *       - in: query
 *         name: isActive
 *         schema: { type: boolean }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Paginated assets list
 *
 * /assets/stats:
 *   get:
 *     tags: [Assets]
 *     summary: Get asset statistics
 *     responses:
 *       200:
 *         description: Asset counts by type and status
 *
 * /assets/{id}:
 *   get:
 *     tags: [Assets]
 *     summary: Get asset details
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Asset detail with technologies, ports, SSL info
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Asset'
 *       404:
 *         description: Not found
 */
