import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic, uuid } from 'homebridge';
import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
import { SiegeniaDevice } from './siegeniaDevice';
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
        this.log.info('Discovering devices...');
        // A real plugin you would discover accessories from the local network, cloud services
        // or a user-defined array in the platform config.
        const exampleDevices: ExampleDevice[] = [];
        // Connect to the device and get its info
        const device = new SiegeniaDevice({
            ip: this.config.ip, // replace with your device IP
            port: this.config.port || 443, // optional, default is 443
            wsProtocol: this.config.wsProtocol || 'wss', // optional, default is 'wss'
            logger: (message: string) => this.log.info(message),
            debug: this.config.debug || false, // optional, default is false
            pollInterval: this.config.pollInterval || 5, // optional, default is 5
            heartbeatInterval: this.config.heartbeatInterval || 10, // optional, default is 5
            retryInterval: this.config.retryInterval || 5, // optional, default is 5
            maxRetries: this.config.maxRetries || 3, // optional, default is 3
            informational: this.config.informational || true, // optional, default is false
        });

        device.on('error', (err) => {
            this.log.error('Failed to connect first:', err.message);
            // handle the error here, e.g. retry connection, log the error, etc.
        });
        device.connect((err) => {
            if (err) {
                //this.log.error('Failed to connect second:', err.message);
                return;
            }
            device.loginUser(this.config.username, this.config.password, (err) => {
                if (err) {
                    this.log.error('Failed to login. Please check your credenitals. Error reported:', err.message);
                    return;
                }

                this.log.info('Logged in successfully');

                device.getDeviceInfo((err, info) => {
                    if (err) {
                        this.log.error('Failed to get device info:', err);
                        return;
                    }

                    if (this.device?.options.debug) {
                        this.log.info('Device Info:', info);
                    }

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
