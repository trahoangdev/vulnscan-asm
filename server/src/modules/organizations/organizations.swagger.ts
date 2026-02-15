/**
 * @swagger
 * tags:
 *   - name: Organizations
 *     description: Organization settings and team management
 */

/**
 * @swagger
 * /organizations:
 *   get:
 *     tags: [Organizations]
 *     summary: Get current organization details
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Organization details
 *   put:
 *     tags: [Organizations]
 *     summary: Update organization settings
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               logo:
 *                 type: string
 *               billingEmail:
 *                 type: string
 *     responses:
 *       200:
 *         description: Updated organization
 *
 * /organizations/members:
 *   get:
 *     tags: [Organizations]
 *     summary: List organization members
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of members
 *   post:
 *     tags: [Organizations]
 *     summary: Invite a new member
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [ADMIN, MEMBER, VIEWER]
 *     responses:
 *       201:
 *         description: Member invited
 *
 * /organizations/members/{memberId}:
 *   put:
 *     tags: [Organizations]
 *     summary: Update member role
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: memberId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [role]
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [ADMIN, MEMBER, VIEWER]
 *     responses:
 *       200:
 *         description: Role updated
 *   delete:
 *     tags: [Organizations]
 *     summary: Remove a member
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: memberId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Member removed
 */
