import { CharacteristicValue, HAP, Logging } from 'homebridge';
import { SiegeniaPlatform } from './platform';
import { SiegeniaDevice } from './siegeniaDevice';
import { DeviceTypeMap } from './siegeniaMapping';
import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic, uuid } from 'homebridge';


export class SiegeniaWindowAccessory {
    private readonly log: Logger;

    private readonly config: PlatformConfig;
    private readonly api: API;
    private readonly name: string;
    private readonly service: Service;
    private windowState: string | undefined;
    private targetPosition: number;

    constructor(
        private readonly platform: SiegeniaPlatform,
        private readonly accessory: PlatformAccessory,
        private readonly device: SiegeniaDevice,
        log: Logger,
        config: PlatformConfig,
        api: API
    ) {
        this.log = log;
        this.config = config;
        this.api = api;

        // Initialize windowState
        this.windowState = undefined;

        // extract name from config
        this.name = config.name || 'default';

        // create a new Window service
        this.service = new this.api.hap.Service.Window(this.name);

        //this.updateDeviceInformation();

        // create handlers for required characteristics
        this.service.getCharacteristic(this.api.hap.Characteristic.CurrentPosition)
            .onGet(this.handleCurrentPositionGet.bind(this));

        this.service.getCharacteristic(this.api.hap.Characteristic.PositionState)
            .onGet(this.handlePositionStateGet.bind(this));

        this.service.getCharacteristic(this.api.hap.Characteristic.TargetPosition)
            .onGet(this.handleTargetPositionGet.bind(this))
            .onSet(this.handleTargetPositionSet.bind(this));

        // Get the device info and set the accessory information
        this.device.getDeviceInfo((err, info) => {
            if (err) {
                this.log.error('Failed to get device info:', err);
                return;
            }

            this.log.info('Device Info:', info);

            // Set the accessory information
            this.accessory.getService(this.api.hap.Service.AccessoryInformation)!
                .setCharacteristic(this.api.hap.Characteristic.Manufacturer, "Siegenia")
                .setCharacteristic(this.api.hap.Characteristic.Model, DeviceTypeMap[info.data.type])
                .setCharacteristic(this.api.hap.Characteristic.SerialNumber, info.data.serialnr);
        });

        this.accessory.addService(this.service);

        setInterval(() => {
            this.device.getDeviceParams((err, params) => {
                if (err) {
                    this.log.error('Failed to get device params:', err);
                    return;
                }

                this.log.info('Device Params:', params);

                // Update the window state
                const newState = params.data.states[0];
                if (newState !== this.windowState) {
                    this.windowState = newState;

                    // Update the 'Current Position' characteristic
                    const newPosition = this.handleCurrentPositionGet();
                    this.service.updateCharacteristic(this.api.hap.Characteristic.CurrentPosition, newPosition);
                }
            });
        }, 5000);

        // Initialize targetPosition
        this.targetPosition = 0;  // Assume the target position is closed initially
    }

    public getDeviceInfo(callback: (err: any, info: any) => void) {
        this.device.getDeviceInfo(callback);
    }

    updateDeviceInformation() {
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

            this.device?.getDeviceInfo((err, info) => {
                if (err) {
                    this.log.error('Failed to get device info:', err);
                    return;
                }

                this.log.info('Device Info:', info);

                // hardcoded example of how to handle different device types
                if (info.data.type == 6) {
                    this.log.info('This is a device of type ' + DeviceTypeMap[info.data.type] + " and is supported");
                } else {
                    this.log.info("This device ", DeviceTypeMap[info.data.type], " is not supported - feel free to open an issue or pull request on GitHub");
                    return;
                }
            });

            // Fetch and log device params
            this.device?.getDeviceParams((err, params) => {
                if (err) {
                    this.log.error('Failed to get device params:', err);
                    return;
                }

                this.log.info('Device Params:', params);
            });

            // Fetch and log device details
            // this.device?.getDeviceDetails((err, details) => {
            //     if (err) {
            //         this.log.error('Failed to get device details:', err);
            //         return;
            //     }

            //     this.log.info('Device Details:', details);
            // });
        });
    }

    /**
     * Handle requests to get the current value of the "Current Position" characteristic
     */
    handleCurrentPositionGet() {
        this.log.debug('Triggered GET CurrentPosition');

        let currentValue;

        switch (this.windowState) {
            case 'OPEN':
                currentValue = 100;
                break;
            case 'CLOSED_WOLOCK':
            case 'CLOSED':
                currentValue = 0;
                break;
            case 'STOPPED':
                currentValue = 30;
                break;
            case 'GAP_VENT':
                currentValue = 1;
                break;
            default:
                currentValue = 0;
                break;
        }

        return currentValue;
    }

    /**
     * Handle requests to get the current value of the "Position State" characteristic
     */
    handlePositionStateGet() {
        this.log.debug('Triggered GET PositionState');

        let currentValue;

        switch (this.windowState) {
            case 'MOVING':
                currentValue = this.api.hap.Characteristic.PositionState.INCREASING;
                break;
            default:
                currentValue = this.api.hap.Characteristic.PositionState.STOPPED;
                break;
        }

        return currentValue;
    }


    /**
     * Handle requests to get the current value of the "Target Position" characteristic
     */
    handleTargetPositionGet() {
        this.log.debug('Triggered GET TargetPosition');

        // Return the target position instead of a fixed value
        return this.targetPosition;
    }

    /**
     * Handle requests to set the "Target Position" characteristic
     */
    handleTargetPositionSet(value: CharacteristicValue) {
        this.log.debug('Triggered SET TargetPosition:', value);

        // Convert the target position to an open/close command
        let command;
        if (value === 100) {
            command = 'OPEN';
        } else if (value === 0) {
            command = 'CLOSE';
        } else {
            // For now, do nothing if the target position is not 0 or 100
            return;
        }

        // Send the command to the device
        this.device.setDeviceParams({ openclose: { 0: command } }, (err, response) => {
            if (err) {
                this.log.error('Failed to set device params:', err);
                return;
            }

            this.log.info('Set device params response:', response);

            // Update the window state
            this.windowState = command === 'OPEN' ? 'OPEN' : 'CLOSED';
            // Update the target position
            this.targetPosition = value as number;
        });
    }
}