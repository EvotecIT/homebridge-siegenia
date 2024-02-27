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


        // Define your window states in the order you want them to appear
        const windowStatesOrder = ['Moving', 'Open', 'Stop Over', 'Close No Lock', 'Gap', 'Close', 'Closed', 'Stopped'];

        // Define your window states
        const windowStates = {
            'Moving': 'MOVING',
            'Open': 'OPEN',
            'Gap': 'GAP_VENT',
            'Stop Over': 'STOP_OVER',
            'Close No Lock': 'CLOSE_WO_LOCK',
            'Close': 'CLOSE',
            'Stopped': 'STOPPED',
            'Closed': 'CLOSED',
        };


        // Add each window state as an input source to the Television service in the order defined in windowStatesOrder
        windowStatesOrder.forEach((windowState, index) => {
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
                const selectedWindowState = Object.keys(windowStates)[value as number];

                // Get the command for the selected window state
                const command = windowStates[selectedWindowState];

                // Send the command to the device
                this.device.setDeviceParams({ openclose: { 0: command } }, (err, response) => {
                    if (err) {
                        this.log.error('Failed to set device params:', err);
                        return;
                    }

                    this.log.info('Set device params response:', response);

                    // Update the window state
                    sharedState.windowState = command;

                    // Wait for 5 seconds before switching back to the current input
                    setTimeout(() => {
                        if (this.sharedState.windowState) {
                            const currentInput = Object.keys(windowStates).indexOf(this.sharedState.windowState);
                            this.televisionService.setCharacteristic(this.api.hap.Characteristic.ActiveIdentifier, currentInput);
                        }
                    }, 5000); // Delay of 5 seconds

                });

                callback(null);
            });
        // Initialize windowState

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