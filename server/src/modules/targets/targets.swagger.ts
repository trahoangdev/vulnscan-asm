/**
 * @swagger
 * /targets:
 *   get:
 *     tags: [Targets]
 *     summary: List all targets
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [PENDING, VERIFIED, FAILED, EXPIRED] }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Paginated targets list
 *   post:
 *     tags: [Targets]
 *     summary: Create a new target
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateTargetRequest'
 *     responses:
 *       201:
 *         description: Target created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Target'
 *       409:
 *         description: Target already exists
 *
 * /targets/{id}:
 *   get:
 *     tags: [Targets]
 *     summary: Get target by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Target details
 *       404:
 *         description: Not found
 *   put:
 *     tags: [Targets]
 *     summary: Update target
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
 *             type: object
 *             properties:
 *               label: { type: string }
 *               tags: { type: array, items: { type: string } }
 *               scanProfile: { type: string }
 *     responses:
 *       200:
 *         description: Updated target
 *   delete:
 *     tags: [Targets]
 *     summary: Delete target
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204:
 *         description: Deleted
 *
 * /targets/{id}/verify:
 *   post:
 *     tags: [Targets]
 *     summary: Start domain verification
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
 *             type: object
 *             required: [method]
 *             properties:
 *               method:
 *                 type: string
 *                 enum: [DNS_TXT, HTML_FILE, META_TAG]
 *     responses:
 *       200:
 *         description: Verification initiated
 *
 * /targets/{id}/verify/skip:
 *   post:
 *     tags: [Targets]
 *     summary: Skip verification (dev mode)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Verification skipped
 *
 * /targets/{id}/verify/status:
 *   get:
 *     tags: [Targets]
 *     summary: Check verification status
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Current verification status
 *
 * /targets/{id}/assets:
 *   get:
 *     tags: [Targets]
 *     summary: List assets belonging to a target
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
 *     responses:
 *       200:
 *         description: Paginated assets for this target
 */
