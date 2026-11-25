import { Router } from 'express';
import { EmailController } from '../controllers/email.controller.js';
import { requireAuth } from '../middlewares/auth.js';

const router = Router();

router.use(requireAuth);

router.get('/search', EmailController.searchEmails);
router.post('/schedule', EmailController.scheduleEmails);
router.post('/parse-leads', EmailController.parseLeads);
router.get('/scheduled', EmailController.getScheduledEmails);
router.get('/sent', EmailController.getSentEmails);
router.delete('/:id', EmailController.cancelEmail);

export default router;
