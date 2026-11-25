import { Router } from 'express';
import { SenderController } from '../controllers/sender.controller.js';
import { requireAuth } from '../middlewares/auth.js';

const router = Router();

router.use(requireAuth);

router.get('/', SenderController.listSenders);
router.get('/:id/stats', SenderController.getSenderStats);
router.post('/', SenderController.createSender);
router.post('/provision-ethereal', SenderController.provisionEthereal);

export default router;
