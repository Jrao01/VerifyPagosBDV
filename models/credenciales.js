import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const Credenciales = sequelize.define('Credenciales', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  username: {
    type: DataTypes.STRING(200),
    allowNull: false,
  },
  password: {
    type: DataTypes.STRING(200),
    allowNull: false,
  },
  singleton_lock: {
    type: DataTypes.BOOLEAN,
    unique: true,
    defaultValue: true,
    allowNull: false,
    validate: {
      isTrue: (value) => {
        if (value !== true) {
          throw new Error("El valor de singleton_lock debe ser true");
        }
      }
    }
  }
}, {
  timestamps: true,
  createdAt: 'fecha_creacion',
  updatedAt: 'fecha_actualizacion',
  freezeTableName: true,
  tableName: 'Credenciales',
});

export default Credenciales;