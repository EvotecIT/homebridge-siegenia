import { API, CharacteristicValue, Logger, PlatformAccessory, PlatformConfig, Service } from 'homebridge';
import { SiegeniaPlatform } from './platform';
import { SiegeniaDevice } from './siegeniaDevice';
import { DeviceTypeMap } from './siegeniaMapping';
import { SharedState } from './sharedState';

export class WindowService {
    private readonly name: string;
    private readonly service: Service;
    private targetPosition: number; // The target position of the window

    constructor(
        private readonly platform: SiegeniaPlatform,
        private readonly accessory: PlatformAccessory,
        private readonly device: SiegeniaDevice,
        private readonly log: Logger,
        private readonly config: PlatformConfig,
        private readonly api: API,
        private readonly sharedState: SharedState,
    ) {
        // Initialize targetPosition
        this.targetPosition = 0;  // Assume the target position is closed initially
        // extract name from config
        this.name = config.name || 'Siegenia Window';


        // Implement your WindowService here
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

        switch (this.sharedState.windowState) {
            case 'OPEN':
                currentValue = 100;
                break;
            case 'STOPPED':
                currentValue = 70;
                break;
            case 'STOP_OVER':
                currentValue = 40;
                break;
            case 'CLOSED_WO_LOCK':
                currentValue = 20;
                break;
            case 'GAP_VENT':
                currentValue = 10
                break;
            case 'CLOSED':
                currentValue = 0;
                break;
            default:
                this.log.debug('Unknown window state:', this.sharedState.windowState);
                currentValue = 0;
                break;
        }
        return currentValue;
    }

    // Handle requests to get the current value of the "Position State" characteristic
    handlePositionStateGet() {
        this.log.debug('Triggered GET PositionState');

        let currentValue;

        switch (this.sharedState.windowState) {
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

        let commandValue = value as number;
        let returnValue = 0;
        // Convert the target position to an open/close command
        let command;
        if (commandValue === 100) {
            command = 'OPEN';
            returnValue = 100;
        } else if (commandValue > 40 && commandValue <= 99) {
            command = 'STOP_OVER'
            returnValue = 40;
        } else if (commandValue >= 20 && commandValue <= 40) {
            command = 'CLOSE_WO_LOCK'
            returnValue = 20;
        } else if (commandValue > 0 && commandValue < 20) {
            command = 'GAP_VENT'
            returnValue = 10;
        } else if (commandValue === 0) {
            command = 'CLOSE';
            returnValue = 0;
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
            //let submitCommand = command === 'CLOSE' ? 'CLOSED': command;
            //this.sharedState.windowState = submitCommand;

            // Update the target position
            this.targetPosition = returnValue; // as number;
        });
    }



}