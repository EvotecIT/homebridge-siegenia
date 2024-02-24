// import { API, Characteristic, Service, PlatformAccessory } from 'homebridge';

// class MyAccessory {
//     private service: Service;
//     private button1: Characteristic;
//     private button2: Characteristic;

//     constructor(private readonly api: API, private readonly accessory: PlatformAccessory) {
//         this.service = this.accessory.getService(this.api.hap.Service.Switch) ||
//             this.accessory.addService(this.api.hap.Service.Switch);

//         this.button1 = this.service.getCharacteristic(this.api.hap.Characteristic.On);
//         this.button2 = this.service.addCharacteristic(
//             new this.api.hap.Characteristic(
//                 'Button 2',
//                 '00000021-0000-1000-8000-0026BB765291',
//                 {
//                     format: this.api.hap.Formats.BOOL,
//                     perms: [this.api.hap.Perms.PAIRED_READ, this.api.hap.Perms.PAIRED_WRITE, this.api.hap.Perms.NOTIFY]
//                 }
//             )
//         );
//         this.button1.on('set', this.handleButton1.bind(this));
//         this.button2.on('set', this.handleButton2.bind(this));
//     }

//     handleButton1(value: any, callback: any) {
//         console.log('Button 1 was pressed');
//         callback(null);
//     }

//     handleButton2(value: any, callback: any) {
//         console.log('Button 2 was pressed');
//         callback(null);
//     }
// }