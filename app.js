
import express from 'express';
const app = express();


import cors from 'cors';
import dotenv from 'dotenv';
import sequelize from './config/db.js'; 

import apiroutes from './routes/apiroutes.js'

dotenv.config();
app.use(cors({
  origin: 'http://localhost:5000'
}));

const PORT = 4000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/',apiroutes);


await sequelize.sync({force:false}).then(async() => {
    console.log('Base de datos lista');
    app.listen(PORT, () => console.log('Servidor en http://localhost:' + PORT));

});
