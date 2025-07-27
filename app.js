import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();
import express from 'express';
const app = express();
import cors from 'cors';
import sequelize from './config/db.js'; 
import apiroutes from './routes/apiroutes.js'
app.use(cors());
const PORT = 4000;
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware para manejar el prefijo /apiPayments
app.use('/apiPayments', (req, res, next) => {
    console.log(`apiPayments request: ${req.method} ${req.originalUrl}`);
    next();
});
app.use('/apiPayments',apiroutes);
app.use('/',apiroutes);


await sequelize.sync({force:false}).then(async() => {
    console.log('Base de datos lista');
    app.listen(PORT,'0.0.0.0',() => console.log('Servidor en http://localhost:' + PORT));

});
