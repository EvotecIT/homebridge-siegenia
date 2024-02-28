import { API, CharacteristicValue, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic, uuid, HAP } from 'homebridge';
import { SiegeniaPlatform } from './platform';
import { SiegeniaDevice } from './siegeniaDevice';
import { DeviceTypeMap } from './siegeniaMapping';
import { SiegeniaWindowAccessory } from './siegeniaWindow';
import { SharedState } from './sharedState';


export class TelevisionService {
    private readonly televisionService: Service;

    constructor(
        private readonly platform: SiegeniaPlatform,
        private readonly accessory: PlatformAccessory,
        private readonly device: SiegeniaDevice,
        private readonly log: Logger,
        private readonly config: PlatformConfig,
        private readonly api: API,
        private readonly sharedState: SharedState,
    ) {
        // Implement your TelevisionService here
        // Create a new Television service
        this.televisionService = new this.api.hap.Service.Television();

        // Add the Television service to the accessory
        this.accessory.addService(this.televisionService);


        // // Define your window states in the order you want them to appear
        // const windowStatesOrder = ['Moving', 'Open', 'Stop Over', 'Close No Lock', 'Gap', 'Close', 'Closed', 'Stopped'];

        // // Define your window states
        // const windowStates = new Map([
        //     ['Moving', 'MOVING'],
        //     ['Open', 'OPEN'],
        //     ['Gap', 'GAP_VENT'],
        //     ['Stop Over', 'STOP_OVER'],
        //     ['Close No Lock', 'CLOSE_WO_LOCK'],
        //     ['Close', 'CLOSE'],
        //     ['Stopped', 'STOPPED'],
        //     ['Closed', 'CLOSED'],
        // ]);

        let windowActionStates = new Map([
            ['Open', {
                'action': 'OPEN',
                'state': 'OPEN'
            }],
            ['Stopped', {
                'action': 'STOP',
                'state': 'STOPPED'
            }],
            ['Stop Over', {
                'action': 'STOP_OVER',
                'state': 'STOP_OVER'
            }],
            ['Close No Lock', {
                'action': 'CLOSE_WO_LOCK',
                'state': 'CLOSE_WO_LOCK'
            }],
            ['Gap', {
                'action': 'GAP_VENT',
                'state': 'GAP_VENT'
            }],
            ['Close', {
                'action': 'CLOSE',
                'state': 'CLOSED'
            }],
            ['Moving', {
                'action': 'MOVE',
                'state': 'MOVING'
            }]
        ]);

        // Add each window state as an input source to the Television service
        Array.from(windowActionStates.keys()).forEach((windowState, index) => {
            this.log.info('Adding input source:', windowState, ' with index:', index);
            const inputSourceService = new this.api.hap.Service.InputSource(windowState, windowState);
            inputSourceService
                .setCharacteristic(this.api.hap.Characteristic.Identifier, index)
                .setCharacteristic(this.api.hap.Characteristic.ConfiguredName, windowState)
                .setCharacteristic(this.api.hap.Characteristic.IsConfigured, this.api.hap.Characteristic.IsConfigured.CONFIGURED)
                .setCharacteristic(this.api.hap.Characteristic.CurrentVisibilityState, this.api.hap.Characteristic.CurrentVisibilityState.SHOWN);
            this.accessory.addService(inputSourceService);
            this.televisionService.addLinkedService(inputSourceService);
        });

        // Listen for changes to the Active Identifier characteristic
        this.televisionService.getCharacteristic(this.api.hap.Characteristic.ActiveIdentifier)
            .on('set', (value, callback) => {
                // Get the selected window state
                const selectedWindowState = Array.from(windowActionStates.keys())[value as number];
                // Get the command for the selected window state
                const command = windowActionStates.get(selectedWindowState)?.action;
                // Send the command to the device
                this.device.setDeviceParams({ openclose: { 0: command } }, (err, response) => {
                    if (err) {
                        this.log.error('Failed to set device params:', err);
                        return;
                    }
                    this.log.info('Set device params response:', response);
                    // Update the window state
                    this.sharedState.windowState = windowActionStates.get(selectedWindowState)?.state;
                    callback(null);
                });
            });

    }
    // Other methods related to TelevisionService

    handleWindowStateChange(newState: string) {
        // Update windowState and do something
        this.sharedState.windowState = newState;
    }

    setActiveState(newState: number) {
        this.televisionService.setCharacteristic(this.api.hap.Characteristic.Active, newState);
    }
}