<p align="center">
<img src="https://github.com/homebridge/branding/raw/latest/logos/homebridge-wordmark-logo-vertical.png" width="150">
</p>

<p align="center">
<a href="https://www.npmjs.com/package/homebridge-siegenia"><img alt="NPM Version" src="https://img.shields.io/npm/v/homebride-siegenia?style=flat-square&label=npm version"></a>
<a href="https://www.npmjs.com/package/homebridge-siegenia"><img alt="NPM Downloads" src="https://img.shields.io/npm/dm/siegenia-homebridge?style=flat-square&label=downloads%20per%20month"></a>
<a href="https://www.npmjs.com/package/homebridge-siegenia"><img alt="NPM Downloads" src="https://img.shields.io/npm/dt/homebridge-siegenia?style=flat-square&label=downloads%20total"></a>
</p>

<p align="center">
  <a href="https://github.com/EvotecIT/homebridge-siegenia"><img src="https://img.shields.io/github/languages/top/evotecit/homebridge-siegenia.svg?style=flat-square"></a>
  <a href="https://github.com/EvotecIT/homebridge-siegenia"><img src="https://img.shields.io/github/languages/code-size/evotecit/homebridge-siegenia.svg?style=flat-square"></a>
  <a href="https://github.com/EvotecIT/homebridge-siegenia"><img src="https://img.shields.io/github/license/EvotecIT/homebridge-siegenia.svg?style=flat-square"></a>
  <a href="https://wakatime.com/badge/user/f1abc372-39bb-4b06-ad2b-3a24cf161f13/project/018dd711-1056-4cec-86b2-9151f91f8443"><img src="https://wakatime.com/badge/user/f1abc372-39bb-4b06-ad2b-3a24cf161f13/project/018dd711-1056-4cec-86b2-9151f91f8443.svg?style=flat-square" alt="wakatime"></a>
</p>

<p align="center">
  <a href="https://twitter.com/PrzemyslawKlys"><img src="https://img.shields.io/twitter/follow/PrzemyslawKlys.svg?label=Twitter%20%40PrzemyslawKlys&style=flat-square"></a>
  <a href="https://evotec.xyz/hub"><img src="https://img.shields.io/badge/Blog-evotec.xyz-2A6496.svg?style=flat-square"></a>
  <a href="https://www.linkedin.com/in/pklys"><img src="https://img.shields.io/badge/LinkedIn-pklys-0077B5.svg?logo=LinkedIn&style=flat-square"></a>
</p>

## Homebridge Siegenia Plugin

This is a plugin for [Homebridge](https://homebridge.io/) that exposes Siegenia Devices to **Apple Homekit**.
Currently it supports MHS Family of devices (Windows), as this is the only device I have access to.
If you have other devices, please let me know, and I will try to add support for them.

This plugin was built with huge help of [@Apollon77](https://github.com/Apollon77) and his [ioBroker siegenia](https://github.com/Apollon77/ioBroker.siegenia) plugin.
It allowed me to understand how the communication with Siegenia devices works.
Without it this plugin wouldn't be possible.

As this is my first plugin ever, and first typescript project, I'm open to any feedback, and help.

## How communication works
For the sake of understanding how the communication with Siegenia devices works, I will describe it here, as it may come in handy for someone.

### 1. Login
```
[25.02.2024, 10:18:12] [Siegenia] 192.168.241.198: SEND: {"command":"login","user":"admin","password":"mypassword","long_life":false,"id":2}
[25.02.2024, 10:18:12] [Siegenia] 192.168.241.198: RECEIVE: {"data":{"isadmin":true,"token":"yWjMYdldZ","user":"admin","userid":0},"id":2,"status":"ok"}
[25.02.2024, 10:18:12] [Siegenia] Logged in successfully
```

## 2. Get Device Info

```
[25.02.2024, 10:18:12] [Siegenia] 192.168.241.198: SEND: {"command":"getDevice","id":3}
[25.02.2024, 10:18:12] [Siegenia] 192.168.241.198: RECEIVE: {"data":{"adminpwinit":true,"devicefloor":"Parter","devicelocation":"","devicename":"Okno Salon","firmware_update":0,"hardwareversion":"1.2","hardwareversion_wifi":"1","initialized":true,"multiadminpwinit":true,"serialnr":"af050261","softwareversion":"1.7.2","subvariant":0,"type":6,"userpwinit":true,"variant":1},"id":3,"status":"ok"}
[25.02.2024, 10:18:12] [Siegenia] Device Info: {
  data: {
    adminpwinit: true,
    devicefloor: 'Parter',
    devicelocation: '',
    devicename: 'Okno Salon',
    firmware_update: 0,
    hardwareversion: '1.2',
    hardwareversion_wifi: '1',
    initialized: true,
    multiadminpwinit: true,
    serialnr: 'af050261',
    softwareversion: '1.7.2',
    subvariant: 0,
    type: 6,
    userpwinit: true,
    variant: 1
  },
  id: 3,
  status: 'ok'
}
```

### 3. Get Device Params

```
[25.02.2024, 10:18:12] [Siegenia] 192.168.241.198: SEND: {"command":"getDeviceParams","id":4}
[25.02.2024, 10:18:12] [Siegenia] 192.168.241.198: RECEIVE: {"data":{"clock":{"day":25,"hour":9,"minute":18,"month":2,"year":2024},"cn":"e45564a10fa004b3f4f22093849893d63813cdddac6b7e1e6cc0dfa3ca1e2104","devicefloor":"Parter","devicelocation":"","devicename":"Okno Salon","firmware_update":0,"max_stopover":13,"states":{"0":"CLOSED"},"stopover":3,"timer":{"duration":{"hour":0,"minute":10},"enabled":false,"remainingtime":{"hour":0,"minute":0}},"timezone":"CET-1CEST,M3.5.0,M10.5.0\/3","warnings":[]},"id":4,"status":"ok"}
[25.02.2024, 10:18:12] [Siegenia] Device Params: {
  data: {
    clock: { day: 25, hour: 9, minute: 18, month: 2, year: 2024 },
    cn: 'e45564a10fa004b3f4f22093849893d63813cdddac6b7e1e6cc0dfa3ca1e2104',
    devicefloor: 'Parter',
    devicelocation: '',
    devicename: 'Okno Salon',
    firmware_update: 0,
    max_stopover: 13,
    states: { '0': 'CLOSED' },
    stopover: 3,
    timer: { duration: [Object], enabled: false, remainingtime: [Object] },
    timezone: 'CET-1CEST,M3.5.0,M10.5.0/3',
    warnings: []
  },
  id: 4,
  status: 'ok'
}
```


### Setup Development Environment


### Install Development Dependencies

Using a terminal, navigate to the project folder and run this command to install the development dependencies:

```shell
$ npm install
```

### Build Plugin

TypeScript needs to be compiled into JavaScript before it can run. The following command will compile the contents of your [`src`](./src) directory and put the resulting code into the `dist` folder.

```shell
$ npm run build
```

### Link To Homebridge

Run this command so your global installation of Homebridge can discover the plugin in your development environment:

```shell
$ npm link
```

### Watch For Changes and Build Automatically

If you want to have your code compile automatically as you make changes, and restart Homebridge automatically between changes

```shell
$ npm run watch
```
