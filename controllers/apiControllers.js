import Credenciales from '../models/credenciales.js';
import Logs from '../models/logs.js';
import fs from 'fs';
import puppeteer from 'puppeteer-extra'; // puppeteer-extra >>>>>>> puppeteer
import stealth from 'puppeteer-extra-plugin-stealth';
import anonymizer from 'puppeteer-extra-plugin-anonymize-ua';
import nodemailer from 'nodemailer';
//qwsk hytw axwz zmaa
puppeteer.use(stealth());
puppeteer.use(anonymizer());

let browser;
let page;
let nPagoV = 0;
let nPagoR = 0;
let serviceStatus = { status: 503, message: 'Servicio no disponible temporalmente, activar manualmente' };
let interruptor = false;
let credenciales = {
    username: 'prueba',
    password: 'prueba'
}

let intervalID

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'julianrafael1604@gmail.com', 
    pass: 'qwskhytwaxwzzmaa', 
  },
});

const mailOptions = {
  from: '"Julian Amer Y Randis Graterl" <julianrafael1604@gmail.com>',
  to: 'sossarifa@gmail.com',
  subject: 'Reporte de satus y actividades del servicio de verificacion de Pagos al BDV',
  text: ''
};

let refreshAttempts = 0;
const MAX_REFRESH_ATTEMPTS = 3;

function delay(time) {
    return new Promise(resolve => setTimeout(resolve, time));
}

const reload = async()=>{

            console.log('starting to Refresh session...');
            serviceStatus = { status: 503, message: 'Servicio no disponible temporalmente refrescando sesion' };
            /*console.log(serviceStatus)
            const check = await page.goto('https://bdvenlinea.banvenez.com/', { waitUntil: 'load', timeout: 0 });
            page.setRequestInterception(true);
            page.on('request', (request) => {
                if (request.resourceType() === 'document' || request.resourceType() === 'script') {
                    request.continue();
                } else {
                    request.continue();
                    //request.abort();
                }
            });
            const status = await check.status();
            console.log('status:', status);*/
            if(refreshAttempts <= 3){

                await page.reload({ waitUntil: 'networkidle0', timeout: 60000 });
                
                //if (check && status == 200) {

                    try{
                        console.log('intento de sessionRefresh nro', refreshAttempts)
                        console.log('Esperando a que cargue mat-button ');
                    await page.waitForSelector('td mat-icon', { timeout: 5000 });
                    await delay(300);
                    await page.click('td mat-icon');
                    
                    try{
                        await page.waitForSelector('input[placeholder="Buscar"]', { timeout:20000 });
                        serviceStatus = { status: 200, message: 'Servicio disponible' };
                                refreshAttempts = 0;
                        }catch(error){
                            refreshAttempts += 1;
                            console.error('Error al cargar el input de busqueda :', error);
                            console.log('Intentando de nuevo...');
                            await reload()
                        }
                        
                    } catch(error){
                        refreshAttempts += 1;
                        console.error('mat-button no encontrado:', error);
                        console.log('Intentando de nuevo...');
                        await reload()
                    }
                    /*} else {
                        console.log('Error al cargar la página due status:');
                if (++refreshAttempts < MAX_REFRESH_ATTEMPTS) {
                    await refreshSession();
                } else {
                    console.error('Máximo de intentos de refresco alcanzado');
                    refreshAttempts = 0;
                        await page.close();
                        await browser.close();
                        serviceStatus = { status: 503, message: 'Servicio no disponible temporalmente, activar manualmente' };
                        }
                        }*/
                    }else{
                        refreshAttempts = 0;
                        console.log('intentos maximos de refresSession aclanzados revisar manualmente, cerrando servicio ')
                        serviceStatus = {status: 503, message:  'Servicio no disponible temporalmente, activar manualmente'}

            mailOptions.text = `Acción: refrescar sesion
            respuesta: intentos maximos de refrescar sesion aclanzados, revisar y reiniciar servicio manualmente, cerrando servicio
            Status del servicio: ${serviceStatus.message}`;

            transporter.sendMail(mailOptions, (error, info) => {
              if (error) {
                console.log('Error al enviar:', error);
              } else {
                console.log('Correo enviado:', info.response);
              }
            });

                        console.log(serviceStatus)
                        // Limpiar ambos almacenamientos
await page.evaluate(() => {
  localStorage.clear();
  sessionStorage.clear();
});
                        await page.close();
                        await browser.close();
                    }
        }


const browserInit = async () => {
        
            if(browser){
                // Limpiar ambos almacenamientos

                await browser.close()
            }

            browser = await puppeteer.launch({
                headless: false, // Cambiar a true para Render
                executablePath: process.env.NODE_ENV === 'production' 
                ? process.env.PUPPETEER_EXECUTABLE_PATH 
                : puppeteer.executablePath(),  // Ruta de Chrome en Render
                //slowMo: 30,
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
        
            const check = await page.goto('https://bdvenlinea.banvenez.com/', { waitUntil: 'load', timeout: 0 });
        
            const status = await check.status();
            console.log('status:', status);

                if(status === 200){
                    serviceStatus = { status: 200, message: 'Servicio disponible' };
                    
                    page.setRequestInterception(true);
                    page.on('request', (request) => {
                        if (request.resourceType() === 'document' || request.resourceType() === 'script') {
                            request.continue();
                        } else {
                            request.continue();
                            //request.abort();
                        }
                    });
                }else{
                    console.log('Error al cargar la página due status:', status);
                    serviceStatus = { status: 503, message: 'Servicio no disponible temporalmente, activar manualmente' };
                    // Limpiar ambos almacenamientos
                    await page.evaluate(() => {
                      localStorage.clear();
                      sessionStorage.clear();
                    });
                    await browser.close();
                }
}

const refreshSession = async () => {
    
    try {
        if (browser && browser.isConnected() && page && !page.isClosed() && serviceStatus.status === 200 ) {
            await reload()
        } else {
            console.log('no hay sesion que refrescar');
            console.log(serviceStatus);
        }
    } catch (error) {
        console.error('Error refreshing session:', error);
            //console.error('Máximo de intentos de refresco alcanzado');
            refreshAttempts = 0;
            // Limpiar ambos almacenamientos
            await page.evaluate(() => {
              localStorage.clear();
              sessionStorage.clear();
            });
            await page.close();
            await browser.close();
            serviceStatus = { status: 503, message: 'Servicio no disponible temporalmente, activar manualmente' };
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
                        if (rechazo == ' Salir ' || rechazo.includes('Salir') ){
                            console.log('------------------------------')
                            console.log('------------------------------')
                            console.log('------------------------------')
                            console.log(rechazo)
                            console.log('------------------------------')
                            console.log('------------------------------')
                            console.log('------------------------------')
                            return {status: false, message: rechazo, argg : 'Credenciales correctas, accediendo a la cuenta'};
                        } else if(rechazo/* == ' Aceptar '*/){
                            let argg = document.querySelector('span.ng-tns-c17-18') ? document.querySelector(/*'simple-snack-bar */'span.ng-tns-c17-18').innerText : "Error al iniciar sesión";
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
                        // Limpiar ambos almacenamientos
                        await page.evaluate(() => {
                          localStorage.clear();
                          sessionStorage.clear();
                        });
                        await page.close()
                        await browser.close();
                        serviceStatus = { status: 503, message: 'Servicio no disponible temporalmente, activar manualmente' };
                        return checkingCreds;
                        ///await delay(20000);
                    }
                    
                    try{
                        console.log('Esperando a que cargue mat-button ');
                    await page.waitForSelector('td mat-icon', { timeout: 5000 });
                    await delay(300);
                    await page.click('td mat-icon');

                        try{
                            await page.waitForSelector('input[placeholder="Buscar"]', { timeout: 8000 });
                            if (testing === true){
                                checkingCreds.mode = 'testing';
                                console.log('inicio de sesion de testeo exitoso, cerrando navegador');
                            // Limpiar ambos almacenamientos
                            await page.evaluate(() => {
                              localStorage.clear();
                              sessionStorage.clear();
                            });
                              const cookies = await page.cookies();
  if (cookies.length > 0) await page.deleteCookie(...cookies);
                                await page.close();
                                await browser.close();
                                serviceStatus = { status: 503, message: 'Servicio no disponible temporalmente, activar manualmente' };
                            }else{
                                serviceStatus = { status: 200, message: 'Servicio  disponible' };
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
                        serviceStatus = { status: 200, message: 'Servicio  disponible' };
                        console.log('mat-button encontrado');
                        return checkingCreds
                    }
                }catch(error){
                    console.error('Error al iniciar sesión:', error);
                    console.log('Error al iniciar sesiónnnnn');
                    serviceStatus = { status: 503, message: 'Servicio no disponible temporalmente, activar manualmente' };
                    return checkingCreds 
                }

            } catch (error) {
                console.error(error);
                console.log('Error al iniciar sesión, revisa las credenciales');
                serviceStatus = { status: 503, message: 'Servicio no disponible temporalmente, activar manualmente' };
                // Limpiar ambos almacenamientos
                await page.evaluate(() => {
                  localStorage.clear();
                  sessionStorage.clear();
                });
                //await browser.close();
                //return fail = true;
            }
    
}

const deployBrowser = async (username, password, testing) => {
    let timer = 0;

    try{
        console.log('revisando credenciales......');
        credenciales = await Credenciales.findOne({where: {id: 1}}) 
        if(credenciales /*|| credenciales.username !== 'prueba' && credenciales.password !== 'prueba'*/){
            console.log('Credenciales encontradas, iniciando navegador...'/*, credenciales,  /*credenciales.username, '  ' , credenciales.password*/ );
            interruptor = true;
        }else{
            console.log('No se encontraron credenciales o hay más de una', credenciales);
            return {status: true, message: ' registre credenciales y luego inicie el servicio', argg : 'No se encontraron credenciales'};
        }
    }catch(error){
        console.error('Error al iniciar el navegador:', error);
        return {status: true, message: 'intente de nuevo, revise credenciales y status del servicio', argg : 'N/A'};;
    }

    if (interruptor == true){

        await browserInit();


            if(intervalID){
                clearInterval(intervalID)
                intervalID = setInterval(refreshSession, 140000);
            }else{
                intervalID = setInterval(refreshSession, 140000); 
            }

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

export const registerCredenciales = async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (interruptor === true) {
                                        // Limpiar ambos almacenamientos
                            await page.evaluate(() => {
                              localStorage.clear();
                              sessionStorage.clear();
                            });
                              const cookies = await page.cookies();
  if (cookies.length > 0) await page.deleteCookie(...cookies);
            browser.close();
        }
        
        await Credenciales.create({
            username,
            password
        });
        
        const falla = await deployBrowser(username, password, true);
        
        if (falla && falla.status === false) {
            

            mailOptions.text = `Acción: Registrar Credenciales
            respuesta: Credenciales registradas y encriptadas correctamente
            Status del servicio: ${serviceStatus.message}`;

            transporter.sendMail(mailOptions, (error, info) => {
              if (error) {

                console.log('Error al enviar:', error);
              } else {
                console.log('Correo enviado:', info.response);
              }
            });

            console.log('Credenciales registradas y encriptadas correctamente');
            res.status(200).json({
                status: 200,
                message: 'Credenciales registradas, verificadas y encriptadas'
            });
        } else {

            mailOptions.text = `
            Acción: Registrar Credenciales
            respuesta: Error al verificar las credenciales
            Status del servicio: ${serviceStatus.message}`;

            transporter.sendMail(mailOptions, (error, info) => {
              if (error) {
                console.log('Error al enviar:', error);
              } else {
                console.log('Correo enviado:', info.response);
              }
            });

            console.log('Error al verificar las credenciales');
            res.status(200).json({
                status: 500,
                message: 'Error al verificar las credenciales'
            });
        }
    } catch (error) {


            mailOptions.text = `
            Acción: Registrar Credenciales
            respuesta: Error al registrar credenciales
            Status del servicio: ${serviceStatus.message}`;

            transporter.sendMail(mailOptions, (error, info) => {
              if (error) {
                console.log('Error al enviar:', error);
              } else {
                console.log('Correo enviado:', info.response);
              }
            });

        console.error('Error al registrar credenciales, puede que ya tenga sus credenciales cargadas:', error);
        res.status(200).json({
            message: 'Error al registrar credenciales, puede que ya tenga sus credenciales cargadas'
        });
    }
};

export const editCreds =  async (req, res) => {
    try{
        console.log('---------------------------')
        console.log('---------------------------')
        console.log('---------------------------')
        console.log(req)
        console.log('---------------------------')
        console.log('---------------------------')
        console.log('---------------------------')
        const { username, password } = req.body;
        await Credenciales.update({username:username,password:password},{ where: { id: 1 } }); 
        // document.querySelector('div.navbar button.mat-button span.mat-button-wrapper span') body > app-root > app-home-layout > app-menu > div > app-sidebar > mat-sidenav-container > mat-sidenav-content > app-navbar > div.navbar > div > button:nth-child(7)
        try{
            if(serviceStatus.status === 200){
                await page.waitForSelector('div.col button.mat-button',{ timeout: 0 });
                await page.click('div.col button.mat-button');

                await page.waitForSelector('body > app-root > app-home-layout > app-menu > div > app-sidebar > mat-sidenav-container > mat-sidenav-content > app-navbar > div.navbar > div > button:nth-child(7)',{ timeout: 0 });
                await page.click('body > app-root > app-home-layout > app-menu > div > app-sidebar > mat-sidenav-container > mat-sidenav-content > app-navbar > div.navbar > div > button:nth-child(7)');
                
                await page.waitForSelector('div.button-action button', { timeout: 0 });
                await page.click('div.button-action button');

                // Limpiar ambos almacenamientos
                await page.evaluate(() => {
                  localStorage.clear();
                  sessionStorage.clear();
                });

                await page.close();
                await browser.close();
            }
            const falla = await deployBrowser(username, password, true);

            if (falla  && falla.status === false ){
                console.log(falla.status)
                serviceStatus = { status: 503, message: 'Servicio no disponible temporalmente, activar manualmente' };

                
                mailOptions.text = `
                Acción: Editar Credenciales
                respuesta: Credenciales editadas y verificadas correctamente
                Status del servicio: ${serviceStatus.message}`;

                transporter.sendMail(mailOptions, (error, info) => {
                  if (error) {
                    console.log('Error al enviar:', error);
                  } else {
                    console.log('Correo enviado:', info.response);
                  }
                });

                console.log('Credenciales editadas y verificadas correctamente');
                res.status(200).json({status:200, message: 'Credenciales editadas y verificadas correctamente' })
            }else{
                console.log(falla.status)
                console.log('Error al iniciar sesión con las nuevas credenciales');
                serviceStatus = { status: 503, message: 'Servicio no disponible temporalmente, activar manualmente' };
                mailOptions.text = `
                Acción: Editar Credenciales
                respuesta: Error al iniciar sesión con las nuevas credenciales
                Status del servicio: ${serviceStatus.message}`;

                transporter.sendMail(mailOptions, (error, info) => {
                  if (error) {
                    console.log('Error al enviar:', error);
                  } else {
                    console.log('Correo enviado:', info.response);
                  }
                });

                res.status(203).json({status:500, message: 'Error al iniciar sesión con las nuevas credenciales',  });
            }

        }catch(error){
            console.error('Error al cerrar sesión luego de editar credenciales:', error);
            console.log('Error al cerrar sesión luego de editar credenciales');
            serviceStatus = { status: 503, message: 'Servicio no disponible temporalmente, activar manualmente' };

                            mailOptions.text = `
                Acción: Editar Credenciales
                respuesta: Error al cerrar sesión luego de editar credenciales
                Status del servicio: ${serviceStatus.message}`;

                transporter.sendMail(mailOptions, (error, info) => {
                  if (error) {
                    console.log('Error al enviar:', error);
                  } else {
                    console.log('Correo enviado:', info.response);
                  }
                });

            res.status(200).json({status:500, message: 'Error al cerrar sesión luego de editar credenciales' });
        }
    }catch(error){
        console.error(error);
        
                serviceStatus = { status: 503, message: 'Servicio no disponible temporalmente, activar manualmente' };
                mailOptions.text = `
                Acción: Editar Credenciales
                respuesta: Error al editar credenciales
                Status del servicio: ${serviceStatus.message}`;

                transporter.sendMail(mailOptions, (error, info) => {
                  if (error) {
                    console.log('Error al enviar:', error);
                  } else {
                    console.log('Correo enviado:', info.response);
                  }
                });

        console.log('Error al editar credenciales',);
        res.status(200).json({status:500, message: 'Error al editar credenciales', });
    }
}

export const getCreds = async (req, res) => {
    try {
        const credenciales = await Credenciales.findOne({ where: { id: 1 } });  
        if (credenciales) {
            credenciales.status = 200;

            console.log(credenciales)
                            mailOptions.text = `
                Acción: Obtener Credenciales
                respuesta: Credenciales Obtenidas exitosamente
                Status del servicio: ${serviceStatus.message}`;

                transporter.sendMail(mailOptions, (error, info) => {
                  if (error) {
                    console.log('Error al enviar:', error);
                  } else {
                    console.log('Correo enviado:', info.response);
                  }
                });

            res.status(200).json(credenciales);
        } else {

                            mailOptions.text = `
                Acción: Obtener Credenciales
                respuesta: No se encontraron credenciales
                Status del servicio: ${serviceStatus.message}`;

                transporter.sendMail(mailOptions, (error, info) => {
                  if (error) {
                    console.log('Error al enviar:', error);
                  } else {
                    console.log('Correo enviado:', info.response);
                  }
                });

            res.status(204).json({ status:404,message: 'No se encontraron credenciales' });
        }
    } catch (error) {
        
                                    mailOptions.text = `
                Acción: Obtener Credenciales
                respuesta: Error al obtener las credenciales
                Status del servicio: ${serviceStatus.message}`;

                transporter.sendMail(mailOptions, (error, info) => {
                  if (error) {
                    console.log('Error al enviar:', error);
                  } else {
                    console.log('Correo enviado:', info.response);
                  }
                });

        console.error('Error al obtener las credenciales:', error);
        res.status(200).json({ status:500,message: 'Error al obtener las credenciales' });
    }
}   

export const deploy = async (req, res) => {
    try{
        if(serviceStatus && serviceStatus.status !== 200){

        const browserStatus = await deployBrowser(credenciales.username, credenciales.password, false);
        
        if(browserStatus && browserStatus.status === false){
            console.log('Navegador desplegado correctamente');
            serviceStatus = { status: 200, message: 'Servicio disponible' };

                mailOptions.text = `
                Acción: Encendido del servicio
                respuesta: Servicio desplegado correctamente
                Status del Servicio: ${serviceStatus.message}`;

                transporter.sendMail(mailOptions, (error, info) => {
                  if (error) {
                    console.log('Error al enviar:', error);
                  } else {
                    console.log('Correo enviado:', info.response);
                  }
                });

            res.status(200).json({status:200, message: 'Servicio desplegado correctamente', argg:'credenciales correctas', points:'N/A' });
        }else{
            console.log('Error al desplegar el navegador');
            console.log('---------------------------');
            console.log('---------------------------');
            console.log('---------------------------');
            console.log('browserStatus:', browserStatus);
            console.log('---------------------------');
            console.log('---------------------------');
            serviceStatus = { status: 503, message: 'Servicio no disponible temporalmente, activar manualmente' };

                mailOptions.text = `
                Acción: Encendido del servicio
                respuesta: error, no han pasado 3 min desde que se cerro el servicio o los son datos incorrectos
                Status del servicio: ${serviceStatus.message}`;

                transporter.sendMail(mailOptions, (error, info) => {
                  if (error) {
                    console.log('Error al enviar:', error);
                  } else {
                    console.log('Correo enviado:', info.response);
                  }
                });

            res.status(203).json({status:503, points: browserStatus.argg , argg:browserStatus.message , message: 'error, espere 3 min y verifique que los datos sean correctos' });
        }
    }else{
        console.log('El servicio ya esta activo, no se puede desplegar de nuevo');
        res.status(200).json({status:200, message: 'El servicio ya esta activo, no se puede desplegar de nuevo' });
    }
    }catch(error){
        console.error('Error al desplegar el navegador:', error);
        console.log('Error al desplegar el navegador');
        serviceStatus = { status: 503, message: 'Servicio no disponible temporalmente, activar manualmente' };

        
                mailOptions.text = `
                Acción: Encendido del servicio
                respuesta:Error al desplegar el servicio
                Status del servicio: ${serviceStatus.message}`;

                transporter.sendMail(mailOptions, (error, info) => {
                  if (error) {
                    console.log('Error al enviar:', error);
                  } else {
                    console.log('Correo enviado:', info.response);
                  }
                });


        res.status(200).json({ status:500,message: 'Error al desplegar el servicio', reason: 'Error en el servidor' });
    }
}

export const shutDown =  async (req, res) => {
    try {

        if(serviceStatus && serviceStatus.status === 200){
                /*await page.waitForSelector('div.col button.mat-button',{ timeout: 0 });
                await page.click('div.col button.mat-button');

                await page.waitForSelector('body > app-root > app-home-layout > app-menu > div > app-sidebar > mat-sidenav-container > mat-sidenav-content > app-navbar > div.navbar > div > button:nth-child(7)',{ timeout: 0 });
                await page.click('body > app-root > app-home-layout > app-menu > div > app-sidebar > mat-sidenav-container > mat-sidenav-content > app-navbar > div.navbar > div > button:nth-child(7)');
                
                await page.waitForSelector('div.button-action button', { timeout: 0 });
                await page.click('div.button-action button');*/

                                            // Limpiar ambos almacenamientos
                            await page.evaluate(() => {
                              localStorage.clear();
                              sessionStorage.clear();
                            });
            const cookies = await page.cookies();
  if (cookies.length > 0) await page.deleteCookie(...cookies);

            await page.close();
            await browser.close();
            serviceStatus = { status: 503, message: 'Servicio no disponible temporalmente, activar manualmente' };
            console.log('navegador apagado correctamente');

            mailOptions.text = `
            Acción: Apagar servicio
            respuesta:Navegador apagado correctamente, espere 3 minutos minimo para volver a inicar
            Status del servicio: ${serviceStatus.message}`;
            transporter.sendMail(mailOptions, (error, info) => {
              if (error) {
                console.log('Error al enviar:', error);
              } else {
                console.log('Correo enviado:', info.response);
              }
            });

            res.status(200).json({status:200, message: 'servicio apagado correctamente, espere 3 minutos minimo para volver a inicar o cambiar credenciales' });
        }else{
            console.log('No hay navegador activo para apagar');
            mailOptions.text = `
            Acción: Apagar servicio
            respuesta:No hay Servicio activo para apagar
            Status del servicio: ${serviceStatus.message}`;
            transporter.sendMail(mailOptions, (error, info) => {
              if (error) {
                console.log('Error al enviar:', error);
              } else {
                console.log('Correo enviado:', info.response);
              }
            });
            res.status(200).json({status:200, message: 'El servicio ya esta apagado' });
        }

    }catch (error) {
        //serviceStatus = { status: 503, message: 'Servicio no disponible temporalmente, activar manualmente' };
        /*if(!page.isClosed() && !browser.isClosed()){
            await page.close();
            await browser.close();
        }*/

            // Limpiar ambos almacenamientos
                await page.evaluate(() => {
                  localStorage.clear();
                  sessionStorage.clear();
                });

        console.log('Error al apagar el servicio');
        mailOptions.text = `
            Acción: Apagar servicio
            respuesta: Error al apagar el servicio
            Status del servicio: ${serviceStatus.message}`;
            transporter.sendMail(mailOptions, (error, info) => {
              if (error) {
                console.log('Error al enviar:', error);
              } else {
                console.log('Correo enviado:', info.response);
              }
            });
        console.error(error);
        res.status(200).json({status:500, message: 'Error al apagar el servicio' });
    }
}

export const verify = async (req, res) => {

    if(serviceStatus.status !== 503){

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

                mailOptions.text = `
            Acción: Verificar Pago
            respuesta: Error al buscar la referencia ${referencia}
            Status del servicio: ${serviceStatus.message}`;
            transporter.sendMail(mailOptions, (error, info) => {
              if (error) {
                console.log('Error al enviar:', error);
              } else {
                console.log('Correo enviado:', info.response);
              }
            });
                res.status(200).json({status:500, message: `Error al buscar la referencia ${referencia} intenta de nuevo por favor` });
            }

        let collectedData = await page.evaluate(() => {
            let ref = document.querySelector('mat-row mat-cell.mat-column-referencia') ? document.querySelector('mat-row mat-cell.mat-column-referencia').innerText : "N/A";
            let importe = document.querySelector('mat-row mat-cell.mat-column-importe') ? document.querySelector('mat-row mat-cell.mat-column-importe').innerText : "N/A";
            let importeDone;
            if (importe != "N/A") {
                let cut = importe.split('B');
                let rawnumero = cut[0];
                let mediumrare = rawnumero.replace(/[^\d,]/g, '');
                let mediummediumrare = mediumrare.replace(/./, '');
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
            
            mailOptions.text = `
            Acción: Verificar Pago
            respuesta: Pago verificado ${collectedData.RefRecibida}, monto: ${collectedData.montorecibido}
            Status del servicio: ${serviceStatus.message}`;
            transporter.sendMail(mailOptions, (error, info) => {
              if (error) {
                console.log('Error al enviar:', error);
              } else {
                console.log('Correo enviado:', info.response);
              }
            });

            res.status(200).json(collectedData);
            const [pago, created ] = await Logs.findOrCreate({
                where: {refRecibida: collectedData.RefRecibida},
                defaults: {
                    status: collectedData.status,
                    fecha: collectedData.fecha,
                    ref: collectedData.ref,
                    refRecibida: collectedData.RefRecibida,
                    monto: collectedData.montorecibido,
                    montoRecibido: collectedData.montorecibido
                },
                
            })

            if(created === true){
                console.log('se creo el registro', pago)
            }else{
                console.log('ya existia el registro de esa referencia')
            }
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

            mailOptions.text = `
            Acción: Verificar Pago
            respuesta: Pago Rechazado, descartar o revisar manualmente ${collectedData.RefRecibida}, monto: ${collectedData.montorecibido}
            Status del servicio: ${serviceStatus.message}`;
            transporter.sendMail(mailOptions, (error, info) => {
              if (error) {
                console.log('Error al enviar:', error);
              } else {
                console.log('Correo enviado:', info.response);
              }
            });

            res.status(200).json(collectedData);
            const [pago, created ] = await Logs.findOrCreate({
                where: {refRecibida: collectedData.RefRecibida},
                defaults: {
                    status: collectedData.status,
                    fecha: collectedData.fecha,
                    ref: collectedData.ref,
                    refRecibida: collectedData.RefRecibida,
                    monto: collectedData.montorecibido,
                    montoRecibido: collectedData.montorecibido
                },
                
            })
            
            if(created === true){
                console.log('se creo el registro', pago)
            }else{
                console.log('ya existia el registro de esa referencia')
            }
        }
    } catch (error) {
        console.error(error);
        console.log('Error en la referencia: ', referencia);
                    mailOptions.text = `
            Acción: Verificar Pago
            respuesta: Pago Rechazado, error al buscar la referencia: ${referencia}
            Status del servicio: ${serviceStatus.message}`;

            transporter.sendMail(mailOptions, (error, info) => {
              if (error) {
                console.log('Error al enviar:', error);
              } else {
                console.log('Correo enviado:', info.response);
              }
            });

        res.status(200).json({ status: 'Error en la referencia', referencia: referencia });
    }
}else{

    mailOptions.text = `
    Acción: Verificar Pago
    respuesta: El servicio no está activo 
    Status del servicio: ${serviceStatus.message}`;
    
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log('Error al enviar:', error);
      } else {
        console.log('Correo enviado:', info.response);
      }
    });

    console.log('No hay navegador activo ');
    res.status(200).json({ status:'su pago no puede ser verificado en este momento, se guardara par verificarse luego', reason: 'No hay servicio activo' });
}
};

export const getLogs =  async (req, res) => {
    try {
        const logs = await Logs.findAll();
            mailOptions.text = `
    Acción: Obtener Registros de Verificacion
    respuesta: Exitoso 
    Status del servicio: ${serviceStatus.message}`;
    
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log('Error al enviar:', error);
      } else {
        console.log('Correo enviado:', info.response);
      }
    });

        res.status(200).json(logs);
    } catch (error) {
            mailOptions.text = `
    Acción: Obtener Registros de Verificacion
    respuesta: Error al obtener los regsitros 
    Status del servicio: ${serviceStatus.message}`;
    
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log('Error al enviar:', error);
      } else {
        console.log('Correo enviado:', info.response);
      }
    });

        console.error('Error al obtener los logs:', error);
        res.status(200).json({ message: 'Error al obtener los logs' });
    }
};

export const checkStatus = async (req, res) => {
    try {

    mailOptions.text = `
    Acción: Checkeo de Status del Servicio
    respuesta: checkeo exitoso 
    Status del servicio: ${serviceStatus.message}`;
    
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log('Error al enviar:', error);
      } else {
        console.log('Correo enviado:', info.response);
      }
    });

    res.status(200).json( serviceStatus );

    } catch (error) {

    mailOptions.text = `
    Acción: Checkeo de Status del Servicio
    respuesta: Error al verificar el servicio
    Status del servicio: ${serviceStatus.message}`;
    
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log('Error al enviar:', error);
      } else {
        console.log('Correo enviado:', info.response);
      }
    });

        console.error('Error al verificar el servicio:', error);
        res.status(200).json({ message: 'Error al verificar el servicio' });
    }
};

export const editLog = async (req, res) => {
    try {
        const { id, status } = req.body;
        await Logs.update({ status: status }, { where: { id: id } });
        
    mailOptions.text = `
    Acción: Edicion de Registro de verificacion
    respuesta: editado exitosamente a status ${status}, id del regsitro : ${id}
    Status del servicio: ${serviceStatus.message}`;
    
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log('Error al enviar:', error);
      } else {
        console.log('Correo enviado:', info.response);
      }
    });

        res.status(200).json({status:200, message: 'Log actualizado correctamente' });
    } catch (error) {
            mailOptions.text = `
    Acción: Edicion de Registro de verificacion
    respuesta:Error al actualizar
    Status del servicio: ${serviceStatus.message}`;
    
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log('Error al enviar:', error);
      } else {
        console.log('Correo enviado:', info.response);
      }
    });
        console.error('Error al actualizar el log:', error);
        res.status(200).json({ status:500,message: 'Error al actualizar el log' });
    }
};

//module.exports = {editCreds, getCreds, deploy,shutDown,registerCredenciales,editLog, checkStatus,getLogs, verify}