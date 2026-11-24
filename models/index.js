'use strict';

const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const basename = path.basename(__filename);
const env = process.env.NODE_ENV || 'development';

let rawConfig = {};
try {
  rawConfig = require(path.join(__dirname, '../config/config.json'))[env] || {};
} catch (e) {
  rawConfig = {};
}

// Override with environment variables
const dbConfig = {
  host: process.env.DB_HOST || rawConfig.host || '127.0.0.1',
  port: process.env.DB_PORT || rawConfig.port || 3306,
  username: process.env.DB_USER || rawConfig.username || 'cedulas_user',
  password: process.env.DB_PASSWORD || rawConfig.password || 'cedulas_secure_password',
  database: process.env.DB_NAME || rawConfig.database || 'cedulas_db',
  dialect: process.env.DB_DIALECT || rawConfig.dialect || 'mysql',
  storage: process.env.DB_STORAGE || rawConfig.storage || ':memory:',
  logging: process.env.DB_LOGGING === 'true' ? console.log : false,
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
};

let sequelize;
if (dbConfig.dialect === 'sqlite') {
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: dbConfig.storage,
    logging: dbConfig.logging
  });
} else {
  sequelize = new Sequelize(
    dbConfig.database,
    dbConfig.username,
    dbConfig.password,
    dbConfig
  );
}

const db = {};

fs.readdirSync(__dirname)
  .filter(file => {
    return (file.indexOf('.') !== 0) && (file !== basename) && (file.slice(-3) === '.js');
  })
  .forEach(file => {
    const model = sequelize['import'](path.join(__dirname, file));
    db[model.name] = model;
  });

Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
