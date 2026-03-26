const express = require('express');
const router = express.Router();
const { detectPlate, getJobStatus, getDetections, getDetection, deleteDetection, toggleFavorite, processImageOnly, getDetectionStats, lookupVehicle } = require('../controllers/detectionController');
const { auth, checkUsageLimit } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const { detectionLimiter } = require('../middleware/rateLimiter');

router.use(auth);

router.post('/detect', detectionLimiter, checkUsageLimit, upload.single('image'), detectPlate);
router.post('/process', upload.single('image'), processImageOnly);
router.get('/stats', getDetectionStats);
router.get('/job/:jobId', getJobStatus);
router.get('/lookup/:plateNumber', lookupVehicle);
router.get('/', getDetections);
router.get('/:id', getDetection);
router.delete('/:id', deleteDetection);
router.patch('/:id/favorite', toggleFavorite);

module.exports = router;
