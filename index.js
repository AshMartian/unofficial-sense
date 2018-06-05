const fetch = require('node-fetch'), ws = require('ws')

const apiURL = 'https://api.sense.com/apiservice/api/v1/'

var authInfo = {};

const setupWS = (onData) => {
    const sendData = typeof onData == 'function'
    let WSURL = `wss://clientrt.sense.com/monitors/${authInfo.monitors[0].id}/realtimefeed?access_token=${authInfo.access_token}`
    const senseWS = new ws(WSURL)

    senseWS.on('open', () => {
        if(sendData) {
            onData({
                status: "Connected"
            })
        }
    });
    senseWS.on('message', (data) => {
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

module.exports = async (config, onData) => {
    if(!config.email || !config.password) {
        throw new Error('Config missing required parameters, needs email and password (optional base64)')
    }
    if(Buffer.from(config.password, 'base64').toString('base64') === config.password) {
        config.password = Buffer.from(config.password, 'base64')
    }

    let authData = await (await fetch(`${apiURL}authenticate`, { method: 'POST', body: `email=${config.email}&password=${config.password}`, headers: {"Content-Type":"application/x-www-form-urlencoded"} })).json()
    console.log(authData);
    if(authData.authorized) {
        authInfo = authData;
        if(typeof onData == 'function') {
            onData({
                status: 'Authenticated',
                data: authData.monitors
            })
        }
        setupWS(onData);
        return {
            getDevices: async () => {
                return new Promise( async (resolve, reject) => {
                    const devices = (await (await fetch(`${apiURL}app/monitors/${authInfo.monitors[0].id}/devices`, { method: 'GET', headers: {"Authorization": `bearer ${authInfo.access_token}`} })).json())
                    resolve(devices)
                })
            },
            getMonitorInfo: async () => {
                return new Promise( async (resolve, reject) => {
                    const monitor = (await (await fetch(`${apiURL}app/monitors/${authInfo.monitors[0].id}/status`, { method: 'GET', headers: {"Authorization": `bearer ${authInfo.access_token}`} })).json())
                    resolve(monitor)
                })
            },
            getTimeline: async () => {
                return new Promise( async (resolve, reject) => {
                    const user = (await (await fetch(`${apiURL}users/${authInfo.user_id}/timeline`, { method: 'GET', headers: {"Authorization": `bearer ${authInfo.access_token}`} })).json())
                    resolve(user)
                })
            }
        }
    } else if(authData.status == 'error') {
        throw new Error(authData.error_reason);
    } else {
        throw new Error('Unable to make auth request');
    }
}

