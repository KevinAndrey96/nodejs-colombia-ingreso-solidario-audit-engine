'use strict';

/**
 * Verification Test Suite for the Anomaly Detection & Civic Audit Engine.
 * Runs with Node.js built-in assert module (zero external dependencies).
 */

const assert = require('assert');
const { 
  analyzeRecord, 
  isRepeatedDigits, 
  isSequentialDigits, 
  isValidDaneMunicipality 
} = require('../lib/anomalyDetector');

console.log('[*] Starting Anomaly Detection Engine Verification Tests...\n');

// Test 1: Repeated Digits Detection
console.log('[Test 1] Testing Repeated Digits Detection (Cédulas Fantasma)...');
assert.strictEqual(isRepeatedDigits('11111111'), true, 'Should detect 11111111 as repeated');
assert.strictEqual(isRepeatedDigits('22222222'), true, 'Should detect 22222222 as repeated');
assert.strictEqual(isRepeatedDigits('00000000'), true, 'Should detect 00000000 as repeated');
assert.strictEqual(isRepeatedDigits('1018475892'), false, 'Legitimate cédula should not be flagged');
console.log('  -> Passed: Repeated digits properly identified.\n');

// Test 2: Sequential Digits Detection
console.log('[Test 2] Testing Sequential Digits Detection...');
assert.strictEqual(isSequentialDigits('12345678'), true, 'Should detect ascending sequence');
assert.strictEqual(isSequentialDigits('87654321'), true, 'Should detect descending sequence');
assert.strictEqual(isSequentialDigits('10203040'), false, 'Non-trivial sequence should not be flagged');
console.log('  -> Passed: Arithmetic sequences detected.\n');

// Test 3: DANE Municipality Code Plausibility
console.log('[Test 3] Testing DANE Municipality Code Validation...');
assert.strictEqual(isValidDaneMunicipality(11001), true, '11001 (Bogotá) should be valid');
assert.strictEqual(isValidDaneMunicipality(5001), true, '05001 (Medellín) should be valid');
assert.strictEqual(isValidDaneMunicipality(999999), false, '6-digit code should be invalid');
assert.strictEqual(isValidDaneMunicipality(-10), false, 'Negative code should be invalid');
console.log('  -> Passed: Municipality codes correctly verified.\n');

// Test 4: End-to-End Analysis of Legitimate Beneficiary
console.log('[Test 4] Analyzing Legitimate Beneficiary Record...');
const legitimateRecord = {
  document: '1018475892',
  firstName: 'Carlos',
  lastName: 'Gómez',
  score: '24,5',
  municipality: 11001,
  type: 'BENEFICIARIO_COVID19'
};
const resLegit = analyzeRecord(legitimateRecord);
assert.strictEqual(resLegit.isAnomaly, false, 'Legitimate beneficiary should not be an anomaly');
assert.strictEqual(resLegit.severity, 'CLEAN');
assert.strictEqual(resLegit.score, 24.5);
assert.strictEqual(resLegit.check, 'VERIFIED');
console.log('  -> Passed: Legitimate citizen verified clean.\n');

// Test 5: End-to-End Analysis of Ghost Cédula (Scandal Replica)
console.log('[Test 5] Analyzing Ghost Cédula 11111111...');
const ghostRecord = {
  document: '11111111',
  firstName: 'Fantasma',
  lastName: 'DNP',
  score: 12.0,
  municipality: 11001
};
const resGhost = analyzeRecord(ghostRecord);
assert.strictEqual(resGhost.isAnomaly, true, 'Ghost cédula must be flagged as anomaly');
assert.strictEqual(resGhost.severity, 'HIGH');
assert(resGhost.flags.includes('REPEATED_DIGITS'), 'Must contain REPEATED_DIGITS flag');
console.log('  -> Passed: Ghost cédula correctly flagged with HIGH severity.\n');

// Test 6: Ineligible Sisbén Score Evaluation
console.log('[Test 6] Analyzing Ineligible Sisbén Score (Exceeds Vulnerability Cutoff)...');
const highIncomeRecord = {
  document: '79456123',
  firstName: 'Alfonso',
  lastName: 'Pardo',
  score: 82.5,
  municipality: 11001
};
const resHigh = analyzeRecord(highIncomeRecord);
assert.strictEqual(resHigh.isAnomaly, true, 'High Sisbén score must be flagged');
assert(resHigh.flags.includes('INELIGIBLE_SISBEN'), 'Must contain INELIGIBLE_SISBEN flag');
console.log('  -> Passed: Ineligible Sisbén score flagged.\n');

console.log('====================================================');
console.log('[SUCCESS] All 6 Anomaly Engine tests passed flawlessly!');
console.log('====================================================');
