import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const Logs = sequelize.define('Logs', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  status: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  fecha: {
    type: DataTypes.STRING(20),
    allowNull: false,
  },
  ref: {
    type: DataTypes.STRING(20),
    allowNull: false,
  },  
  refRecibida: {
    type: DataTypes.STRING(20),
    allowNull: false,
  },
  monto: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  montoRecibido: {
    type: DataTypes.FLOAT,
    allowNull:false
  }
}, {
  timestamps: true,
  createdAt: 'fecha_creacion',
  freezeTableName: true,
  tableName: 'Logs',
  paranoid: true,
});

export default Logs;