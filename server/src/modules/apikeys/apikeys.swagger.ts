/**
 * @swagger
 * tags:
 *   - name: API Keys
 *     description: API key management — generate, list, revoke
 */

/**
 * @swagger
 * /api-keys:
 *   get:
 *     tags: [API Keys]
 *     summary: List your API keys
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of API keys (prefix only, no full key)
 *   post:
 *     tags: [API Keys]
 *     summary: Generate a new API key
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *                 description: Friendly name for the key
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [read, write, scan, admin]
 *               expiresInDays:
 *                 type: integer
 *                 description: Number of days until expiration
 *     responses:
 *       201:
 *         description: API key created (full key shown only once)
 *
 * /api-keys/{id}:
 *   delete:
 *     tags: [API Keys]
 *     summary: Revoke an API key
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Key revoked
 */
