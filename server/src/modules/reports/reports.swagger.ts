/**
 * @swagger
 * /reports:
 *   get:
 *     tags: [Reports]
 *     summary: List generated reports
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Paginated reports list
 *   post:
 *     tags: [Reports]
 *     summary: Generate a new report
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/GenerateReportRequest'
 *     responses:
 *       202:
 *         description: Report generation started
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Report'
 *
 * /reports/{id}:
 *   get:
 *     tags: [Reports]
 *     summary: Get report details
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Report detail
 *       404:
 *         description: Not found
 *   delete:
 *     tags: [Reports]
 *     summary: Delete a report
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204:
 *         description: Deleted
 *
 * /reports/{id}/download:
 *   get:
 *     tags: [Reports]
 *     summary: Download report file
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Report file (JSON)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       404:
 *         description: Report not found or not ready
 */
