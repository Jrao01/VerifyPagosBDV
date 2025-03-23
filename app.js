import express from 'express';
const app = express();
import puppeteer from 'puppeteer-extra';
import stealth from 'puppeteer-extra-plugin-stealth';
import anonymizer from 'puppeteer-extra-plugin-anonymize-ua';
import fs from 'fs';
import cors from 'cors'

app.use(cors());

const PORT = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

function delay(time) {
    return new Promise(resolve => setTimeout(resolve, time));
}

puppeteer.use(stealth());
puppeteer.use(anonymizer());
/*
let pagos = [
    {referencia: '31598040', monto: 3.50},
    {referencia: '31151114', monto: 1.11},
    {referencia: '31149600', monto: 1},
    {referencia: '31380772', monto: 1},
    {referencia: '31381876', monto: 1},
    {referencia: '31383782', monto: 1},
    {referencia: '31385277', monto: 1},
    {referencia: '31385252', monto: 30}
];*/

let browser;
let page;
let nPagoV = 0;
let nPagoR = 0;

(async () => {
    let timer = 0;
    
    browser = await puppeteer.launch({
        headless: false, 
        //slowMo: 10
    });

    page = await browser.newPage();

    // Load cookies
    const cookiesPath = 'C:\\Users\\julia\\OneDrive\\Desktop\\bcvScrapeo\\cookies.json';
    if (fs.existsSync(cookiesPath)) {
        try {
            const cookiesData = fs.readFileSync(cookiesPath, 'utf8');
            if (cookiesData) {
                const cookies = JSON.parse(cookiesData);
                // Extend the expiration time of cookies
                const extendedCookies = cookies.map(cookie => {
                    if (cookie.expires !== -1) {
                        cookie.expires = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30; // Extend by 30 days
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

    // Load localStorage
    const localStoragePath = 'C:\\Users\\julia\\OneDrive\\Desktop\\bcvScrapeo\\localStorage.json';
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
        //console.log(request.url());
        
        if(request.resourceType() === 'document' /*|| request.resourceType() === 'xhr' */|| request.resourceType() === 'script'){
        request.continue();
        }else{
            request.abort();
        }
    });

    // Function to refresh the session token
    const refreshSession = async () => {
        try {
            await page.goto('https://bdvenlinea.banvenez.com/', { waitUntil: 'domcontentloaded', timeout: 0 });
        await page.waitForSelector('td mat-icon',{timeout: 0});
        console.log('before delay');
        await delay(300);
        console.log('after delay');
        await page.click('td mat-icon');
            console.log('Session refreshed');
        } catch (error) {
            console.error('Error refreshing session:', error);
        }
    };

    // Set interval to refresh the session every minute
    setInterval(refreshSession, 15000);

    try{    
        await page.waitForSelector('input[formcontrolname="username"]',{timeout: 0});
        await page.type('input[formcontrolname="username"]', 'Randyyfiore');
        await delay(200);
        await page.click('button[type="submit"]');
        await page.waitForSelector('input[formcontrolname="password"]',{timeout: 0});
        await page.type('input[formcontrolname="password"]', 'ponySalvaje07.');
        await page.click('div.button-container button[type="submit"]');
        await page.waitForSelector('td mat-icon',{timeout: 0});
        console.log('before delay');
        await delay(300);
        console.log('after delay');
        await page.click('td mat-icon');
    }catch(error){
        console.error(error);
    }

    // Collect and log cookies
    const cookies = await page.cookies();
    //console.log('Session Cookies:', JSON.stringify(cookies, null, 2));

    // Save cookies
    fs.writeFileSync('cookies.json', JSON.stringify(cookies, null, 2));

    //await browser.close();
})();

app.post('/Verify', async (req, res) => {
    
    let {rawreferencia, rawmonto} = req.body;
    let referencia = rawreferencia.toString();
    let monto = parseFloat(rawmonto);    
    //setInterval(()=>{timer = timer + .1}, 100);
        try{
            try{
                await page.waitForSelector('input[placeholder="Buscar"]',{timeout: 0});
                await page.type('input[placeholder="Buscar"]', referencia);
            }catch(error){
                console.error(error);
                console.log('Error en la referencia: ', referencia);
                res.status(500).json({ message: 'intenta de nuevo por favor' });
            }
            //await delay(100);
            let collectedData = await page.evaluate(() => {
                let ref = document.querySelector('mat-row mat-cell.mat-column-referencia') ? document.querySelector('mat-row mat-cell.mat-column-referencia').innerText : "N/A";
                let importe = document.querySelector('mat-row mat-cell.mat-column-importe') ? document.querySelector('mat-row mat-cell.mat-column-importe').innerText : "N/A";
                let importeDone;
                if(importe != "N/A"){
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
            await page.waitForSelector('input[placeholder="Buscar"]',{timeout: 0});
            await page.$eval('input[placeholder="Buscar"]', el => el.value = '');

            if(collectedData.monto == monto && collectedData.ref.includes(referencia)){
                collectedData.satus = 'Validado';
                collectedData.montorecibido = monto;
                collectedData.RefRecibida = referencia;
                nPagoV = nPagoV + 1;
                console.log('Pago Valido, datos: ', collectedData);
                console.log('------------------------');
                console.log('pagos validados',nPagoV );
                console.log('pagos rechazados',nPagoR);
                console.log('pagos totales', nPagoV + nPagoR);
                console.log('------------------------');
                res.status(200).json(collectedData);
            }else{
                collectedData.satus = 'Pago falso, revisar manualmente o descartar';
                collectedData.montorecibido = monto;
                collectedData.RefRecibida = referencia;
                console.log('descartar o verificar manualmente: ', collectedData);
                console.log('--------------------------')
                nPagoR = nPagoR + 1;
                console.log('pagos validados',nPagoV );
                console.log('pagos Rechazados',nPagoR );
                console.log('pagos totales', nPagoV + nPagoR);
                console.log('--------------------------')
                res.status(403).json(collectedData );
            }
        }catch(error){
            console.error(error);
            console.log('Error en la referencia: ', referencia);
            //await page.click('button[mat-dialog-close]');
            res.status(500).json({ message: 'Error en la referencia', referencia: referencia });
        }
    
    //await page.click('div.button_logout_responsive button');
    /*console.log('----------------');
    console.log(timer);
    console.log('----------------');*/
});

app.listen(PORT, () => {
    console.log('Server running on port 3000');
});