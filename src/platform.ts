import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic, uuid } from 'homebridge';
import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
import { SiegeniaAccessory } from './platformAccessory';
import { SiegeniaDevice } from './siegeniaDevice';
import { DeviceTypeMap } from './siegeniaMapping';
import { SiegeniaWindowAccessory } from './siegeniaWindow';

export interface ExampleDevice {
    uniqueId: string;
    // other properties...
}


export class SiegeniaPlatform implements DynamicPlatformPlugin {
    public readonly Service: typeof Service = this.api.hap.Service;
    public readonly Characteristic: typeof Characteristic = this.api.hap.Characteristic;

    private readonly device?: SiegeniaDevice;
    // this is used to track restored cached accessories
    public accessories: PlatformAccessory[] = [];
    // this is used to track the window accessories
    private readonly windowAccessories: SiegeniaWindowAccessory[] = [];


    constructor(public readonly log: Logger, public readonly config: PlatformConfig, public readonly api: API) {
        this.log.debug('Finished initializing platform:', this.config.name);

        // Check if necessary config values are provided
        if (!this.config.ip || !this.config.username || !this.config.password) {
            setInterval(() => {
                this.log.error('Missing necessary config values: ip, port, username, password');
            }, 5000); // Log the message every 5 seconds
            return;
        }

        // When this event is fired it means Homebridge has restored all cached accessories from disk.
        // Dynamic Platform plugins should only register new accessories after this event was fired,
        // in order to ensure they weren't added to homebridge already. This event can also be used
        // to start discovery of new accessories.
        this.api.on('didFinishLaunching', () => {
            log.debug('Executed didFinishLaunching callback');
            // run the method to discover / register your devices as accessories
            this.discoverDevices();
        });
    }

    /**
     * This function is invoked when homebridge restores cached accessories from disk at startup.
     * It should be used to setup event handlers for characteristics and update respective values.
     */
    configureAccessory(accessory: PlatformAccessory) {
        this.log.info('Loading accessory from cache:', accessory.displayName);

        // add the restored accessory to the accessories cache so we can track if it has already been registered
        this.accessories.push(accessory);
    }

    /**
     * This is an example method showing how to register discovered accessories.
     * Accessories must only be registered once, previously created accessories
     * must not be registered again to prevent "duplicate UUID" errors.
     */
    discoverDevices() {

        // EXAMPLE ONLY
        // A real plugin you would discover accessories from the local network, cloud services
        // or a user-defined array in the platform config.
        const exampleDevices: ExampleDevice[] = [
            //     {
            //         uniqueId: 'ABCD',
            //         displayName: 'Bedroom',
            //     },
            //     // {
            //     //     uniqueId: 'EFGH',
            //     //     displayName: 'Kitchen',
            //     // },
        ];

        // // loop over the discovered devices and register each one if it has not already been registered
        // for (const device of exampleDevices) {

        //     // generate a unique id for the accessory this should be generated from
        //     // something globally unique, but constant, for example, the device serial
        //     // number or MAC address
        //     const uuid = this.api.hap.uuid.generate(device.uniqueId);

        //     // see if an accessory with the same uuid has already been registered and restored from
        //     // the cached devices we stored in the `configureAccessory` method above
        //     const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);

        //     if (existingAccessory) {
        //         // the accessory already exists
        //         this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName);

        //         // if you need to update the accessory.context then you should run `api.updatePlatformAccessories`. eg.:
        //         // existingAccessory.context.device = device;
        //         // this.api.updatePlatformAccessories([existingAccessory]);

        //         // create the accessory handler for the restored accessory
        //         // this is imported from `platformAccessory.ts`
        //         new SiegeniaAccessory(this, existingAccessory);

        //         // it is possible to remove platform accessories at any time using `api.unregisterPlatformAccessories`, eg.:
        //         // remove platform accessories when no longer present
        //         // this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [existingAccessory]);
        //         // this.log.info('Removing existing accessory from cache:', existingAccessory.displayName);
        //     } else {
        //         // the accessory does not yet exist, so we need to create it
        //         this.log.info('Adding new accessory:', device.displayName);

        //         // create a new accessory
        //         const accessory = new this.api.platformAccessory(device.displayName, uuid);

        //         // store a copy of the device object in the `accessory.context`
        //         // the `context` property can be used to store any data about the accessory you may need
        //         accessory.context.device = device;

        //         // create the accessory handler for the newly create accessory
        //         // this is imported from `platformAccessory.ts`
        //         new SiegeniaAccessory(this, accessory);

        //         // link the accessory to your platform
        //         this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
        //     }
        // }



        this.log.info('Discovering devices...');

        // Connect to the device and get its info
        const device = new SiegeniaDevice({
            ip: this.config.ip, // replace with your device IP
            port: this.config.port || 443, // optional, default is 443
            wsProtocol: this.config.wsProtocol || 'wss', // optional, default is 'wss'
            logger: (message: string) => this.log.info(message),
        });

        device.connect((err) => {
            if (err) {
                this.log.error('Failed to connect:', err);
                return;
            }

            device.loginUser(this.config.username, this.config.password, (err) => { // replace 'username' and 'password' with your credentials
                if (err) {
                    this.log.error('Failed to login:', err);
                    return;
                }

                this.log.info('Logged in successfully');

                device.getDeviceInfo((err, info) => {
                    if (err) {
                        this.log.error('Failed to get device info:', err);
                        return;
                    }

                    this.log.info('Device Info:', info);

                    // Use the serialnr as the UUID
                    const uuid = this.api.hap.uuid.generate(info.data.serialnr);

                    // Create a new accessory
                    const accessory = new this.api.platformAccessory('Siegenia Window', uuid);

                    // Add the accessory to Homebridge
                    this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);

                    // Add the accessory to the list of registered accessories
                    this.accessories.push(accessory);

                    this.log.info('Adding new accessory:', accessory.displayName);

                    // Create a new SiegeniaWindowAccessory for the device
                    const windowAccessory = new SiegeniaWindowAccessory(this, accessory, device, this.log, this.config, this.api);

                    // Add the window accessory to the list
                    this.windowAccessories.push(windowAccessory);

                    // Log the discovered devices here
                    this.log.info('Discovered devices:', this.accessories.map(a => a.displayName).join(', '));
                });

            });
        });

        this.log.info('Discovered devices:', this.accessories.map(a => a.displayName).join(', '));


        // If exampleDevices is empty, remove all accessories
        if (exampleDevices.length === 0) {
            if (this.accessories.length > 0) {
                this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, this.accessories);
                this.log.info('Removing all existing accessories from cache');

                // Clear the accessories array
                this.accessories = [];
            }
        } else {
            // If exampleDevices is not empty, handle it as before
            const discoveredDeviceIds = exampleDevices.map(device => this.api.hap.uuid.generate(device.uniqueId));
            const accessoriesToRemove = this.accessories.filter(accessory => !discoveredDeviceIds.includes(accessory.UUID));

            if (accessoriesToRemove.length > 0) {
                this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, accessoriesToRemove);
                this.log.info('Removing existing accessories from cache:', accessoriesToRemove.map(a => a.displayName).join(', '));

                this.accessories = this.accessories.filter(accessory => !accessoriesToRemove.includes(accessory));
            }
        }
    }
}
