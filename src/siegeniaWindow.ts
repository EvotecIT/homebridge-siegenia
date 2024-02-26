import { SiegeniaPlatform } from './platform';
import { SiegeniaDevice } from './siegeniaDevice';
import { DeviceTypeMap } from './siegeniaMapping';
import { API, CharacteristicValue, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic, uuid, HAP, Logging } from 'homebridge';

export class SiegeniaWindowAccessory {
    private readonly log: Logger;

    private readonly config: PlatformConfig;
    private readonly api: API;
    private readonly name: string;
    private readonly buttonName: string;
    private readonly service: Service;
    private stopService: Service; // "Stop" button service, allowing you to press stop during open or close scenario
    private windowState: string | undefined; // The current state of the window
    private targetPosition: number; // The target position of the window

    constructor(private readonly platform: SiegeniaPlatform, private readonly accessory: PlatformAccessory, private readonly device: SiegeniaDevice, log: Logger, config: PlatformConfig, api: API) {
        this.log = log;
        this.config = config;
        this.api = api;

        // Initialize windowState
        this.windowState = undefined;

        // extract name from config
        this.name = config.name || 'Siegenia Window';

        // extract buttonName from config
        this.buttonName = config.buttonName || 'Siegenia Window Stop Button';

        // create a new Window service
        this.service = new this.api.hap.Service.Window(this.name);

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

            if (this.device.options.debug) {
                this.log.info('Device Info:', info);
            }
            // Set the accessory information
            this.accessory.getService(this.api.hap.Service.AccessoryInformation)!
                .setCharacteristic(this.api.hap.Characteristic.Manufacturer, 'Siegenia ' + info.data.devicename)
                .setCharacteristic(this.api.hap.Characteristic.Model, DeviceTypeMap[info.data.type])
                .setCharacteristic(this.api.hap.Characteristic.SerialNumber, info.data.serialnr);
        });

        this.accessory.addService(this.service);

        // Poll the device for updates
        let pollInterval;
        if (this.device && this.device.options && typeof this.device.options.pollInterval === 'number') {
            pollInterval = this.device.options.pollInterval * 1000;
        } else {
            // Handle the error or set a default value for pollInterval
            pollInterval = 5000; // Default value (5 seconds)
        }

        setInterval(() => {
            this.device.getDeviceParams((err, params) => {
                if (err) {
                    this.log.error('Failed to get device params:', err);
                    return;
                }

                if (this.device.options.debug) {
                    this.log.info('Device Params:', params);
                }

                // lets log the device status so user knows what is happening
                if (this.device.options.informational) {
                    this.log.info('Device status for', params.data.devicename, "is", params.data.states[0]);
                }

                // Update the window state
                const newState = params.data.states[0];
                if (newState !== this.windowState) {
                    this.windowState = newState;

                    // Update the 'Current Position' characteristic
                    const newPosition = this.handleCurrentPositionGet();
                    this.service?.updateCharacteristic(this.api.hap.Characteristic.CurrentPosition, newPosition);
                }
            });
        }, pollInterval);

        // Initialize targetPosition
        this.targetPosition = 0;  // Assume the target position is closed initially

        // Add the "Switch" service
        this.stopService = this.accessory.addService(this.api.hap.Service.Switch, this.buttonName, 'stop');

        // Configure the "On" characteristic of the "Switch" service
        this.stopService.getCharacteristic(this.api.hap.Characteristic.On)
            .on('get', this.handleStopGet.bind(this))
            .on('set', this.handleStopSet.bind(this));
    }

    public getDeviceInfo(callback: (err: any, info: any) => void) {
        this.device.getDeviceInfo(callback);
    }

    // Handle requests to get the current value of the "Current Position" characteristic
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

    // Handle requests to get the current value of the "Position State" characteristic
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

    // Handle requests to get the current value of the "Target Position" characteristic
    handleTargetPositionGet() {
        this.log.debug('Triggered GET TargetPosition');

        // Return the target position instead of a fixed value
        return this.targetPosition;
    }

    // Handle requests to set the "Target Position" characteristic
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

    // Handle requests to get the current value of the "On" characteristic
    handleStopGet(callback) {
        callback(null, false); // The "Stop" button is always off
    }

    // Handle requests to set the "On" characteristic
    handleStopSet(value, callback) {
        if (value && this.stopService.getCharacteristic(this.api.hap.Characteristic.On).value === false) {
            // The "Stop" button was pressed, perform the stop action here
            this.performStopAction();

            // Turn the "Stop" button "off" again after a short delay
            setTimeout(() => {
                this.stopService.getCharacteristic(this.api.hap.Characteristic.On).updateValue(false);
            }, 1000); // Delay of 1 second
        }

        callback(null);
    }


    // Handle changes to the "ProgrammableSwitchEvent" characteristic
    handleStopChange(value) {
        if (value.newValue === this.api.hap.Characteristic.ProgrammableSwitchEvent.SINGLE_PRESS) {
            // The "Stop" button was pressed, perform the stop action here
            this.performStopAction();
        }
    }


    // Perform the stop action
    performStopAction() {
        const command = 'STOP';
        // Send the command to the device
        this.device.setDeviceParams({ openclose: { 0: command } }, (err, response) => {
            if (err) {
                this.log.error('Failed to set device params:', err);
                return;
            }

            this.log.info('Set device params response:', response);
        });
    }

}