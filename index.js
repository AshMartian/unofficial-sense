const fetch = require('node-fetch'), ws = require('ws'), EventEmitter = require('events');


const apiURL = 'https://api.sense.com/apiservice/api/v1/'

var emmitter = new EventEmitter();

var senseWS = null;

const setupWS = (onData) => {
    const sendData = typeof onData == 'function'
    let WSURL = `wss://clientrt.sense.com/monitors/${authData.monitors[0].id}/realtimefeed?access_token=${authData.access_token}`
    senseWS = new ws(WSURL)

    senseWS.on('open', () => {
        if(sendData) {
            onData({
                status: "Connected"
            })
        }
    });
    senseWS.on('message', (data) => {
        emmitter.emit('data', JSON.parse(data));
        if(sendData) {
            onData({
                status: "Received",
                data: JSON.parse(data)
            })
        } else {
            console.log(data);
        }
    })
}
var authData = {};
module.exports = async (config, onData) => {
    return new Promise( async (resolve, reject) => {
        if(!config.email || !config.password) {
            throw new Error('Config missing required parameters, needs email and password (optional base64)')
        }
        if(Buffer.from(config.password).toString('base64') === config.password) {            
            config.password = Buffer.from(config.password.toString('base64'))            
        }

        authData = await (await fetch(`${apiURL}authenticate`, { method: 'POST', body: `email=${config.email}&password=${config.password}`, headers: {"Content-Type":"application/x-www-form-urlencoded"} })).json()
        setInterval(async () => {
            authData = await (await fetch(`${apiURL}authenticate`, { method: 'POST', body: `email=${config.email}&password=${config.password}`, headers: {"Content-Type":"application/x-www-form-urlencoded"} })).json()
            setupWS(onData)
        }, 900000)
        //console.log(authData);
        if(authData.authorized) {
            if(typeof onData == 'function') {
                onData({
                    status: 'Authenticated',
                    data: authData.monitors
                })
            }
            setupWS(onData);
            resolve({
                getAuth: async () => {
                    authData = await (await fetch(`${apiURL}authenticate`, { method: 'POST', body: `email=${config.email}&password=${config.password}`, headers: {"Content-Type":"application/x-www-form-urlencoded"} })).json()   
                    setupWS(onData)
                    return authData
                },
                events: emmitter,
                getDevices: async () => {
                    return new Promise( async (resolve, reject) => {
                        const devices = (await (await fetch(`${apiURL}app/monitors/${authData.monitors[0].id}/devices`, { method: 'GET', headers: {"Authorization": `bearer ${authData.access_token}`} })).json())
                        resolve(devices)
                    })
                },
                getMonitorInfo: async () => {
                    return new Promise( async (resolve, reject) => {
                        const monitor = (await (await fetch(`${apiURL}app/monitors/${authData.monitors[0].id}/status`, { method: 'GET', headers: {"Authorization": `bearer ${authData.access_token}`} })).json())
                        resolve(monitor)
                    })
                },
                getTimeline: async () => {
                    return new Promise( async (resolve, reject) => {
                        const user = (await (await fetch(`${apiURL}users/${authData.user_id}/timeline`, { method: 'GET', headers: {"Authorization": `bearer ${authData.access_token}`} })).json())
                        resolve(user)
                    })
                }
            })
        } else if(authData.status == 'error') {
            emmitter.emit('error', authData.error_reason);
            reject(new Error(authData.error_reason));
        } else {
            emmitter.emit('error', 'Unable to make auth request');
            reject(new Error('Unable to make auth request'));
        }
    });
}

