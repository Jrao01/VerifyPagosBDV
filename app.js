import express from 'express';
const app = express();
import puppeteer from 'puppeteer-extra'; // puppeteer-extra >>>>>>> puppeteer
import stealth from 'puppeteer-extra-plugin-stealth';
import anonymizer from 'puppeteer-extra-plugin-anonymize-ua';
import fs from 'fs';
import cors from 'cors';
import dotenv from 'dotenv';
import sequelize from './config/db.js'; 
import Credenciales from './models/credenciales.js';
import Logs from './models/logs.js';
import { error } from 'console';

dotenv.config();
app.use(cors());

const PORT = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

function delay(time) {
    return new Promise(resolve => setTimeout(resolve, time));
}

puppeteer.use(stealth());
puppeteer.use(anonymizer());

let browser;
let page;
let nPagoV = 0;
let nPagoR = 0;
let interruptor = false;
let credenciales = {
    username: 'prueba',
    password: 'prueba'
}
let fail

await sequelize.sync({force:false}).then(async() => {
  console.log('Base de datos lista');
  app.listen(PORT, () => console.log('Servidor en http://localhost:' + PORT));

});


const browserInit = async () => {
        
            browser = await puppeteer.launch({
                headless: false, // Cambia a true para Render
                executablePath: process.env.NODE_ENV === 'production' 
                ? process.env.PUPPETEER_EXECUTABLE_PATH 
                : puppeteer.executablePath(), // Ruta de Chrome en Render
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    //'--disable-dev-shm-usage',
                    '--single-process',
                    '--no-zygote',
                ],
            });
        
            page = await browser.newPage();
        
            // Load cookies
            const cookiesPath = 'cookies.json'; // Cambia la ruta para Render
            if (fs.existsSync(cookiesPath)) {
                try {
                    const cookiesData = fs.readFileSync(cookiesPath, 'utf8');
                    if (cookiesData) {
                        const cookies = JSON.parse(cookiesData);
                        // Extend the expiration time of cookies
                        const extendedCookies = cookies.map(cookie => {
                            if (cookie.expires !== -1 ) {
                                cookie.expires = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30; // Extend by 30 days
                                console.log('Cookie extended:', cookie.name, 'Expires:', cookie.expires);
                            }else if (cookie.name == '_gid' || cookie.Name == '_gid' ) {
                                cookie.session = true; // Set session cookie                       
                                cookie.expires = 'Session'; // Set session cookie                       
                                }
                            return cookie;
                        });
                        await page.setCookie(...extendedCookies);
                    }
                } catch (error) {
                    console.error('Error parsing cookies.json:', error);
                }
            }
        
            await page.goto('https://bdvenlinea.banvenez.com/', { waitUntil: 'load', timeout: 0 });
        
            // Load localStorage // Cambia la ruta para Render
            const localStoragePath = 'localStorage.json'; 
            if (fs.existsSync(localStoragePath)) {
                try {
                    const localStorageData = fs.readFileSync(localStoragePath, 'utf8');
                    if (localStorageData) {
                        await page.evaluate(data => {
                            const entries = JSON.parse(data);
                            for (let [key, value] of Object.entries(entries)) {
                                localStorage.setItem(key, value);
                            }
                        }, localStorageData);
                    }
                } catch (error) {
                    console.error('Error parsing localStorage.json:', error);
                }
            }
        
            page.setRequestInterception(true);
            page.on('request', (request) => {
                if (request.resourceType() === 'document' || request.resourceType() === 'script') {
                    request.continue();
                } else {
                    //request.abort();
                }
            });
}



const refreshSession = async () => {
    try {

        if (browser.isConnected()){
            console.log('starting to Refresh session...');
            await page.goto('https://bdvenlinea.banvenez.com/', { waitUntil: 'domcontentloaded', timeout: 0 });
            try{
                    //console.log('Esperando a que cargue mat-button ');
                    await page.waitForSelector('td mat-icon', { timeout: 2000 });
                    await delay(300);
                    await page.click('td mat-icon');

                    try{
                        await page.waitForSelector('input[placeholder="Buscar"]', { timeout: 2000 });
                    }catch(error){
                        console.error('Error al cargar el input de busqueda :', error);
                        console.log('Intentando de nuevo...');
                        await refreshSession()
                    }
                } catch(error){
                    console.error('mat-button no encontrado:', error);
                    console.log('Intentando de nuevo...');
                    await page.reload();
                    await delay(300);
                    await page.click('td mat-icon');
                }
                console.log('Session refreshed');
            }else{
                console.log('no hay sesion que refrescar')
            }
            
    } catch (error) {
        console.error('Error refreshing session:', error);
        await refreshSession()
    }
};

const Login = async (username,password, testing)=>{
            
            try {
                await page.waitForSelector('input[formcontrolname="username"]', { timeout: 0 });
                await page.type('input[formcontrolname="username"]', username);
                await delay(200);
                await page.click('button[type="submit"]');
                await page.waitForSelector('input[formcontrolname="password"]', { timeout: 0 });
                await page.type('input[formcontrolname="password"]', password);
                await page.click('div.button-container button[type="submit"]');

                try{

                    await delay(500);
                    // <span class="mat-button-wrapper">Aceptar</span>
                    // <button class="ng-tns-c17-54 mat-button" mat-button=""><span class="mat-button-wrapper">Aceptar</span><div class="mat-button-ripple mat-ripple" matripple="" bis_skin_checked="1"></div><div class="mat-button-focus-overlay" bis_skin_checked="1"></div></button>
                    // <button class="ng-tns-c17-16 mat-button" mat-button=""><span class="mat-button-wrapper">Aceptar</span><div class="mat-button-ripple mat-ripple" matripple="" bis_skin_checked="1"></div><div class="mat-button-focus-overlay" bis_skin_checked="1"></div></button>
                    
                    //<simple-snack-bar class="mat-simple-snackbar ng-tns-c17-18 ng-trigger ng-trigger-contentFade ng-star-inserted" style=""><span class="ng-tns-c17-18">Usuario o contraseña incorrecta</span><!----><div class="mat-simple-snackbar-action ng-tns-c17-18 ng-star-inserted" style="" bis_skin_checked="1"><button class="ng-tns-c17-18 mat-button" mat-button=""><span class="mat-button-wrapper">Aceptar</span><div class="mat-button-ripple mat-ripple" matripple="" bis_skin_checked="1"></div><div class="mat-button-focus-overlay" bis_skin_checked="1"></div></button></div></simple-snack-bar>
                    
                    let checkingCreds = await page.evaluate(() => {
                        let rechazo = document.querySelector('button.mat-button span.mat-button-wrapper') ? document.querySelector('button.mat-button span.mat-button-wrapper').innerText : "accediendo";
                        if (rechazo == ' Salir '){
                            console.log('------------------------------')
                            console.log('------------------------------')
                            console.log('------------------------------')
                            console.log(rechazo)
                            console.log('------------------------------')
                            console.log('------------------------------')
                            console.log('------------------------------')
                            return {status: false, message: rechazo, argg : 'Credenciales correctas, accediendo a la cuenta'};
                        } else if(rechazo/* == ' Aceptar '*/){
                            let argg = document.querySelector('simple-snack-bar span.ng-tns-c17-18') ? document.querySelector('simple-snack-bar span.ng-tns-c17-18').innerText : "Error al iniciar sesión";
                            return {status: true, message: rechazo, argg : argg};
                        } 
                    })

                    console.log('-----------------------------');
                    console.log('-----------------------------');
                    console.log('-----------------------------');
                    console.log('checkingCreds:', checkingCreds);
                    console.log('-----------------------------');
                    console.log('-----------------------------');
                    console.log('-----------------------------');

                    if (checkingCreds.status == true){
                        await page.close()
                        await browser.close();
                        return checkingCreds;
                        ///await delay(20000);
                    }
                    
                    try{
                        console.log('Esperando a que cargue mat-button ');
                    await page.waitForSelector('td mat-icon', { timeout: 5000 });
                    await delay(300);
                    await page.click('td mat-icon');

                        try{
                            await page.waitForSelector('input[placeholder="Buscar"]', { timeout: 2000 });
                            if (testing === true){
                                checkingCreds.mode = 'testing';
                                console.log('inicio de sesion de testeo exitoso, cerrando navegador');
                                page.close();
                                browser.close();
                            }
                            return checkingCreds;
                        }catch(error){
                            console.error('Error al cargar el input de busqueda :', error);
                            console.log('Intentando de nuevo...');
                            await refreshSession()
                        }

                    } catch(error){
                        console.error('mat-button no encontrado:', error);
                        console.log('Intentando de nuevo...');
                        await page.reload();
                        await delay(300);
                        await page.click('td mat-icon');
                    }
                }catch(error){
                    console.error('Error al iniciar sesión:', error);
                    console.log('Error al iniciar sesiónnnnn');
                }

            } catch (error) {
                console.error(error);
                console.log('Error al iniciar sesión, revisa las credenciales');
                //browser.close();
                //return fail = true;
            }
    
}

const deployBrowser = async (username, password, testing) => {
    let timer = 0;

    try{
        console.log('revisando credenciales......');
        credenciales = await Credenciales.findOne({where: {id: 1}}) 
        if(credenciales /*|| credenciales.username !== 'prueba' && credenciales.password !== 'prueba'*/){
            //res.status(200).json({message: 'Credenciales encontradas', credenciales});
            console.log('Credenciales encontradas, iniciando navegador...'/*, credenciales,  /*credenciales.username, '  ' , credenciales.password*/ );
            interruptor = true;
        }else{
            //res.status(404).json({message: 'No se encontraron credenciales o hay más de una'});
            console.log('No se encontraron credenciales o hay más de una', credenciales);
        }
    }catch(error){
        console.error('Error al iniciar el navegador:', error);
        return;
    }

    if (interruptor == true){

        await browserInit();
        
            setInterval(refreshSession, 140000); 
            if (testing === true ){
                console.log('-----------------------')
                console.log('-----------------------')
                console.log('-----------------------')
                console.log(testing)
                console.log('-----------------------')
                console.log('-----------------------')
                console.log('-----------------------')
                const tested = await Login(username, password, testing );
                return tested;
            }else{
                const logResult = await Login(credenciales.username, credenciales.password, testing);
                console.log('-----------------------')
                console.log('-----------------------')
                console.log('-----------------------')
                console.log(testing)
                console.log('-----------------------')
                console.log('-----------------------')
                console.log('-----------------------')
                return logResult;
            }
    }
};

//deployBrowser(credenciales.username, credenciales.password, true)

app.post('/registercredencials', async (req, res) => {
    try{
        const { username, password } = req.body;
        await Credenciales.create({username, password});
        if(interruptor === true){
            browser.close();
        }
        await deployBrowser(username, password, true);
        res.status(200).json({ message: 'Credenciales registradas correctamente' });
    }catch(error){
        console.error(error);
        console.log('Error al registrar credenciales',);
        res.status(500).json({ message: 'Error al registrar credenciales', });
    }})

app.post('/editCredentials', async (req, res) => {
    try{
        const { username, password } = req.body;
        await Credenciales.update({username:username,password:password},{ where: { id: 1 } }); 
        
        try{
            if(!page.isClosed()){
                await page.waitForSelector('div.col button.mat-button',{ timeout: 0 });
                await page.click('div.col button.mat-button');
                
                await page.waitForSelector('div.navbar button.mat-button span.mat-button-wrapper span',{ timeout: 0 });
                await page.click('div.navbar button.mat-button span.mat-button-wrapper span');
                
                await page.waitForSelector('div.button-action button', { timeout: 0 });
                await page.click('div.button-action button');

                await page.close();
                await browser.close();
            }
            const falla =  await deployBrowser(username, password, true);

            if (falla  && falla.status === false ){
                console.log(falla.status)
                console.log('Credenciales editadas y verificadas correctamente');
                res.status(200).json({ message: 'Credenciales editadas y verificadas correctamente' })
            }else{
                console.log(falla.status)
                console.log('Error al iniciar sesión con las nuevas credenciales');
                return res.status(500).json({ message: 'Error al iniciar sesión con las nuevas credenciales',  });
            }

        }catch(error){
            console.error('Error al cerrar sesión:', error);
            console.log('Error al cerrar sesión');
            return res.status(500).json({ message: 'Error al cerrar sesión' });
        }
        
        //res.status(200).json({ message: 'Credenciales editadas correctamente' });
    }catch(error){
        console.error(error);
        console.log('Error al editar credenciales',);
        res.status(500).json({ message: 'Error al editar credenciales', });
    }
})


app.get('/seeCredentials', async (req, res) => {
    try {
        const credenciales = await Credenciales.findOne({ where: { id: 1 } });  
        if (credenciales) {
            res.status(200).json(credenciales);
        } else {
            res.status(404).json({ message: 'No se encontraron credenciales' });
        }
    } catch (error) {
        console.error('Error al obtener las credenciales:', error);
        res.status(500).json({ message: 'Error al obtener las credenciales' });
    }
})   

app.get('/deployBrowser', async (req, res) => {
    try{
        const browserStatus = await deployBrowser(credenciales.username, credenciales.password, false);
        
        if(browserStatus && browserStatus.status === false){
            console.log('Navegador desplegado correctamente');
            res.status(200).json({ message: 'Navegador desplegado correctamente' });
        }else{
            console.log('Error al desplegar el navegador');
            console.log('---------------------------');
            console.log('---------------------------');
            console.log('---------------------------');
            console.log('browserStatus:', browserStatus);
            console.log('---------------------------');
            console.log('---------------------------');
            res.status(503).json({ message: browserStatus.argg, reason: 'no han pasado 3 min desde que se cerro el navegador o los son datos incorrectos' });
        }
    }catch(error){
        console.error('Error al desplegar el navegador:', error);
        console.log('Error al desplegar el navegador');
        res.status(500).json({ message: 'Error al desplegar el navegador', reason: 'Error en el servidor' });
    }
})

app.get('/turnOff', async (req, res) => {
    try {

        if(!page.isClosed()){
            await page.close();
            await browser.close();
            console.log('navegador apagado correctamente');
            res.status(200).json({ message: 'Navegador apagado correctamente, espere 3 minutos minimo para volver a inicar' });
        }else{
            console.log('No hay navegador activo para apagar');
            res.status(404).json({ message: 'No hay navegador activo para apagar' });
        }

    }catch (error) {
        console.log('Error al apagar el servidor');
        console.error(error);
        res.status(500).json({ message: 'Error al apagar el servidor' });
    }
})

app.post('/Verify', async (req, res) => {

    console.log('--------------------------')
    console.log('--------------------------')
    console.log('--------------------------')
    console.log(typeof browser.isConnected())
    console.log('--------------------------')
    console.log('--------------------------')
    console.log('--------------------------')

    if(browser.isConnected() !== undefined){

        let { rawreferencia, rawmonto } = req.body;
        let referencia = rawreferencia.toString();
        let monto = parseFloat(rawmonto);

        try {

            try {
                await page.waitForSelector('input[placeholder="Buscar"]', { timeout: 0 });
                await page.type('input[placeholder="Buscar"]', referencia);
            } catch (error) {
                console.error(error);
                console.log('Error en la referencia: ', referencia);
                res.status(500).json({ message: 'intenta de nuevo por favor' });
            }

        let collectedData = await page.evaluate(() => {
            let ref = document.querySelector('mat-row mat-cell.mat-column-referencia') ? document.querySelector('mat-row mat-cell.mat-column-referencia').innerText : "N/A";
            let importe = document.querySelector('mat-row mat-cell.mat-column-importe') ? document.querySelector('mat-row mat-cell.mat-column-importe').innerText : "N/A";
            let importeDone;
            if (importe != "N/A") {
                let cut = importe.split('B');
                let rawnumero = cut[0];
                let mediumrare = rawnumero.replace(/,/, '.');
                let numero = parseFloat(mediumrare);
                importeDone = numero;
            }
            let fecha = document.querySelector('mat-row mat-cell.mat-column-fecha') ? document.querySelector('mat-row mat-cell.mat-column-fecha').innerText : "N/A";
            return {
                ref: ref,
                monto: importeDone,
                fecha: fecha,
            };
        });

        await page.waitForSelector('input[placeholder="Buscar"]', { timeout: 0 });
        await page.$eval('input[placeholder="Buscar"]', el => el.value = '');

        if (collectedData.monto == monto && collectedData.ref.includes(referencia)) {
            collectedData.status = 'Validado';
            collectedData.montorecibido = monto;
            collectedData.RefRecibida = referencia;
            nPagoV = nPagoV + 1;
            console.log('Pago Valido, datos: ', collectedData);
            console.log('------------------------');
            console.log('pagos validados', nPagoV);
            console.log('pagos rechazados', nPagoR);
            console.log('pagos totales', nPagoV + nPagoR);
            console.log('------------------------');
            
            res.status(200).json(collectedData);
            await Logs.create({
                status: collectedData.status,
                fecha: collectedData.fecha,
                ref: collectedData.ref,
                refRecibida: collectedData.RefRecibida,
                monto: collectedData.montorecibido,
                montoRecibido: collectedData.montorecibido
            })
        } else {
            collectedData.status = 'revisar manualmente o descartar';
            collectedData.montorecibido = monto;
            collectedData.RefRecibida = referencia;
            console.log('descartar o verificar manualmente: ', collectedData);
            console.log('--------------------------');
            nPagoR = nPagoR + 1;
            console.log('pagos validados', nPagoV);
            console.log('pagos Rechazados', nPagoR);
            console.log('pagos totales', nPagoV + nPagoR);
            console.log('--------------------------');
            res.status(404).json(collectedData);
                await Logs.create({
                status: collectedData.status,
                fecha: collectedData.fecha,
                ref: collectedData.ref,
                refRecibida: collectedData.RefRecibida,
                monto: collectedData.montorecibido,
                montoRecibido: collectedData.montorecibido
            })
        }
    } catch (error) {
        console.error(error);
        console.log('Error en la referencia: ', referencia);
        res.status(500).json({ message: 'Error en la referencia', referencia: referencia });
    }
}else{
    res.status(503).json({ message:'servicio no disponible', reason: 'No hay navegador activo' });
    console.log('No hay navegador activo ');
}
});


app.get('/logs', async (req, res) => {
    try {
        const logs = await Logs.findAll();
        res.status(200).json(logs);
    } catch (error) {
        console.error('Error al obtener los logs:', error);
        res.status(500).json({ message: 'Error al obtener los logs' });
    }
});


app.post('/editLog', async (req, res) => {
    try {
        const { id, status } = req.body;
        await Logs.update({ status: status }, { where: { id: id } });
        res.status(200).json({ message: 'Log actualizado correctamente' });
    } catch (error) {
        console.error('Error al actualizar el log:', error);
        res.status(500).json({ message: 'Error al actualizar el log' });
    }
});