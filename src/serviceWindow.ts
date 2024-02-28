import { API, CharacteristicValue, Logger, PlatformAccessory, PlatformConfig, Service } from 'homebridge';
import { SiegeniaPlatform } from './platform';
import { SiegeniaDevice } from './siegeniaDevice';
import { DeviceTypeMap } from './siegeniaMapping';
import { SharedState } from './sharedState';


export class WindowService {
    private readonly name: string;
    private readonly service: Service;
    private targetPosition: number; // The target position of the window
    private windowState: string | undefined; // The current state of the window

    constructor(
        private readonly platform: SiegeniaPlatform,
        private readonly accessory: PlatformAccessory,
        private readonly device: SiegeniaDevice,
        private readonly log: Logger,
        private readonly config: PlatformConfig,
        private readonly api: API,
        private readonly sharedState: SharedState,
        private readonly subtype: string,
    ) {
        // Initialize windowState
        this.windowState = undefined;
        // Initialize targetPosition
        this.targetPosition = 0;  // Assume the target position is closed initially
        // extract name from config
        this.name = config.name || 'Siegenia Window';


        log.debug('Creating window service for', this.name);

        // Implement your WindowService here
        // create a new Window service
        // Check if the "Window" service already exists
        let service = this.accessory.getServiceById(this.api.hap.Service.Window, this.subtype);

        if (!service) {
            // log.debug('Creating new Window service for', this.name);
            // // Remove any existing services of the same type and subtype
            // this.accessory.services.forEach(existingService => {
            //     this.log.debug('Sub Service:', existingService.UUID, " ", existingService.subtype);
            //     if (existingService.UUID === this.api.hap.Service.Window.UUID && existingService.subtype === this.subtype) {
            //         this.log.debug('Removing existing service:', existingService.subtype);
            //         this.accessory.removeService(existingService);
            //     }
            // });
            // If the service does not exist, add it with the subtype
            service = this.accessory.addService(this.api.hap.Service.Window, 'Window Service', this.subtype);

        }

        // Now we know that service is not undefined, so we can use it
        this.service = service;

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
    }

    updateWindowState(newState: string) {
        this.sharedState.windowState = newState;
    }

    updatePosition(newPosition: number) {
        this.targetPosition = newPosition;
        this.service?.updateCharacteristic(this.api.hap.Characteristic.CurrentPosition, newPosition);
    }

    // Handle requests to get the current value of the "Current Position" characteristic
    handleCurrentPositionGet() {
        this.log.debug('Triggered GET CurrentPosition');

        let currentValue;

        switch (this.windowState) {
            case 'OPEN':
                currentValue = 100;
                break;
            case 'STOPPED':
                currentValue = 70;
                break;
            case 'STOP_OVER':
                currentValue = 40;
                break;
            case 'CLOSED_WOLOCK':
                currentValue = 20;
                break;
            case 'GAP_VENT':
                currentValue = 10
                break;
            case 'CLOSED':
                currentValue = 0;
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
            let submitCommand = command === 'OPEN' ? 'OPEN' : 'CLOSED';
            this.sharedState.windowState = submitCommand;

            // Update the target position
            this.targetPosition = value as number;
        });
    }



}