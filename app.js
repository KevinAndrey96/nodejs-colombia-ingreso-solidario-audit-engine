'use strict';

const express = require('express');
const path = require('path');
const { Person, sequelize, Sequelize } = require('./models');
const { analyzeRecord } = require('./lib/anomalyDetector');

const app = express();

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// CORS Middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Authorization, X-API-KEY, Origin, X-Requested-With, Content-Type, Accept, Access-Control-Allow-Request-Method');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  res.header('Allow', 'GET, POST, OPTIONS, PUT, DELETE');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Serve Civic Tech Audit Dashboard
app.use(express.static(path.join(__dirname, 'public')));

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'UP',
    service: 'nodejs-colombia-ingreso-solidario-audit-engine',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

/**
 * Ingestion handler used by both POST / and POST /api/audit/batch
 */
async function handleBatchIngest(req, res) {
  try {
    const rawBatch = Array.isArray(req.body) ? req.body : (req.body.records || []);
    if (!rawBatch.length) {
      return res.status(400).json({
        status: 'error',
        message: 'El cuerpo de la petición debe contener un arreglo no vacío de registros.'
      });
    }

    const analyzedRecords = [];
    let anomalyCount = 0;

    for (const item of rawBatch) {
      const analysis = analyzeRecord(item);
      if (analysis.isAnomaly) {
        anomalyCount++;
      }

      analyzedRecords.push({
        document: analysis.document,
        firstName: analysis.firstName,
        lastName: analysis.lastName,
        score: analysis.score,
        municipality: analysis.municipality,
        check: analysis.flags.length > 0 ? analysis.flags.join(',') : 'VERIFIED',
        type: analysis.type
      });
    }

    // High-performance batch insertion
    const created = await Person.bulkCreate(analyzedRecords, {
      ignoreDuplicates: true
    });

    res.status(200).json({
      status: '200',
      message: 'Ok',
      processed: rawBatch.length,
      ingested: created.length,
      anomalies_detected: anomalyCount,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Error][Ingestion]:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error al procesar el lote de registros.',
      error: error.message
    });
  }
}

// Backward-compatible ingestion endpoint
app.post('/', handleBatchIngest);

// API Batch Ingestion Endpoint
app.post('/api/audit/batch', handleBatchIngest);

/**
 * Single Real-Time Verification Endpoint (Interactive Tester)
 */
app.post('/api/audit/verify-single', (req, res) => {
  const result = analyzeRecord(req.body || {});
  res.json({
    status: 'success',
    data: result
  });
});

/**
 * Audit Statistics & Telemetry Summary
 */
app.get('/api/audit/stats', async (req, res) => {
  try {
    const totalRecords = await Person.count();
    
    // Count anomalies (where check != 'VERIFIED')
    const anomalousRecords = await Person.count({
      where: {
        check: {
          [Sequelize.Op.ne]: 'VERIFIED'
        }
      }
    });

    const cleanRecords = totalRecords - anomalousRecords;
    const anomalyRate = totalRecords > 0 ? ((anomalousRecords / totalRecords) * 100).toFixed(2) : 0;

    // Average Sisbén score
    const avgResult = await Person.findAll({
      attributes: [
        [Sequelize.fn('AVG', Sequelize.col('score')), 'avgScore']
      ],
      raw: true
    });
    const avgScore = avgResult[0] && avgResult[0].avgScore ? parseFloat(avgResult[0].avgScore).toFixed(2) : 0;

    // Breakdown by check / anomaly flag
    const flagCounts = await Person.findAll({
      attributes: [
        'check',
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
      ],
      group: ['check'],
      order: [[Sequelize.fn('COUNT', Sequelize.col('id')), 'DESC']],
      limit: 10,
      raw: true
    });

    // Top municipalities
    const municipalityCounts = await Person.findAll({
      attributes: [
        'municipality',
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
      ],
      where: {
        municipality: {
          [Sequelize.Op.ne]: null
        }
      },
      group: ['municipality'],
      order: [[Sequelize.fn('COUNT', Sequelize.col('id')), 'DESC']],
      limit: 6,
      raw: true
    });

    res.json({
      status: 'success',
      data: {
        totalRecords,
        cleanRecords,
        anomalousRecords,
        anomalyRate: parseFloat(anomalyRate),
        averageScore: parseFloat(avgScore),
        flagBreakdown: flagCounts,
        topMunicipalities: municipalityCounts
      }
    });
  } catch (error) {
    console.error('[Error][Stats]:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

/**
 * Flagged Inconsistencies & Anomalies Listing
 */
app.get('/api/audit/anomalies', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 50;
    const offset = parseInt(req.query.offset, 10) || 0;

    const anomalies = await Person.findAll({
      where: {
        check: {
          [Sequelize.Op.ne]: 'VERIFIED'
        }
      },
      order: [['id', 'DESC']],
      limit,
      offset
    });

    res.json({
      status: 'success',
      count: anomalies.length,
      limit,
      offset,
      data: anomalies
    });
  } catch (error) {
    console.error('[Error][Anomalies]:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

/**
 * General Paginated Records Listing
 */
app.get('/api/audit/records', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 25;
    const page = parseInt(req.query.page, 10) || 1;
    const offset = (page - 1) * limit;

    const whereClause = {};
    if (req.query.search) {
      whereClause.document = {
        [Sequelize.Op.like]: `%${req.query.search}%`
      };
    }
    if (req.query.check) {
      whereClause.check = req.query.check;
    }

    const { count, rows } = await Person.findAndCountAll({
      where: whereClause,
      order: [['id', 'DESC']],
      limit,
      offset
    });

    res.json({
      status: 'success',
      total: count,
      page,
      totalPages: Math.ceil(count / limit),
      data: rows
    });
  } catch (error) {
    console.error('[Error][Records]:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Server Initialization
const PORT = process.env.PORT || 8097;

if (process.env.NODE_ENV !== 'test') {
  // Sync database models if in development
  sequelize.sync().then(() => {
    app.listen(PORT, () => {
      console.log(`[Ingreso Solidario Audit Engine] Running on port ${PORT}`);
    });
  }).catch(err => {
    console.error('[Database Connection Error]:', err);
    // Start server anyway so health check and standalone tests work
    app.listen(PORT, () => {
      console.log(`[Ingreso Solidario Audit Engine] Running on port ${PORT} (DB offline)`);
    });
  });
}

module.exports = app;
