import { Router } from 'express';
import { webhooksController } from './webhooks.controller';
import { authenticate, authorize } from '../../middleware/auth';
import { validateBody } from '../../middleware/validate';
import { createWebhookSchema, updateWebhookSchema } from './webhooks.schema';

const router = Router();

router.use(authenticate);

/**
 * @swagger
 * /webhooks:
 *   get:
 *     tags: [Webhooks]
 *     summary: List webhooks
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: page, in: query, schema: { type: integer } }
 *       - { name: limit, in: query, schema: { type: integer } }
 *     responses:
 *       200: { description: OK }
 */
router.get('/', webhooksController.list);

/**
 * @swagger
 * /webhooks/{id}:
 *   get:
 *     tags: [Webhooks]
 *     summary: Get webhook by ID
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: OK }
 */
router.get('/:id', webhooksController.getById);

/**
 * @swagger
 * /webhooks:
 *   post:
 *     tags: [Webhooks]
 *     summary: Create webhook
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, url, events]
 *             properties:
 *               name: { type: string }
 *               url: { type: string, format: url }
 *               secret: { type: string }
 *               events: { type: array, items: { type: string, enum: [scan.completed, scan.failed, vulnerability.critical, vulnerability.high, asset.discovered, report.ready] } }
 *               headers: { type: object }
 *     responses:
 *       201: { description: Created }
 */
router.post('/', authorize('OWNER', 'ADMIN'), validateBody(createWebhookSchema), webhooksController.create);

/**
 * @swagger
 * /webhooks/{id}:
 *   put:
 *     tags: [Webhooks]
 *     summary: Update webhook
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: OK }
 */
router.put('/:id', authorize('OWNER', 'ADMIN'), validateBody(updateWebhookSchema), webhooksController.update);

/**
 * @swagger
 * /webhooks/{id}:
 *   delete:
 *     tags: [Webhooks]
 *     summary: Delete webhook
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       204: { description: Deleted }
 */
router.delete('/:id', authorize('OWNER', 'ADMIN'), webhooksController.delete);

/**
 * @swagger
 * /webhooks/{id}/test:
 *   post:
 *     tags: [Webhooks]
 *     summary: Test webhook delivery
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: OK }
 */
router.post('/:id/test', authorize('OWNER', 'ADMIN'), webhooksController.test);

export default router;
