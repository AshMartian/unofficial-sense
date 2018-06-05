const sense = require('./index')

try {
    sense({
        email: "email",
        password: "password plain text or base64"
    }, (data) => {
        console.log(data)
    }).then((thisSense) => {
        thisSense.getDevices().then(devices => {
            console.log(devices);
        })
        thisSense.getMonitorInfo().then(monitor => {
            console.log(monitor);
        })
        thisSense.getTimeline().then(timeline => {
            console.log(timeline);
        })
    })
} catch (err) {
    throw err
}