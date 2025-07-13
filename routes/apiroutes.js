import express from 'express'
const router = express.Router();
import {registerCredenciales,editLog,
        checkStatus,getLogs,verify,
        shutDown,deploy,getCreds,editCreds
        } from '../controllers/apiControllers.js'

//--------------------------------------
router.get('/checkStatus',checkStatus);
router.get('/logs', getLogs);
router.get('/turnOff',shutDown);
router.get('/deployBrowser',deploy);
router.get('/seeCredentials',getCreds);


//-------------- post endpointsss -----------------------
router.post('/registercredencials', registerCredenciales);
router.post('/editLog', editLog);
router.post('/Verify',verify);
router.post('/editCredentials',editCreds);

export default router