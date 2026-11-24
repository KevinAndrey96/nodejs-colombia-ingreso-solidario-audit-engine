'use strict';

/**
 * Anomaly Detection & Civic Audit Engine for Colombian National Identity Numbers
 * and Sisbén Social Protection Scores (Ingreso Solidario DNP Investigation).
 */

const SISBEN_MAX_ELIGIBLE_SCORE = 54.86; // Cutoff for extreme poverty / vulnerability in Sisbén III

/**
 * Checks if a string consists entirely of the same repeated character.
 * e.g., '11111111', '22222222', '00000000'
 */
function isRepeatedDigits(docStr) {
  if (!docStr || docStr.length < 2) return false;
  return /^(\d)\1+$/.test(docStr);
}

/**
 * Checks if a numeric string is an ascending or descending trivial sequence.
 * e.g., '12345678', '87654321', '123456789'
 */
function isSequentialDigits(docStr) {
  if (!docStr || docStr.length < 5) return false;
  
  let ascending = true;
  let descending = true;

  for (let i = 0; i < docStr.length - 1; i++) {
    const curr = parseInt(docStr[i], 10);
    const next = parseInt(docStr[i + 1], 10);

    if (next !== (curr + 1) % 10) {
      ascending = false;
    }
    if (next !== (curr - 1 + 10) % 10) {
      descending = false;
    }
  }

  return ascending || descending;
}

/**
 * Evaluates whether a given DANE municipality code is plausible (standard 5-digit format).
 */
function isValidDaneMunicipality(munCode) {
  if (munCode === null || munCode === undefined) return false;
  const num = parseInt(munCode, 10);
  // DANE codes in Colombia are 5 digits (05001 to 99773), department prefix 05 to 99
  return !isNaN(num) && num >= 5001 && num <= 99999;
}

/**
 * Main evaluation function for a citizen beneficiary record.
 * 
 * @param {Object} record - Citizen beneficiary payload
 * @param {string|number} record.document - National identity card (Cédula)
 * @param {string} record.firstName - First name
 * @param {string} record.lastName - Last name
 * @param {number|string} record.score - Sisbén vulnerability score (0.0 to 100.0)
 * @param {number|string} record.municipality - 5-digit DANE municipality code
 * @param {string} [record.check] - Audit status check
 * @param {string} [record.type] - Beneficiary category or subsidy modality
 * @returns {Object} Audit evaluation result
 */
function analyzeRecord(record) {
  const flags = [];
  const details = [];

  const rawDoc = String(record.document || record.cedula || '').trim();
  const cleanDoc = rawDoc.replace(/\D/g, '');

  // 1. Check Document Format
  if (!rawDoc) {
    flags.push('MISSING_DOCUMENT');
    details.push('Documento de identidad ausente o nulo.');
  } else {
    if (rawDoc !== cleanDoc) {
      flags.push('NON_NUMERIC_CHARS');
      details.push('La cédula contiene caracteres no numéricos o símbolos.');
    }

    if (cleanDoc.length < 6 || cleanDoc.length > 10) {
      flags.push('INVALID_LENGTH');
      details.push(`Longitud de cédula inválida (${cleanDoc.length} dígitos; rango válido: 6 a 10).`);
    }

    if (isRepeatedDigits(cleanDoc)) {
      flags.push('REPEATED_DIGITS');
      details.push(`Cédula sospechosa compuesta por un solo dígito repetido (${cleanDoc}).`);
    }

    if (isSequentialDigits(cleanDoc)) {
      flags.push('SEQUENTIAL_DIGITS');
      details.push(`Cédula sospechosa compuesta por secuencia aritmética trivial (${cleanDoc}).`);
    }
  }

  // 2. Check Name Consistency
  const fName = String(record.firstName || record.name || '').trim();
  const lName = String(record.lastName || '').trim();
  if (!fName || fName.length < 2) {
    flags.push('SUSPICIOUS_NAME');
    details.push('Nombre del beneficiario ausente o con longitud sospechosamente corta.');
  }

  // 3. Check Sisbén Score
  let scoreNum = null;
  if (record.score !== undefined && record.score !== null) {
    const scoreStr = String(record.score).replace(',', '.');
    scoreNum = parseFloat(scoreStr);

    if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > 100) {
      flags.push('OUT_OF_RANGE_SISBEN');
      details.push(`Puntaje Sisbén fuera de rango estadístico válido (${record.score}). Rango: 0 a 100.`);
    } else if (scoreNum > SISBEN_MAX_ELIGIBLE_SCORE) {
      flags.push('INELIGIBLE_SISBEN');
      details.push(`Puntaje Sisbén (${scoreNum}) supera el umbral de vulnerabilidad reglamentario (${SISBEN_MAX_ELIGIBLE_SCORE}) para transferencias no condicionadas.`);
    }
  } else {
    flags.push('MISSING_SISBEN');
    details.push('Puntaje Sisbén no reportado.');
  }

  // 4. Check Municipality DANE code
  if (record.municipality !== undefined && record.municipality !== null) {
    if (!isValidDaneMunicipality(record.municipality)) {
      flags.push('INVALID_MUNICIPALITY_CODE');
      details.push(`Código de municipio DANE no conforme con DIVIPOLA (${record.municipality}).`);
    }
  }

  // Determine Severity Level
  let severity = 'CLEAN';
  if (flags.includes('REPEATED_DIGITS') || flags.includes('SEQUENTIAL_DIGITS') || flags.includes('OUT_OF_RANGE_SISBEN')) {
    severity = 'HIGH';
  } else if (flags.includes('INELIGIBLE_SISBEN') || flags.includes('INVALID_LENGTH') || flags.includes('NON_NUMERIC_CHARS')) {
    severity = 'MEDIUM';
  } else if (flags.length > 0) {
    severity = 'LOW';
  }

  const isAnomaly = flags.length > 0;

  return {
    document: cleanDoc || rawDoc,
    firstName: fName,
    lastName: lName,
    score: scoreNum,
    municipality: record.municipality ? parseInt(record.municipality, 10) : null,
    check: record.check || (isAnomaly ? 'FLAGGED' : 'VERIFIED'),
    type: record.type || 'BENEFICIARIO_COVID19',
    isAnomaly,
    severity,
    flags,
    details
  };
}

module.exports = {
  analyzeRecord,
  isRepeatedDigits,
  isSequentialDigits,
  isValidDaneMunicipality,
  SISBEN_MAX_ELIGIBLE_SCORE
};
