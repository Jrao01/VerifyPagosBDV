import { Sequelize } from 'sequelize';
import path from 'path';
import { fileURLToPath } from 'url';

// Obtener ruta del directorio actual (equivalente a __dirname)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, 'base.db'),
  logging: console.log
});

export default sequelize;