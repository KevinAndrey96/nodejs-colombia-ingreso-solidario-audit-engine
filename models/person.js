'use strict';

module.exports = (sequelize, DataTypes) => {
  const Person = sequelize.define('Person', {
    document: {
      type: DataTypes.STRING,
      allowNull: false
    },
    firstName: {
      type: DataTypes.STRING,
      allowNull: true
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: true
    },
    score: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    municipality: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    check: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: 'VERIFIED'
    },
    type: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: 'BENEFICIARIO_COVID19'
    }
  }, {
    indexes: [
      {
        fields: ['document']
      },
      {
        fields: ['municipality']
      },
      {
        fields: ['check']
      }
    ]
  });

  Person.associate = function(models) {
    // Associations can be defined here
  };

  return Person;
};
