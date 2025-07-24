import Credenciales from '../models/credenciales.js';
import Logs from '../models/logs.js';
import fs from 'fs';
import { sendWhatsAppMessage } from '../utils/whatsappService.js';
import puppeteer from 'puppeteer-extra'; // puppeteer-extra >>>>>>> puppeteer
import stealth from 'puppeteer-extra-plugin-stealth';
import anonymizer from 'puppeteer-extra-plugin-anonymize-ua';
import nodemailer from 'nodemailer';

import crypto from 'crypto';
import { time } from 'console';
const telepono = '584244588840'
// Configuración de encriptación
const ENCRYPTION_KEY = "una_clave_secreta_muy_larga_y_compleja_de_al_menos_32_bytes"; // 32+ caracteres
const IV_LENGTH = 16;
const type = true
let checkInterval

function encrypt(text) {
  const iv = crypto.randomBytes(IV_LENGTH);
  // Generar clave de 32 bytes usando SHA-256
  const key = crypto.createHash('sha256')
    .update(ENCRYPTION_KEY)
    .digest()
    .slice(0, 32);  // Asegurar 32 bytes
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`;
}

function decrypt(text) {
  const [ivHex, encryptedHex] = text.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  // Generar clave de 32 bytes usando SHA-256
  const key = crypto.createHash('sha256')
    .update(ENCRYPTION_KEY)
    .digest()
    .slice(0, 32);  // Asegurar 32 bytes
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// Función que espera hasta que serviceStatus.status sea 200
function waitForServiceAvailable(timeout = 120000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    // Verificar inmediatamente si ya está disponible
    if (serviceStatus.status === 200) {
      return resolve();
    }

    const checkInterval = setInterval(() => {
      // Verificar si el servicio está disponible
      if (serviceStatus.status === 200) {
        clearInterval(checkInterval);
        resolve();
      }
      // Verificar timeout
      else if (Date.now() - startTime > timeout) {
        clearInterval(checkInterval);
        reject(new Error('Tiempo de espera agotado para la disponibilidad del servicio'));
      }
    }, 1000); // Verificar cada segundo
  });
}

function CheckPageClosed() {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    if (checkInterval) {
      clearInterval(checkInterval);
    }

    // Verificar inmediatamente si ya está disponible
    if (page.isClosed()) {
      return resolve();
    }

    checkInterval = setInterval(async () => {
      // Verificar si el servicio está disponible
      if (await page.isClosed() && serviceStatus.message !== 'Servicio no disponible temporalmente refrescando , espere 20 segundos' && serviceStatus.message == 'Servicio no disponible temporalmente refrescando sesion') {
        clearInterval(checkInterval);
        type = false
        console.log('falseando type')
        await shutDown()
        type = true;
        console.log('trueando type')
        console.log('se detecto que el browser se apago')
        resolve();
      } else if (serviceStatus.message == 'Servicio no disponible temporalmente refrescando sesion, espere 20 segundos') {
        console.log('el browser sigue activo ')
      }
    }, 10000); // Verificar cada segundo
  });
}

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

const reload = async () => {

  console.log('starting to Refresh session...');
  serviceStatus = { status: 503, message: 'Servicio no disponible temporalmente refrescando sesion, espere 20 segundos' };

  if (refreshAttempts <= 3) {

    try {

      await page.reload({ waitUntil: 'load', timeout: 0 });

    } catch (error) {
      console.error('Error al recargar la página en primer try de reload:', error);
      console.log('Error al recargar la página, intentando de nuevo...');
      await deployBrowser(credenciales.username, credenciales.password, false);
      return
    }

    //if (check && status == 200) {

    try {
      console.log('intento de sessionRefresh nro', refreshAttempts)
      console.log('Esperando a que cargue mat-button ');
      await page.waitForSelector('td mat-icon', { timeout: 5000 });
      await page.click('td mat-icon');

      try {
        await page.waitForSelector('input[placeholder="Buscar"]', { timeout: 1000 });
        serviceStatus = { status: 200, message: 'Servicio disponible' };
        refreshAttempts = 0;
        console.log('-------------------')
        console.log('-------------------')
        console.log('-------------------')
        console.log('-------------------')
        console.log('refrescado con exito')
        console.log('-------------------')
        console.log('-------------------')
        console.log('-------------------')
        console.log('-------------------')

        mailOptions.text = `📢 Reporte de servicio de Verificacion!\n\n` +
          `• Accion: Registrar Credenciales\n` +
          `• Respuesta: Credenciales registradas y encriptadas correctamente\n` +
          `• Status del servicio: ${serviceStatus.message}`;

        try {
          sendWhatsAppMessage(telepono, mailOptions.text)
            .then(sent => {
              if (sent) {
                console.log(`WhatsApp enviado a ${telepono}`);
              } else {
                console.warn(`Error enviando WhatsApp a ${telepono}`);
              }
            })
            .catch(error => console.error('Error en WhatsApp:', error));
        } catch (whatsappError) {
          console.error('Error procesando teléfono para WhatsApp:', whatsappError);
        }


      } catch (error) {
        refreshAttempts += 1;

        try {

          await page.screenshot({ path: `./imgs/capFalloNro${refreshAttempts}.png`, fullPage: true }, { timeout: 3000 });
          console.log(`Full page screenshot saved as capFalloNro${refreshAttempts}.png`);
        } catch (error) {
          console.log('Error al tomar captura de pantalla:', error);
          console.error(error)
        }

        console.error('Error al cargar el input de busqueda :', error);
        console.log('Intentando de nuevo...');
        await reload()
      }
    } catch (error) {
      refreshAttempts += 1;
      console.error('mat-button no encontrado:', error);
      try {

        await page.screenshot({ path: `./imgs/capFalloNro${refreshAttempts}.png`, fullPage: true }, { timeout: 3000 });
        console.log(`Full page screenshot saved as capFalloNro${refreshAttempts}.png`);
      } catch (error) {
        console.log('Error al tomar captura de pantalla:', error);
        console.error(error)
      }
      console.log('Intentando de nuevo...');

      try{
        await page.waitForSelector('body > div > div > div > div > div > h3:nth-child(3)',{timeout:10000})
        let sClosed = await page.evaluate(() => {
          let msj = document.querySelector('body > div > div > div > div > div > h3:nth-child(3)').innerText;
          if (msj.includes('finalizó exitosamente')){
            return true
          }else{
            return false
          } 
        });

        if(sClosed == true){
          await deployBrowser('loqsea', 'loqsea', false);
        }else{
          await reload()
        }
      }catch(error){
        console.log('no se encontro boton de sesion cerrada')
        await reload()
      }

    }
  } else {
    refreshAttempts = 0;
    console.log('intentos maximos de refresSession aclanzados revisar manualmente, cerrando servicio ')
    serviceStatus = { status: 503, message: 'Servicio no disponible temporalmente, activar manualmente' }

    mailOptions.text = `📢 Reporte de servicio de Verificacion!\n\n` +
      `• Accion: refrescar sesion\n` +
      `• Respuesta: intentos maximos de refrescar sesion aclanzados, revisar y reiniciar servicio manualmente, cerrando servicio\n` +
      `• Status del servicio: ${serviceStatus.message}`;

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log('Error al enviar:', error);
      } else {
        console.log('Correo enviado:', info.response);
      }
    });

    try {
      sendWhatsAppMessage(telepono, mailOptions.text)
        .then(sent => {
          if (sent) {
            console.log(`WhatsApp enviado a ${telepono}`);
          } else {
            console.warn(`Error enviando WhatsApp a ${telepono}`);
          }
        })
        .catch(error => console.error('Error en WhatsApp:', error));
    } catch (whatsappError) {
      console.error('Error procesando teléfono para WhatsApp:', whatsappError);
    }

    console.log(serviceStatus)
    // Limpiar ambos almacenamientos
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.close();
    await browser.close();
    console.log('---------------------------');
    console.log('---------------------------');
    console.log('---------------------------');
    console.log('apagando browser en reload');
    console.log('---------------------------');
    console.log('---------------------------');
    console.log('---------------------------');
  }
}


const browserInit = async () => {

  if (browser) {
    // Limpiar ambos almacenamientos

    await browser.close();
    console.log('---------------------------');
    console.log('---------------------------');
    console.log('---------------------------');
    console.log('apagando browser en browserInit 1');
    console.log('---------------------------');
    console.log('---------------------------');
    console.log('---------------------------');
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
          if (cookie.expires !== -1) {
            cookie.expires = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30; // Extend by 30 days
            console.log('Cookie extended:', cookie.name, 'Expires:', cookie.expires);
          } else if (cookie.name == '_gid' || cookie.Name == '_gid') {
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
  if (status === 200) {
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
    //await CheckPageClosed()
  } else {
    console.log('Error al cargar la página due status:', status);
    serviceStatus = { status: 503, message: 'Servicio no disponible temporalmente, activar manualmente' };
    // Limpiar ambos almacenamientos
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await browser.close();
    console.log('---------------------------');
    console.log('---------------------------');
    console.log('---------------------------');
    console.log('apagando browser en browserInit 2');
    console.log('---------------------------');
    console.log('---------------------------');
    console.log('---------------------------');
  }
}

const refreshSession = async () => {

  try {
    if (browser && browser.isConnected() && page && !page.isClosed() && serviceStatus.status === 200) {
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
    console.log('---------------------------');
    console.log('---------------------------');
    console.log('---------------------------');
    console.log('apagando browser en refreshSession');
    console.log('---------------------------');
    console.log('---------------------------');
    console.log('---------------------------');
    serviceStatus = { status: 503, message: 'Servicio no disponible temporalmente, activar manualmente' };
  }
};

const Login = async (username, password, testing) => {

  try {
    await page.waitForSelector('input[formcontrolname="username"]', { timeout: 0 });
    await page.type('input[formcontrolname="username"]', username);
    await delay(200);
    await page.click('button[type="submit"]');
    await page.waitForSelector('input[formcontrolname="password"]', { timeout: 0 });
    await page.type('input[formcontrolname="password"]', password);
    await page.click('div.button-container button[type="submit"]');

    try {

      //await delay(500);
      // <span class="mat-button-wrapper">Aceptar</span>
      // <button class="ng-tns-c17-54 mat-button" mat-button=""><span class="mat-button-wrapper">Aceptar</span><div class="mat-button-ripple mat-ripple" matripple="" bis_skin_checked="1"></div><div class="mat-button-focus-overlay" bis_skin_checked="1"></div></button>
      // <button class="ng-tns-c17-16 mat-button" mat-button=""><span class="mat-button-wrapper">Aceptar</span><div class="mat-button-ripple mat-ripple" matripple="" bis_skin_checked="1"></div><div class="mat-button-focus-overlay" bis_skin_checked="1"></div></button>

      //<simple-snack-bar class="mat-simple-snackbar ng-tns-c17-18 ng-trigger ng-trigger-contentFade ng-star-inserted" style=""><span class="ng-tns-c17-18">Usuario o contraseña incorrecta</span><!----><div class="mat-simple-snackbar-action ng-tns-c17-18 ng-star-inserted" style="" bis_skin_checked="1"><button class="ng-tns-c17-18 mat-button" mat-button=""><span class="mat-button-wrapper">Aceptar</span><div class="mat-button-ripple mat-ripple" matripple="" bis_skin_checked="1"></div><div class="mat-button-focus-overlay" bis_skin_checked="1"></div></button></div></simple-snack-bar>

      let checkingCreds = await page.evaluate(() => {
        let rechazo = document.querySelector('button.mat-button span.mat-button-wrapper') ? document.querySelector('button.mat-button span.mat-button-wrapper').innerText : "accediendo";
        if (rechazo == ' Salir ' || rechazo.includes('Salir')) {
          console.log('------------------------------')
          console.log('------------------------------')
          console.log('------------------------------')
          console.log(rechazo)
          console.log('------------------------------')
          console.log('------------------------------')
          console.log('------------------------------')
          return { status: false, message: rechazo, argg: 'Credenciales correctas, accediendo a la cuenta' };
        } else if (rechazo/* == ' Aceptar '*/) {
          let argg = document.querySelector('#cdk-overlay-3 > snack-bar-container > simple-snack-bar > span') ? document.querySelector(/*'simple-snack-bar */'#cdk-overlay-3 > snack-bar-container > simple-snack-bar > span').innerText : "Error al iniciar sesión";
          return { status: true, message: rechazo, argg: argg };
        }
      })

      console.log('-----------------------------');
      console.log('-----------------------------');
      console.log('-----------------------------');
      console.log('checkingCreds:', checkingCreds);
      console.log('-----------------------------');
      console.log('-----------------------------');
      console.log('-----------------------------');

      if (checkingCreds.status == true) {
        // Limpiar ambos almacenamientos
        await page.evaluate(() => {
          localStorage.clear();
          sessionStorage.clear();
        });
        await page.close()
        await browser.close();
        console.log('---------------------------');
        console.log('---------------------------');
        console.log('---------------------------');
        console.log('apagando browser en login 0');
        console.log('---------------------------');
        console.log('---------------------------');
        console.log('---------------------------');
        serviceStatus = { status: 503, message: 'Servicio no disponible temporalmente, activar manualmente' };
        return checkingCreds;
        ///await delay(20000);
      }

      try {
        console.log('Esperando a que cargue mat-button ');
        await page.waitForSelector('td mat-icon', { timeout: 5000 });
        await delay(300);
        await page.click('td mat-icon');

        try {
          await page.waitForSelector('input[placeholder="Buscar"]', { timeout: 1000 });
          if (testing === true) {
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
            console.log('---------------------------');
            console.log('---------------------------');
            console.log('---------------------------');
            console.log('apagando browser en login 1');
            console.log('---------------------------');
            console.log('---------------------------');
            console.log('---------------------------');
            serviceStatus = { status: 503, message: 'Servicio no disponible temporalmente, activar manualmente' };
          } else {
            serviceStatus = { status: 200, message: 'Servicio  disponible' };
          }
          return checkingCreds;
        } catch (error) {
          console.error('Error al cargar el input de busqueda :', error);
          console.log('Intentando de nuevo...');
          await refreshSession()
        }

      } catch (error) {
        console.error('mat-button no encontrado:', error);
        console.log('Intentando de nuevo...');
        await refreshSession()
      }
    } catch (error) {
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
    await browser.close();
    console.log('---------------------------');
    console.log('---------------------------');
    console.log('---------------------------');
    console.log('apagando browser en login 2');
    console.log('---------------------------');
    console.log('---------------------------');
    console.log('---------------------------');
    //return fail = true;
  }

}

const deployBrowser = async (username, password, testing) => {
  let timer = 0;

  serviceStatus = { status: 503, message: 'Servicio no disponible temporalmente refrescando sesion, espere 20 segundos' };
  let decryptedUsername
  let decryptedPassword

  try {
    console.log('revisando credenciales......');
    credenciales = await Credenciales.findOne({ where: { id: 1 } })

    if (credenciales) {
      decryptedPassword = decrypt(credenciales.password);
      decryptedUsername = decrypt(credenciales.username);
      console.log('Credenciales encontradas, iniciando navegador...', credenciales.password, '/-/', decryptedPassword, credenciales.username, '/-/', decryptedUsername);
      interruptor = true;
    } else {
      console.log('No se encontraron credenciales o hay más de una', credenciales);
      return { status: true, message: ' registre credenciales y luego inicie el servicio', argg: 'No se encontraron credenciales' };
    }
  } catch (error) {
    console.error('Error al iniciar el navegador:', error);
    return { status: true, message: 'intente de nuevo, revise credenciales y status del servicio', argg: 'N/A' };;
  }

  if (interruptor == true) {

    await browserInit();


    if (intervalID) {
      clearInterval(intervalID)
      intervalID = setInterval(refreshSession, 140000);
    } else {
      intervalID = setInterval(refreshSession, 140000);
    }

    if (testing === true) {
      console.log('-----------------------')
      console.log('-----------------------')
      console.log('-----------------------')
      console.log(testing)
      console.log('-----------------------')
      console.log('-----------------------')
      console.log('-----------------------')
      const tested = await Login(username, password, testing);
      return tested;
    } else {
      const logResult = await Login(decryptedUsername, decryptedPassword, testing);
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

    const existingCreds = await Credenciales.findOne();
    if (existingCreds) {
      return res.status(400).json({
        message: 'Ya existen credenciales registradas'
      });
    }

    const { username, password } = req.body;
    // Encriptar credenciales
    const encryptedUsername = encrypt(username);
    const encryptedPassword = encrypt(password);

    if (interruptor === true) {
      // Limpiar ambos almacenamientos
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
      const cookies = await page.cookies();
      if (cookies.length > 0) await page.deleteCookie(...cookies);
      browser.close();
      console.log('---------------------------');
      console.log('---------------------------');
      console.log('---------------------------');
      console.log('apagando browser en registerCredenciales');
      console.log('---------------------------');
      console.log('---------------------------');
      console.log('---------------------------');
    }

    await Credenciales.create({
      username: encryptedUsername,
      password: encryptedPassword
    });

    const falla = await deployBrowser(username, password, true);

    if (falla && falla.status === false) {


      mailOptions.text = `📢 Reporte de servicio de Verificacion!\n\n` +
        `• Accion: Registrar Credenciales\n` +
        `• Respuesta: Credenciales registradas y encriptadas correctamente\n` +
        `• Status del servicio: ${serviceStatus.message}`;

      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {

          console.log('Error al enviar:', error);
        } else {
          console.log('Correo enviado:', info.response);
        }
      });

      try {
        sendWhatsAppMessage(telepono, mailOptions.text)
          .then(sent => {
            if (sent) {
              console.log(`WhatsApp enviado a ${telepono}`);
            } else {
              console.warn(`Error enviando WhatsApp a ${telepono}`);
            }
          })
          .catch(error => console.error('Error en WhatsApp:', error));
      } catch (whatsappError) {
        console.error('Error procesando teléfono para WhatsApp:', whatsappError);
      }

      console.log('Credenciales registradas y encriptadas correctamente');
      res.status(200).json({
        status: 200,
        message: 'Credenciales registradas, verificadas y encriptadas'
      });
    } else {

      mailOptions.text = `📢 Reporte de servicio de Verificacion!\n\n` +
        `• Accion: Registrar Credenciales\n` +
        `• Respuesta: Error al verificar las credenciales\n` +
        `• Status del servicio: ${serviceStatus.message}`;

      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.log('Error al enviar:', error);
        } else {
          console.log('Correo enviado:', info.response);
        }
      });

      try {
        sendWhatsAppMessage(telepono, mailOptions.text)
          .then(sent => {
            if (sent) {
              console.log(`WhatsApp enviado a ${telepono}`);
            } else {
              console.warn(`Error enviando WhatsApp a ${telepono}`);
            }
          })
          .catch(error => console.error('Error en WhatsApp:', error));
      } catch (whatsappError) {
        console.error('Error procesando teléfono para WhatsApp:', whatsappError);
      }

      console.log('Error al verificar las credenciales');
      res.status(200).json({
        status: 500,
        message: 'Error al verificar las credenciales'
      });
    }
  } catch (error) {


    mailOptions.text = `📢 Reporte de servicio de Verificacion!\n\n` +
      `• Accion: Registrar Credenciales\n` +
      `• Respuesta: Error al registrar credenciales\n` +
      `• Status del servicio: ${serviceStatus.message}`;

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log('Error al enviar:', error);
      } else {
        console.log('Correo enviado:', info.response);
      }
    });

    try {
      sendWhatsAppMessage(telepono, mailOptions.text)
        .then(sent => {
          if (sent) {
            console.log(`WhatsApp enviado a ${telepono}`);
          } else {
            console.warn(`Error enviando WhatsApp a ${telepono}`);
          }
        })
        .catch(error => console.error('Error en WhatsApp:', error));
    } catch (whatsappError) {
      console.error('Error procesando teléfono para WhatsApp:', whatsappError);
    }

    console.error('Error al registrar credenciales, puede que ya tenga sus credenciales cargadas:', error);
    res.status(200).json({
      message: 'Error al registrar credenciales, puede que ya tenga sus credenciales cargadas'
    });
  }
};

export const editCreds = async (req, res) => {
  try {
    console.log('---------------------------')
    console.log('---------------------------')
    console.log('---------------------------')
    console.log(req)
    console.log('---------------------------')
    console.log('---------------------------')
    console.log('---------------------------')
    const { username, password } = req.body;
    const encryptedUsername = encrypt(username);
    const encryptedPassword = encrypt(password);
    await Credenciales.update({ username: encryptedUsername, password: encryptedPassword }, { where: { id: 1 } });
    // document.querySelector('div.navbar button.mat-button span.mat-button-wrapper span') body > app-root > app-home-layout > app-menu > div > app-sidebar > mat-sidenav-container > mat-sidenav-content > app-navbar > div.navbar > div > button:nth-child(7)
    try {
      if (serviceStatus.status === 200) {
        await page.waitForSelector('div.col button.mat-button', { timeout: 0 });
        await page.click('div.col button.mat-button');

        await page.waitForSelector('body > app-root > app-home-layout > app-menu > div > app-sidebar > mat-sidenav-container > mat-sidenav-content > app-navbar > div.navbar > div > button:nth-child(7)', { timeout: 0 });
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
        console.log('---------------------------');
        console.log('---------------------------');
        console.log('---------------------------');
        console.log('apagando browser en editcreds');
        console.log('---------------------------');
        console.log('---------------------------');
        console.log('---------------------------');
      }
      const falla = await deployBrowser(username, password, true);

      if (falla && falla.status === false) {
        console.log(falla.status)
        serviceStatus = { status: 503, message: 'Servicio no disponible temporalmente, activar manualmente' };


        mailOptions.text = `📢 Reporte de servicio de Verificacion!\n\n` +
          `• Accion: Editar Credenciales\n` +
          `• Respuesta: Credenciales editadas y verificadas correctamente\n` +
          `• Status del servicio: ${serviceStatus.message}`;

        transporter.sendMail(mailOptions, (error, info) => {
          if (error) {
            console.log('Error al enviar:', error);
          } else {
            console.log('Correo enviado:', info.response);
          }
        });
        try {
          sendWhatsAppMessage(telepono, mailOptions.text)
            .then(sent => {
              if (sent) {
                console.log(`WhatsApp enviado a ${telepono}`);
              } else {
                console.warn(`Error enviando WhatsApp a ${telepono}`);
              }
            })
            .catch(error => console.error('Error en WhatsApp:', error));
        } catch (whatsappError) {
          console.error('Error procesando teléfono para WhatsApp:', whatsappError);
        }

        console.log('Credenciales editadas y verificadas correctamente');
        res.status(200).json({ status: 200, message: 'Credenciales editadas y verificadas correctamente' })
      } else {
        console.log(falla.status)
        console.log('Error al iniciar sesión con las nuevas credenciales');
        serviceStatus = { status: 503, message: 'Servicio no disponible temporalmente, activar manualmente' };
        mailOptions.text = `📢 Reporte de servicio de Verificacion!\n\n` +
          `• Accion: Editar Credenciales\n` +
          `• Respuesta: Error al iniciar sesión con las nuevas credenciales\n` +
          `• Status del servicio: ${serviceStatus.message}`;

        transporter.sendMail(mailOptions, (error, info) => {
          if (error) {
            console.log('Error al enviar:', error);
          } else {
            console.log('Correo enviado:', info.response);
          }
        });

        try {
          sendWhatsAppMessage(telepono, mailOptions.text)
            .then(sent => {
              if (sent) {
                console.log(`WhatsApp enviado a ${telepono}`);
              } else {
                console.warn(`Error enviando WhatsApp a ${telepono}`);
              }
            })
            .catch(error => console.error('Error en WhatsApp:', error));
        } catch (whatsappError) {
          console.error('Error procesando teléfono para WhatsApp:', whatsappError);
        }

        res.status(203).json({ status: 500, message: 'Error al iniciar sesión con las nuevas credenciales', });
      }

    } catch (error) {
      console.error('Error al cerrar sesión luego de editar credenciales:', error);
      console.log('Error al cerrar sesión luego de editar credenciales');
      serviceStatus = { status: 503, message: 'Servicio no disponible temporalmente, activar manualmente' };

      mailOptions.text = `📢 Reporte de servicio de Verificacion!\n\n` +
        `• Accion: Editar Credenciales\n` +
        `• Respuesta: Error al cerrar sesión luego de editar credenciales\n` +
        `• Status del servicio: ${serviceStatus.message}`;

      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.log('Error al enviar:', error);
        } else {
          console.log('Correo enviado:', info.response);
        }
      });

      try {
        sendWhatsAppMessage(telepono, mailOptions.text)
          .then(sent => {
            if (sent) {
              console.log(`WhatsApp enviado a ${telepono}`);
            } else {
              console.warn(`Error enviando WhatsApp a ${telepono}`);
            }
          })
          .catch(error => console.error('Error en WhatsApp:', error));
      } catch (whatsappError) {
        console.error('Error procesando teléfono para WhatsApp:', whatsappError);
      }

      res.status(200).json({ status: 500, message: 'Error al cerrar sesión luego de editar credenciales' });
    }
  } catch (error) {
    console.error(error);

    serviceStatus = { status: 503, message: 'Servicio no disponible temporalmente, activar manualmente' };
    mailOptions.text = `📢 Reporte de servicio de Verificacion!\n\n` +
      `• Accion: Editar Credenciales\n` +
      `• Respuesta: Error al editar credenciales\n` +
      `• Status del servicio: ${serviceStatus.message}`;

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log('Error al enviar:', error);
      } else {
        console.log('Correo enviado:', info.response);
      }
    });

    try {
      sendWhatsAppMessage(telepono, mailOptions.text)
        .then(sent => {
          if (sent) {
            console.log(`WhatsApp enviado a ${telepono}`);
          } else {
            console.warn(`Error enviando WhatsApp a ${telepono}`);
          }
        })
        .catch(error => console.error('Error en WhatsApp:', error));
    } catch (whatsappError) {
      console.error('Error procesando teléfono para WhatsApp:', whatsappError);
    }

    console.log('Error al editar credenciales',);
    res.status(200).json({ status: 500, message: 'Error al editar credenciales', });
  }
}

export const getCreds = async (req, res) => {
  try {
    const credenciales = await Credenciales.findOne({ where: { id: 1 } });


    if (credenciales) {
      const decryptedUsername = decrypt(credenciales.username);
      const decryptedPassword = decrypt(credenciales.password);
      credenciales.status = 200;

      console.log(credenciales)
      mailOptions.text = `📢 Reporte de servicio de Verificacion!\n\n` +
        `• Accion: Obtener Credenciales\n` +
        `• Respuesta: Credenciales Obtenidas exitosamente\n` +
        `• Status del servicio: ${serviceStatus.message}`;

      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.log('Error al enviar:', error);
        } else {
          console.log('Correo enviado:', info.response);
        }
      });

      try {
        sendWhatsAppMessage(telepono, mailOptions.text)
          .then(sent => {
            if (sent) {
              console.log(`WhatsApp enviado a ${telepono}`);
            } else {
              console.warn(`Error enviando WhatsApp a ${telepono}`);
            }
          })
          .catch(error => console.error('Error en WhatsApp:', error));
      } catch (whatsappError) {
        console.error('Error procesando teléfono para WhatsApp:', whatsappError);
      }


      res.status(200).json({ username: decryptedUsername, password: decryptedPassword, status: 200, message: 'Credenciales obtenidas exitosamente' });
    } else {

      mailOptions.text = `📢 Reporte de servicio de Verificacion!\n\n` +
        `• Accion: Obtener Credenciales\n` +
        `• Respuesta: No se encontraron credenciales\n` +
        `• Status del servicio: ${serviceStatus.message}`;

      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.log('Error al enviar:', error);
        } else {
          console.log('Correo enviado:', info.response);
        }
      });

      try {
        sendWhatsAppMessage(telepono, mailOptions.text)
          .then(sent => {
            if (sent) {
              console.log(`WhatsApp enviado a ${telepono}`);
            } else {
              console.warn(`Error enviando WhatsApp a ${telepono}`);
            }
          })
          .catch(error => console.error('Error en WhatsApp:', error));
      } catch (whatsappError) {
        console.error('Error procesando teléfono para WhatsApp:', whatsappError);
      }

      res.status(204).json({ status: 404, message: 'No se encontraron credenciales' });
    }
  } catch (error) {

    mailOptions.text = `📢 Reporte de servicio de Verificacion!\n\n` +
      `• Accion: Obtener Credenciales\n` +
      `• Respuesta: Error al obtener las credenciales\n` +
      `• Status del servicio: ${serviceStatus.message}`;

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log('Error al enviar:', error);
      } else {
        console.log('Correo enviado:', info.response);
      }
    });

    try {
      sendWhatsAppMessage(telepono, mailOptions.text)
        .then(sent => {
          if (sent) {
            console.log(`WhatsApp enviado a ${telepono}`);
          } else {
            console.warn(`Error enviando WhatsApp a ${telepono}`);
          }
        })
        .catch(error => console.error('Error en WhatsApp:', error));
    } catch (whatsappError) {
      console.error('Error procesando teléfono para WhatsApp:', whatsappError);
    }

    console.error('Error al obtener las credenciales:', error);
    res.status(200).json({ status: 500, message: 'Error al obtener las credenciales' });
  }
}

export const deploy = async (req, res) => {
  try {
    if (serviceStatus && serviceStatus.status !== 200) {

      const browserStatus = await deployBrowser(credenciales.username, credenciales.password, false);

      if (browserStatus && browserStatus.status === false) {
        console.log('Navegador desplegado correctamente');
        serviceStatus = { status: 200, message: 'Servicio disponible' };

        mailOptions.text = `📢 Reporte de servicio de Verificacion!\n\n` +
          `• Accion: Encendido del servicio\n` +
          `• Respuesta: Servicio desplegado correctamente\n` +
          `• Status del Servicio: ${serviceStatus.message}`;

        transporter.sendMail(mailOptions, (error, info) => {
          if (error) {
            console.log('Error al enviar:', error);
          } else {
            console.log('Correo enviado:', info.response);
          }
        });

        try {
          sendWhatsAppMessage(telepono, mailOptions.text)
            .then(sent => {
              if (sent) {
                console.log(`WhatsApp enviado a ${telepono}`);
              } else {
                console.warn(`Error enviando WhatsApp a ${telepono}`);
              }
            })
            .catch(error => console.error('Error en WhatsApp:', error));
        } catch (whatsappError) {
          console.error('Error procesando teléfono para WhatsApp:', whatsappError);
        }

        res.status(200).json({ status: 200, message: 'Servicio desplegado correctamente', argg: 'credenciales correctas', points: 'N/A' });
      } else {
        console.log('Error al desplegar el navegador');
        console.log('---------------------------');
        console.log('---------------------------');
        console.log('---------------------------');
        console.log('browserStatus:', browserStatus);
        console.log('---------------------------');
        console.log('---------------------------');
        serviceStatus = { status: 503, message: 'Servicio no disponible temporalmente, activar manualmente' };

        mailOptions.text = `📢 Reporte de servicio de Verificacion!\n\n` +
          `• Accion: Encendido del servicio\n` +
          `• Respuesta: error, no han pasado 3 min desde que se cerro el servicio o los son datos incorrectos\n` +
          `• Status del servicio: ${serviceStatus.message}`;

        transporter.sendMail(mailOptions, (error, info) => {
          if (error) {
            console.log('Error al enviar:', error);
          } else {
            console.log('Correo enviado:', info.response);
          }
        });

        try {
          sendWhatsAppMessage(telepono, mailOptions.text)
            .then(sent => {
              if (sent) {
                console.log(`WhatsApp enviado a ${telepono}`);
              } else {
                console.warn(`Error enviando WhatsApp a ${telepono}`);
              }
            })
            .catch(error => console.error('Error en WhatsApp:', error));
        } catch (whatsappError) {
          console.error('Error procesando teléfono para WhatsApp:', whatsappError);
        }

        res.status(203).json({ status: 503, points: browserStatus.argg, argg: browserStatus.message, message: 'error, espere 3 min y verifique que los datos sean correctos' });
      }
    } else {
      console.log('El servicio ya esta activo, no se puede desplegar de nuevo');
      res.status(200).json({ status: 200, message: 'El servicio ya esta activo, no se puede desplegar de nuevo' });
    }
  } catch (error) {
    console.error('Error al desplegar el navegador:', error);
    console.log('Error al desplegar el navegador');
    serviceStatus = { status: 503, message: 'Servicio no disponible temporalmente, activar manualmente' };


    mailOptions.text = `📢 Reporte de servicio de Verificacion!\n\n` +
      `• Accion: Encendido del servicio\n` +
      `• Respuesta: Error al desplegar el servicio\n` +
      `• Status del servicio: ${serviceStatus.message}`;

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log('Error al enviar:', error);
      } else {
        console.log('Correo enviado:', info.response);
      }
    });

    try {
      sendWhatsAppMessage(telepono, mailOptions.text)
        .then(sent => {
          if (sent) {
            console.log(`WhatsApp enviado a ${telepono}`);
          } else {
            console.warn(`Error enviando WhatsApp a ${telepono}`);
          }
        })
        .catch(error => console.error('Error en WhatsApp:', error));
    } catch (whatsappError) {
      console.error('Error procesando teléfono para WhatsApp:', whatsappError);
    }

    res.status(200).json({ status: 500, message: 'Error al desplegar el servicio', reason: 'Error en el servidor' });
  }
}

export const shutDown = async (req, res) => {
  try {

    if (serviceStatus && serviceStatus.status === 200) {

      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
      const cookies = await page.cookies();
      if (cookies.length > 0) await page.deleteCookie(...cookies);

      await page.close();
      await browser.close();
      console.log('---------------------------');
      console.log('---------------------------');
      console.log('---------------------------');
      console.log('apagando browser en shutDown');
      console.log('---------------------------');
      console.log('---------------------------');
      console.log('---------------------------');
      serviceStatus = { status: 503, message: 'Servicio no disponible temporalmente, activar manualmente' };
      console.log('navegador apagado correctamente');

      mailOptions.text = `📢 Reporte de servicio de Verificacion!\n\n` +
        `• Accion: Apagar servicio\n` +
        `• Respuesta: Navegador apagado correctamente, espere 3 minutos minimo para volver a inicar\n` +
        `• Status del servicio: ${serviceStatus.message}`;
      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.log('Error al enviar:', error);
        } else {
          console.log('Correo enviado:', info.response);
        }
      });

      try {
        sendWhatsAppMessage(telepono, mailOptions.text)
          .then(sent => {
            if (sent) {
              console.log(`WhatsApp enviado a ${telepono}`);
            } else {
              console.warn(`Error enviando WhatsApp a ${telepono}`);
            }
          })
          .catch(error => console.error('Error en WhatsApp:', error));
      } catch (whatsappError) {
        console.error('Error procesando teléfono para WhatsApp:', whatsappError);
      }
      if (type === true) {
        
        res.status(200).json({ status: 200, message: 'servicio apagado correctamente, espere 3 minutos minimo para volver a inicar o cambiar credenciales' });
      }else{
        console.log('estado de type',type)
      }
    } else {
      console.log('No hay navegador activo para apagar');
      mailOptions.text = `📢 Reporte de servicio de Verificacion!\n\n` +
        `• Accion: Apagar servicio\n` +
        `• Respuesta: No hay Servicio activo para apagar\n` +
        `• Status del servicio: ${serviceStatus.message}`;
      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.log('Error al enviar:', error);
        } else {
          console.log('Correo enviado:', info.response);
        }
      });

      try {
        sendWhatsAppMessage(telepono, mailOptions.text)
          .then(sent => {
            if (sent) {
              console.log(`WhatsApp enviado a ${telepono}`);
            } else {
              console.warn(`Error enviando WhatsApp a ${telepono}`);
            }
          })
          .catch(error => console.error('Error en WhatsApp:', error));
      } catch (whatsappError) {
        console.error('Error procesando teléfono para WhatsApp:', whatsappError);
      }
      if (type === true) {
        
        res.status(200).json({ status: 200, message: 'servicio apagado correctamente, espere 3 minutos minimo para volver a inicar o cambiar credenciales' });
      }else{
        console.log('estado de type',type)
      }
    }

  } catch (error) {

    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    console.log('Error al apagar el servicio');
    mailOptions.text = `📢 Reporte de servicio de Verificacion!\n\n` +
      `• Accion: Apagar servicio\n` +
      `• Respuesta: Error al apagar el servicio\n` +
      `• Status del servicio: ${serviceStatus.message}`;
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log('Error al enviar:', error);
      } else {
        console.log('Correo enviado:', info.response);
      }
    });

    try {
      sendWhatsAppMessage(telepono, mailOptions.text)
        .then(sent => {
          if (sent) {
            console.log(`WhatsApp enviado a ${telepono}`);
          } else {
            console.warn(`Error enviando WhatsApp a ${telepono}`);
          }
        })
        .catch(error => console.error('Error en WhatsApp:', error));
    } catch (whatsappError) {
      console.error('Error procesando teléfono para WhatsApp:', whatsappError);
    }

    console.error(error);

      if (type === true) {

        res.status(200).json({ status: 200, message: 'servicio apagado correctamente, espere 3 minutos minimo para volver a inicar o cambiar credenciales' });
      }else{
        console.log('estado de type',type)
      }
  }
}

export const verify = async (req, res) => {
  // Si el servicio está refrescando, esperar a que esté disponible
  if (serviceStatus.message === 'Servicio no disponible temporalmente refrescando sesion, espere 20 segundos') {
    console.log('Servicio refrescando, esperando disponibilidad...');

    try {
      // Esperar máximo 2 minutos (120000 ms)
      await waitForServiceAvailable(120000);
      console.log('Servicio disponible después de espera');
    } catch (error) {
      console.error('Error esperando servicio:', error.message);
      return res.status(503).json({
        status: 503,
        message: 'El servicio no se recuperó a tiempo'
      });
    }
  }

  // Si el servicio no está disponible después de esperar
  if (serviceStatus.status == 503) {
    mailOptions.text = `📢 Reporte de servicio de Verificacion!\n\n` +
      `• Accion: Verificar Pago\n` +
      `• Respuesta: El servicio no está activo\n` +
      `• Status del servicio: ${serviceStatus.message}`;

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log('Error al enviar:', error);
      } else {
        console.log('Correo enviado:', info.response);
      }
    });

    try {
      sendWhatsAppMessage(telepono, mailOptions.text)
        .then(sent => {
          if (sent) {
            console.log(`WhatsApp enviado a ${telepono}`);
          } else {
            console.warn(`Error enviando WhatsApp a ${telepono}`);
          }
        })
        .catch(error => console.error('Error en WhatsApp:', error));
    } catch (whatsappError) {
      console.error('Error procesando teléfono para WhatsApp:', whatsappError);
    }

    console.log('No hay navegador activo ');
    res.status(200).json({ status: 'su pago no puede ser verificado en este momento, se guardara par verificarse luego', reason: 'No hay servicio activo' });

  }
  if (serviceStatus.status == 200) {

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

        mailOptions.text = `📢 Reporte de servicio de Verificacion!\n\n` +
          `• Accion: Verificar Pago\n` +
          `• Respuesta: Error al buscar la referencia ${referencia}\n` +
          `• Status del servicio: ${serviceStatus.message}`;
        transporter.sendMail(mailOptions, (error, info) => {
          if (error) {
            console.log('Error al enviar:', error);
          } else {
            console.log('Correo enviado:', info.response);
          }
        });

        try {
          sendWhatsAppMessage(telepono, mailOptions.text)
            .then(sent => {
              if (sent) {
                console.log(`WhatsApp enviado a ${telepono}`);
              } else {
                console.warn(`Error enviando WhatsApp a ${telepono}`);
              }
            })
            .catch(error => console.error('Error en WhatsApp:', error));
        } catch (whatsappError) {
          console.error('Error procesando teléfono para WhatsApp:', whatsappError);
        }

        res.status(200).json({ status: 500, message: `Error al buscar la referencia ${referencia} intenta de nuevo por favor` });
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

        mailOptions.text = `📢 Reporte de servicio de Verificacion!\n\n` +
          `• Accion: Verificar Pago\n` +
          `• Respuesta: Pago verificado ${collectedData.RefRecibida}, monto: ${collectedData.montorecibido}\n` +
          `• Status del servicio: ${serviceStatus.message}`;
        transporter.sendMail(mailOptions, (error, info) => {
          if (error) {
            console.log('Error al enviar:', error);
          } else {
            console.log('Correo enviado:', info.response);
          }
        });
        try {
          sendWhatsAppMessage(telepono, mailOptions.text)
            .then(sent => {
              if (sent) {
                console.log(`WhatsApp enviado a ${telepono}`);
              } else {
                console.warn(`Error enviando WhatsApp a ${telepono}`);
              }
            })
            .catch(error => console.error('Error en WhatsApp:', error));
        } catch (whatsappError) {
          console.error('Error procesando teléfono para WhatsApp:', whatsappError);
        }

        try {

          const [pago, created] = await Logs.findOrCreate({
            where: { refRecibida: collectedData.RefRecibida },
            defaults: {
              status: collectedData.status,
              fecha: collectedData.fecha,
              ref: collectedData.ref,
              refRecibida: collectedData.RefRecibida,
              monto: collectedData.montorecibido,
              montoRecibido: collectedData.montorecibido
            },

          })

          if (created === true) {
            console.log('se creo el registro', pago)
          } else {
            console.log('ya existia el registro de esa referencia')
          }
        } catch (error) {
          console.log('error: buscando o registrando el pago  :: ', error)
          console.error(error)
        }

        res.status(200).json(collectedData);
      } else if(collectedData.monto !== monto && collectedData.ref.includes(referencia)){
        ///---------///---------///---------///---------///---------///---------///---------
        
        collectedData.montorecibido = monto;
        collectedData.status = `monto pagado: ${collectedData.montorecibido} Monto a pagar: ${collectedData.monto}, Pago rechazado !`;
        collectedData.RefRecibida = referencia;

        mailOptions.text = `📢 Reporte de servicio de Verificacion!\n\n` +
          `• Accion: Verificar Pago\n` +
          `• Respuesta: Pago falso detectado ref:${collectedData.RefRecibida}, monto: ${collectedData.montorecibido}\n` +
          `• Status del servicio: ${serviceStatus.message}` +
          `• Razon: ${collectedData.status}`;

        transporter.sendMail(mailOptions, (error, info) => {
          if (error) {
            console.log('Error al enviar:', error);
          } else {
            console.log('Correo enviado:', info.response);
          }
        });
        try {
          sendWhatsAppMessage(telepono, mailOptions.text)
            .then(sent => {
              if (sent) {
                console.log(`WhatsApp enviado a ${telepono}`);
              } else {
                console.warn(`Error enviando WhatsApp a ${telepono}`);
              }
            })
            .catch(error => console.error('Error en WhatsApp:', error));
        } catch (whatsappError) {
          console.error('Error procesando teléfono para WhatsApp:', whatsappError);
        }

        try {

          const [pago, created] = await Logs.findOrCreate({
            where: { refRecibida: collectedData.RefRecibida },
            defaults: {
              status: collectedData.status,
              fecha: collectedData.fecha,
              ref: collectedData.ref,
              refRecibida: collectedData.RefRecibida,
              monto: collectedData.montorecibido,
              montoRecibido: collectedData.montorecibido
            },

          })

          if (created === true) {
            console.log('se creo el registro', pago)
          } else {
            console.log('ya existia el registro de esa referencia')
          }
        } catch (error) {
          console.log('error: buscando o registrando el pago  :: ', error)
          console.error(error)
        }

        res.status(200).json(collectedData);
        
        ///---------///---------///---------///---------///---------///---------///---------
      }else if(collectedData.ref.includes( 'N/A')){

        collectedData.status = 'Pago no encontrado';
        collectedData.montorecibido = monto;
        collectedData.RefRecibida = referencia;

        mailOptions.text = `📢 Reporte de servicio de Verificacion!\n\n` +
          `• Accion: Verificar Pago\n` +
          `• Respuesta: Pago Rechazado, descartar o revisar manualmente ${collectedData.RefRecibida}, monto: ${collectedData.montorecibido}\n` +
          `• Status del servicio: ${serviceStatus.message}`;
        transporter.sendMail(mailOptions, (error, info) => {
          if (error) {
            console.log('Error al enviar:', error);
          } else {
            console.log('Correo enviado:', info.response);
          }
        });

        try {
          sendWhatsAppMessage(telepono, mailOptions.text)
            .then(sent => {
              if (sent) {
                console.log(`WhatsApp enviado a ${telepono}`);
              } else {
                console.warn(`Error enviando WhatsApp a ${telepono}`);
              }
            })
            .catch(error => console.error('Error en WhatsApp:', error));
        } catch (whatsappError) {
          console.error('Error procesando teléfono para WhatsApp:', whatsappError);
        }

        const [pago, created] = await Logs.findOrCreate({
          where: { refRecibida: collectedData.RefRecibida },
          defaults: {
            status: collectedData.status,
            fecha: collectedData.fecha,
            ref: collectedData.ref,
            refRecibida: collectedData.RefRecibida,
            monto: collectedData.montorecibido,
            montoRecibido: collectedData.montorecibido
          }
        })

        if (created === true) {
          console.log('se creo el registro', pago)
        } else {
          console.log('ya existia el registro de esa referencia')
        }
        res.status(200).json(collectedData);


      }else{
        collectedData.status = 'revisar manualmente o descartar';
        collectedData.montorecibido = monto;
        collectedData.RefRecibida = referencia;


        mailOptions.text = `📢 Reporte de servicio de Verificacion!\n\n` +
          `• Accion: Verificar Pago\n` +
          `• Respuesta: Pago Rechazado, descartar o revisar manualmente ${collectedData.RefRecibida}, monto: ${collectedData.montorecibido}\n` +
          `• Status del servicio: ${serviceStatus.message}`;
        transporter.sendMail(mailOptions, (error, info) => {
          if (error) {
            console.log('Error al enviar:', error);
          } else {
            console.log('Correo enviado:', info.response);
          }
        });

        try {
          sendWhatsAppMessage(telepono, mailOptions.text)
            .then(sent => {
              if (sent) {
                console.log(`WhatsApp enviado a ${telepono}`);
              } else {
                console.warn(`Error enviando WhatsApp a ${telepono}`);
              }
            })
            .catch(error => console.error('Error en WhatsApp:', error));
        } catch (whatsappError) {
          console.error('Error procesando teléfono para WhatsApp:', whatsappError);
        }

        const [pago, created] = await Logs.findOrCreate({
          where: { refRecibida: collectedData.RefRecibida },
          defaults: {
            status: collectedData.status,
            fecha: collectedData.fecha,
            ref: collectedData.ref,
            refRecibida: collectedData.RefRecibida,
            monto: collectedData.montorecibido,
            montoRecibido: collectedData.montorecibido
          }
        })

        if (created === true) {
          console.log('se creo el registro', pago)
        } else {
          console.log('ya existia el registro de esa referencia')
        }
        res.status(200).json(collectedData);
      }
    } catch (error) {
      console.error(error);
      console.log('Error en la referencia: ', referencia);
      mailOptions.text = `📢 Reporte de servicio de Verificacion!\n\n` +
        `• Accion: Verificar Pago\n` +
        `• Respuesta: Pago Rechazado, error al buscar la referencia: ${referencia}\n` +
        `• Status del servicio: ${serviceStatus.message}`;

      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.log('Error al enviar:', error);
        } else {
          console.log('Correo enviado:', info.response);
        }
      });

      try {
        sendWhatsAppMessage(telepono, mailOptions.text)
          .then(sent => {
            if (sent) {
              console.log(`WhatsApp enviado a ${telepono}`);
            } else {
              console.warn(`Error enviando WhatsApp a ${telepono}`);
            }
          })
          .catch(error => console.error('Error en WhatsApp:', error));
      } catch (whatsappError) {
        console.error('Error procesando teléfono para WhatsApp:', whatsappError);
      }

      res.status(200).json({ status: 'Error en la referencia', referencia: referencia });
    }
  }
};

export const getLogs = async (req, res) => {
  try {
    const logs = await Logs.findAll();
    mailOptions.text = `📢 Reporte de servicio de Verificacion!\n\n` +
      `• Accion: Obtener Registros de Verificacion\n` +
      `• Respuesta: Exitoso\n` +
      `• Status del servicio: ${serviceStatus.message}`;

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log('Error al enviar:', error);
      } else {
        console.log('Correo enviado:', info.response);
      }
    });

    try {
      sendWhatsAppMessage(telepono, mailOptions.text)
        .then(sent => {
          if (sent) {
            console.log(`WhatsApp enviado a ${telepono}`);
          } else {
            console.warn(`Error enviando WhatsApp a ${telepono}`);
          }
        })
        .catch(error => console.error('Error en WhatsApp:', error));
    } catch (whatsappError) {
      console.error('Error procesando teléfono para WhatsApp:', whatsappError);
    }

    res.status(200).json(logs);
  } catch (error) {
    mailOptions.text = `📢 Reporte de servicio de Verificacion!\n\n` +
      `• Accion: Obtener Registros de Verificacion\n` +
      `• Respuesta: Error al obtener los regsitros\n` +
      `• Status del servicio: ${serviceStatus.message}`;

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log('Error al enviar:', error);
      } else {
        console.log('Correo enviado:', info.response);
      }
    });

    try {
      sendWhatsAppMessage(telepono, mailOptions.text)
        .then(sent => {
          if (sent) {
            console.log(`WhatsApp enviado a ${telepono}`);
          } else {
            console.warn(`Error enviando WhatsApp a ${telepono}`);
          }
        })
        .catch(error => console.error('Error en WhatsApp:', error));
    } catch (whatsappError) {
      console.error('Error procesando teléfono para WhatsApp:', whatsappError);
    }

    console.error('Error al obtener los logs:', error);
    res.status(200).json({ message: 'Error al obtener los logs' });
  }
};

export const checkStatus = async (req, res) => {
  try {

    mailOptions.text = `📢 Reporte de servicio de Verificacion!\n\n` +
      `• Accion: Checkeo de Status del Servicio\n` +
      `• Respuesta: checkeo exitoso\n` +
      `• Status del servicio: ${serviceStatus.message}`;

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log('Error al enviar:', error);
      } else {
        console.log('Correo enviado:', info.response);
      }
    });

    try {
      sendWhatsAppMessage(telepono, mailOptions.text)
        .then(sent => {
          if (sent) {
            console.log(`WhatsApp enviado a ${telepono}`);
          } else {
            console.warn(`Error enviando WhatsApp a ${telepono}`);
          }
        })
        .catch(error => console.error('Error en WhatsApp:', error));
    } catch (whatsappError) {
      console.error('Error procesando teléfono para WhatsApp:', whatsappError);
    }

    res.status(200).json(serviceStatus);

  } catch (error) {

    mailOptions.text = `📢 Reporte de servicio de Verificacion!\n\n` +
      `• Accion: Checkeo de Status del Servicio\n` +
      `• Respuesta: Error al verificar el servicio\n` +
      `• Status del servicio: ${serviceStatus.message}`;

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log('Error al enviar:', error);
      } else {
        console.log('Correo enviado:', info.response);
      }
    });

    try {
      sendWhatsAppMessage(telepono, mailOptions.text)
        .then(sent => {
          if (sent) {
            console.log(`WhatsApp enviado a ${telepono}`);
          } else {
            console.warn(`Error enviando WhatsApp a ${telepono}`);
          }
        })
        .catch(error => console.error('Error en WhatsApp:', error));
    } catch (whatsappError) {
      console.error('Error procesando teléfono para WhatsApp:', whatsappError);
    }

    console.error('Error al verificar el servicio:', error);
    res.status(200).json({ message: 'Error al verificar el servicio' });
  }
};

export const editLog = async (req, res) => {
  try {
    const { id, status } = req.body;
    await Logs.update({ status: status }, { where: { id: id } });

    mailOptions.text = `📢 Reporte de servicio de Verificacion!\n\n` +
      `• Accion: Edicion de Registro de verificacion\n` +
      `• Respuesta: editado exitosamente a status ${status}, id del regsitro : ${id}\n` +
      `• Status del servicio: ${serviceStatus.message}`;

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log('Error al enviar:', error);
      } else {
        console.log('Correo enviado:', info.response);
      }
    });

    try {
      sendWhatsAppMessage(telepono, mailOptions.text)
        .then(sent => {
          if (sent) {
            console.log(`WhatsApp enviado a ${telepono}`);
          } else {
            console.warn(`Error enviando WhatsApp a ${telepono}`);
          }
        })
        .catch(error => console.error('Error en WhatsApp:', error));
    } catch (whatsappError) {
      console.error('Error procesando teléfono para WhatsApp:', whatsappError);
    }

    res.status(200).json({ status: 200, message: 'Log actualizado correctamente' });
  } catch (error) {
    mailOptions.text = `📢 Reporte de servicio de Verificacion!\n\n` +
      `• Accion: Edicion de Registro de verificacion\n` +
      `• Respuesta: Error al actualizar\n` +
      `• Status del servicio: ${serviceStatus.message}`;
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log('Error al enviar:', error);
      } else {
        console.log('Correo enviado:', info.response);
      }
    });

    try {
      sendWhatsAppMessage(telepono, mailOptions.text)
        .then(sent => {
          if (sent) {
            console.log(`WhatsApp enviado a ${telepono}`);
          } else {
            console.warn(`Error enviando WhatsApp a ${telepono}`);
          }
        })
        .catch(error => console.error('Error en WhatsApp:', error));
    } catch (whatsappError) {
      console.error('Error procesando teléfono para WhatsApp:', whatsappError);
    }

    console.error('Error al actualizar el log:', error);
    res.status(200).json({ status: 500, message: 'Error al actualizar el log' });
  }
};

//module.exports = {editCreds, getCreds, deploy,shutDown,registerCredenciales,editLog, checkStatus,getLogs, verify}