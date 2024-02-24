import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic } from 'homebridge';
import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
import { SiegeniaAccessory } from './platformAccessory';
import { SiegeniaDevice } from './siegenia';

export class SiegeniaPlatform implements DynamicPlatformPlugin {
    public readonly Service: typeof Service = this.api.hap.Service;
    public readonly Characteristic: typeof Characteristic = this.api.hap.Characteristic;

    private readonly device?: SiegeniaDevice;
    // this is used to track restored cached accessories
    public readonly accessories: PlatformAccessory[] = [];

    constructor(public readonly log: Logger, public readonly config: PlatformConfig, public readonly api: API) {
        this.log.debug('Finished initializing platform:', this.config.name);

        // Check if necessary config values are provided
        if (!this.config.ip || !this.config.username || !this.config.password) {
            setInterval(() => {
                this.log.error('Missing necessary config values: ip, port, username, password');
            }, 5000); // Log the message every 5 seconds
            return;
        }

        this.device = new SiegeniaDevice({
            ip: this.config.ip, // replace with your device IP
            port: this.config.port || 443, // optional, default is 443
            wsProtocol: this.config.wsProtocol || 'wss', // optional, default is 'wss'
            logger: (message: string) => this.log.info(message),
        });

        this.device.connect((err) => {
            if (err) {
                this.log.error('Failed to connect:', err);
                return;
            }

            this.device?.loginUser(this.config.username, this.config.password, (err) => { // replace 'username' and 'password' with your credentials
                if (err) {
                    this.log.error('Failed to login:', err);
                    return;
                }

                this.log.info('Logged in successfully');
                // You can now call other methods on the `device` object
            });
        });

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
        const exampleDevices = [
            {
                uniqueId: 'ABCD',
                displayName: 'Bedroom',
            },
            {
                uniqueId: 'EFGH',
                displayName: 'Kitchen',
            },
        ];

        // loop over the discovered devices and register each one if it has not already been registered
        for (const device of exampleDevices) {

            // generate a unique id for the accessory this should be generated from
            // something globally unique, but constant, for example, the device serial
            // number or MAC address
            const uuid = this.api.hap.uuid.generate(device.uniqueId);

            // see if an accessory with the same uuid has already been registered and restored from
            // the cached devices we stored in the `configureAccessory` method above
            const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);

            if (existingAccessory) {
                // the accessory already exists
                this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName);

                // if you need to update the accessory.context then you should run `api.updatePlatformAccessories`. eg.:
                // existingAccessory.context.device = device;
                // this.api.updatePlatformAccessories([existingAccessory]);

                // create the accessory handler for the restored accessory
                // this is imported from `platformAccessory.ts`
                new SiegeniaAccessory(this, existingAccessory);

                // it is possible to remove platform accessories at any time using `api.unregisterPlatformAccessories`, eg.:
                // remove platform accessories when no longer present
                // this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [existingAccessory]);
                // this.log.info('Removing existing accessory from cache:', existingAccessory.displayName);
            } else {
                // the accessory does not yet exist, so we need to create it
                this.log.info('Adding new accessory:', device.displayName);

                // create a new accessory
                const accessory = new this.api.platformAccessory(device.displayName, uuid);

                // store a copy of the device object in the `accessory.context`
                // the `context` property can be used to store any data about the accessory you may need
                accessory.context.device = device;

                // create the accessory handler for the newly create accessory
                // this is imported from `platformAccessory.ts`
                new SiegeniaAccessory(this, accessory);

                // link the accessory to your platform
                this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
            }
        }
    }
}
