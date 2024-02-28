import { API, Logger, PlatformAccessory, PlatformConfig, Service } from 'homebridge';
import { SiegeniaPlatform } from './platform';
import { SiegeniaDevice } from './siegeniaDevice';
import { SharedState } from './sharedState';

export class TelevisionService {
    private readonly televisionService: Service;
    private readonly windowActionStates: Map<string, { action: string, state: string }>;

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
        // Implement your TelevisionService here
        // Create a new Television service
        this.televisionService = new this.api.hap.Service.Television();

        // Add the Television service to the accessory
        this.accessory.addService(this.televisionService);

        // Set the service name
        this.windowActionStates = new Map([
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
        Array.from(this.windowActionStates.keys()).forEach((windowState, index) => {
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
                const selectedWindowState = Array.from(this.windowActionStates.keys())[value as number];
                // Get the command for the selected window state
                const command = this.windowActionStates.get(selectedWindowState)?.action;
                // Send the command to the device
                this.device.setDeviceParams({ openclose: { 0: command } }, (err, response) => {
                    if (err) {
                        this.log.error('Failed to set device params:', err);
                        return;
                    }
                    this.log.info('Set device params response:', response);
                    // Update the window state
                    this.sharedState.windowState = this.windowActionStates.get(selectedWindowState)?.state;
                    callback(null);
                });
            });

    }

    handleWindowStateChange(newState: string) {
        // Update windowState and do something
        this.sharedState.windowState = newState;
    }

    setActiveState(newState: number) {
        this.televisionService.setCharacteristic(this.api.hap.Characteristic.Active, newState);
    }
}