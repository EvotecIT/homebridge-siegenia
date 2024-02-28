<p align="center">

<img src="https://github.com/homebridge/branding/raw/latest/logos/homebridge-wordmark-logo-vertical.png" width="150">

</p>

## How communication works


### 1. Login
```
[25.02.2024, 10:18:12] [Siegenia] 192.168.241.198: Websocket Open for Session, starting heartbeat
[25.02.2024, 10:18:12] [Siegenia] 192.168.241.198: SEND: {"command":"login","user":"admin","password":"mypassword","long_life":false,"id":2}
[25.02.2024, 10:18:12] [Siegenia] 192.168.241.198: RECEIVE: {"data":{"isadmin":true,"token":"yWjMYdldZW2z5PH3pSoo","user":"admin","userid":0},"id":2,"status":"ok"}
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

You can now start Homebridge, use the `-D` flag, so you can see debug log messages in your plugin:

```shell
$ homebridge -D
```

### Watch For Changes and Build Automatically

If you want to have your code compile automatically as you make changes, and restart Homebridge automatically between changes

```shell
$ npm run watch
```
