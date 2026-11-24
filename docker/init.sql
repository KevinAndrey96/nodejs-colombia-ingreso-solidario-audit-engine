-- Auditoría Cívica Ingreso Solidario (COVID-19 Colombia)
-- Schema & Seed Data for MySQL 8.0

CREATE DATABASE IF NOT EXISTS `cedulas_db` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `cedulas_db`;

CREATE TABLE IF NOT EXISTS `People` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `document` varchar(255) NOT NULL,
  `firstName` varchar(255) DEFAULT NULL,
  `lastName` varchar(255) DEFAULT NULL,
  `score` float DEFAULT NULL,
  `municipality` int(11) DEFAULT NULL,
  `check` varchar(255) DEFAULT 'VERIFIED',
  `type` varchar(255) DEFAULT 'BENEFICIARIO_COVID19',
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `people_document_idx` (`document`),
  KEY `people_municipality_idx` (`municipality`),
  KEY `people_check_idx` (`check`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sample Seed Records from the Historical April 2020 DNP Investigation
INSERT INTO `People` (`document`, `firstName`, `lastName`, `score`, `municipality`, `check`, `type`) VALUES
-- Real / Legitimate Beneficiaries (Verified)
('1018475892', 'Carlos', 'Gómez Restrepo', 24.50, 11001, 'VERIFIED', 'BENEFICIARIO_COVID19'),
('52384910', 'Martha', 'Rodríguez Silva', 18.20, 11001, 'VERIFIED', 'BENEFICIARIO_COVID19'),
('79456123', 'Luis', 'Hernández Castro', 32.10, 05001, 'VERIFIED', 'BENEFICIARIO_COVID19'),
('1098765432', 'Ana', 'María Valencia', 14.80, 76001, 'VERIFIED', 'BENEFICIARIO_COVID19'),
('1032456789', 'Jorge', 'Ramírez Morales', 41.60, 08001, 'VERIFIED', 'BENEFICIARIO_COVID19'),
('80123456', 'Diana', 'Carolina Martínez', 29.30, 68001, 'VERIFIED', 'BENEFICIARIO_COVID19'),

-- Ghost Beneficiaries / Inconsistencies detected during the April 2020 national scandal
('11111111', 'Pedro', 'Pérez Fantasma', 12.00, 11001, 'REPEATED_DIGITS', 'BENEFICIARIO_COVID19'),
('22222222', 'Juan', 'González Duplicado', 15.50, 05001, 'REPEATED_DIGITS', 'BENEFICIARIO_COVID19'),
('33333333', 'María', 'López Sospechoso', 21.00, 76001, 'REPEATED_DIGITS', 'BENEFICIARIO_COVID19'),
('00000000', 'Sin', 'Nombre Registrado', 0.00, 11001, 'REPEATED_DIGITS', 'BENEFICIARIO_COVID19'),
('12345678', 'Secuencia', 'Aritmética Test', 35.40, 68001, 'SEQUENTIAL_DIGITS', 'BENEFICIARIO_COVID19'),
('87654321', 'Inverso', 'Consecutivo DNP', 28.00, 08001, 'SEQUENTIAL_DIGITS', 'BENEFICIARIO_COVID19'),
('10203040', 'Alfonso', 'Pardo Inelegible', 84.50, 11001, 'INELIGIBLE_SISBEN', 'BENEFICIARIO_COVID19'),
('99999999', 'Registro', 'Extremo FueraRango', 145.00, 99999, 'REPEATED_DIGITS,OUT_OF_RANGE_SISBEN,INVALID_MUNICIPALITY_CODE', 'BENEFICIARIO_COVID19');
