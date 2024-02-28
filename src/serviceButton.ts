import { API, CharacteristicValue, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic, uuid, HAP } from 'homebridge';
import { SiegeniaPlatform } from './platform';
import { SiegeniaDevice } from './siegeniaDevice';
import { DeviceTypeMap } from './siegeniaMapping';
import { SiegeniaWindowAccessory } from './siegeniaWindow';
import { SharedState } from './sharedState';


export class ButtonService {
    private readonly buttonName: string;
    private stopService: Service; // "Stop" button service, allowing you to press stop during open or close scenario
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
        // Implement your ButtonService here
        // extract buttonName from config
        this.buttonName = config.buttonName || 'Siegenia Window Stop Button';

        // Check if the "Switch" service already exists
        let service = this.accessory.getServiceById(this.api.hap.Service.Switch, this.subtype);

        if (!service) {
            // If the service does not exist, add it with the subtype
            service = this.accessory.addService(this.api.hap.Service.Switch, this.buttonName, this.subtype);
        }

        // Now we know that service is not undefined, so we can assign it to stopService
        this.stopService = service;

    }
    // Other methods related to ButtonService

    updateWindowState(newState: string) {
        this.sharedState.windowState = newState;
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
        // Send the command to the device
        this.device.setDeviceParams({ stop: { 0: true } }, (err, response) => {
            if (err) {
                this.log.error('Failed to set device params:', err);
                return;
            }

            this.log.info('Set device params response:', response);
        });
    }

}