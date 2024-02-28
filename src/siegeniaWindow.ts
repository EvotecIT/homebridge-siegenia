import { SiegeniaPlatform } from './platform';
import { SiegeniaDevice } from './siegeniaDevice';
import { DeviceTypeMap } from './siegeniaMapping';
import { API, CharacteristicValue, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic, uuid, HAP } from 'homebridge';

import { TelevisionService } from './serviceTelevision';
import { WindowService } from './serviceWindow';
import { ButtonService } from './serviceButton';
import { EventEmitter } from 'events';
import { SharedState } from './sharedState';


export class SiegeniaWindowAccessory {

    private televisionService: TelevisionService | null = null;
    private windowService: WindowService;
    private buttonService: ButtonService | null = null;
    private readonly log: Logger;
    private readonly config: PlatformConfig;
    private readonly api: API;
    private readonly name: string;
    private showButtonService: boolean;
    private showTelevisionService: boolean;
    private sharedState = new SharedState();

    //private stopService: Service; // "Stop" button service, allowing you to press stop during open or close scenario
    //private windowState: string | undefined; // The current state of the window
    // private targetPosition: number; // The target position of the window

    constructor(
        private readonly platform: SiegeniaPlatform,
        private readonly accessory: PlatformAccessory,
        private readonly device: SiegeniaDevice,
        log: Logger, config: PlatformConfig, api: API) {

        // Poll the device for updates
        let pollInterval;
        if (this.device && this.device.options && typeof this.device.options.pollInterval === 'number') {
            pollInterval = this.device.options.pollInterval * 1000;
        } else {
            // Handle the error or set a default value for pollInterval
            pollInterval = 5000; // Default value (5 seconds)
        }

        this.showButtonService = config.showButtonService;
        this.showTelevisionService = config.showTelevisionService;

        // Create the services
        if (this.showTelevisionService) {
            this.televisionService = new TelevisionService(platform, accessory, device, log, config, api, this.sharedState);
        }
        if (this.showButtonService) {
            this.buttonService = new ButtonService(platform, accessory, device, log, config, api, this.sharedState);
        }
        this.windowService = new WindowService(platform, accessory, device, log, config, api, this.sharedState);

        this.log = log;
        this.config = config;
        this.api = api;

        // extract name from config
        this.name = config.name || 'Siegenia Window';

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
                if (newState !== this.sharedState.windowState) {
                    this.sharedState.windowState = newState;

                    // Update the 'Current Position' characteristic
                    const newPosition = this.windowService.handleCurrentPositionGet();
                    this.windowService.updatePosition(newPosition);

                    // Set the Active characteristic of the Television service to 1 (on)
                    // basically we want it to always be on
                    this.televisionService?.setActiveState(1);

                    // Update the ActiveIdentifier characteristic
                    // if (this.windowState) {
                    //     const currentInput = Object.values(windowStates).indexOf(this.windowState);
                    //     this.log.info('Current Input:', currentInput);
                    //     this.log.info('Current Window State:', this.windowState);
                    //     if (currentInput !== -1) {
                    //         televisionService.setCharacteristic(this.api.hap.Characteristic.ActiveIdentifier, currentInput);
                    //     }
                    // }
                }
            });
        }, pollInterval);

    }

    public getDeviceInfo(callback: (err: any, info: any) => void) {
        this.device.getDeviceInfo(callback);
    }
}