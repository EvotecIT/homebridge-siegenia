/* eslint-disable lines-between-class-members */
/* eslint-disable indent */
import { EventEmitter } from 'events';
import ws from 'ws';

interface SiegeniaOptions {
    ip: string;
    port?: number;
    wsProtocol?: string;
    logger?: Function;
}
interface Request {
    command: string;
    params?: any;
    id?: number;
}

interface Response {
    id: number;
    status: string;
    data: any;
}

interface LoginRequest extends Request {
    user?: string;
    password?: string;
    token?: string;
    long_life?: boolean;
}

export class SiegeniaDevice extends EventEmitter {
    options: SiegeniaOptions;
    ip: string;
    port: number;
    wsProtocol: string;
    logger: Function;
    websocket: ws | null;
    requestId: number;
    awaitingResponses: any;
    responseWaitTime: number;
    reconnectTimeout: NodeJS.Timeout | null;
    wasConnected: boolean;
    heartbeatTimeout: NodeJS.Timeout | null;
    errorCounter: number;
    stop: boolean;

    constructor(options: SiegeniaOptions) {
        super();

        this.options = options || {};
        this.ip = options.ip;
        this.port = options.port || 443;
        this.wsProtocol = options.wsProtocol || 'wss';
        this.logger = options.logger || function () { };
        this.websocket = null;

        this.requestId = 1;

        this.awaitingResponses = {};
        this.responseWaitTime = 3000;

        this.reconnectTimeout = null;
        this.wasConnected = false;
        this.heartbeatTimeout = null;

        this.errorCounter = 0;
        this.stop = false;
    }
    sendRequest(command: string | Request, params: any, callback?: Function): void {
        if (typeof params === 'function') {
            callback = params;
            params = undefined;
        }
        if (!this.websocket) {
            const error = new Error('Connection not initialized');
            if (callback) {
                return callback(error);
            } else {
                throw error;
            }
        }

        const reqId = ++this.requestId;
        let req: Request;
        if (typeof command === 'string') {
            req = {
                'command': command
            };
        }
        else {
            req = command;
        }
        if (params !== undefined) {
            req.params = params;
        }
        req.id = reqId;

        if (callback) {
            this.awaitingResponses[reqId] = {};
            this.awaitingResponses[reqId].callback = callback;
            this.awaitingResponses[reqId].timeout = setTimeout(() => {
                this.logger(this.ip + ':TIMEOUT for ' + reqId);
                if (this.awaitingResponses[reqId].callback) {
                    this.awaitingResponses[reqId].callback(new Error('Timeout'));
                }
                delete this.awaitingResponses[reqId];
            }, this.responseWaitTime);
        }


        this.logger(this.ip + ': SEND: ' + JSON.stringify(req));
        this.websocket.send(JSON.stringify(req));
    }

    loginUser(user: string, password: string, callback: Function): void {
        const req: LoginRequest = {
            'command': 'login',
            'user': user,
            'password': password,
            'long_life': false
        };
        this.sendRequest(req, callback);
    }

    loginToken(token: string, callback: Function): void {
        const req: LoginRequest = {
            'command': 'login',
            'token': token
        };
        this.sendRequest(req, callback);
    }

    logout(callback: Function): void {
        this.sendRequest('logout', callback);
    }

    heartbeat(delay: number = 10000): void {
        this.heartbeatTimeout = setTimeout(() => {
            this.heartbeatTimeout = null;
            this.sendRequest('keepAlive', { 'extend_session': true }, (err, response) => {
                if (err) {
                    this.emit('error', err);
                    return;
                }
                if (response && response.status !== 'ok') {
                    this.emit('error', new Error('Response from heartbeat "' + response.status + '" is not ok'));
                    return;
                } else if (!response) {
                    this.emit('error', new Error('No response from heartbeat'));
                    return;
                }

                // Log the successful heartbeat
                console.log('Heartbeat successful', response);

                // Call the heartbeat method again to keep the session alive
                this.heartbeat(delay);
            });
        }, delay);
    }


    // // This is a simplified example and might not match your actual code
    // heartbeat(callback: Function): void {
    //     if (!this.websocket || this.websocket === null) {
    //         return;
    //     }

    //     const message = {
    //         command: 'keepAlive',
    //         params: { extend_session: true },
    //         id: 3
    //     };

    //     this.websocket.send(JSON.stringify(message), (err) => {
    //         if (err) {
    //             callback(err);
    //             return;
    //         }

    //         this.websocket.on('message', (message) => {
    //             if (typeof message !== 'string') {
    //                 return;
    //             }

    //             const response: Response = JSON.parse(message);
    //             if (response.id === message.id && response.status === 'ok') {
    //                 callback(null, response);
    //             } else {
    //                 callback(new Error(`Response from heartbeat "${response.status}" is not ok`));
    //             }
    //         });
    //     });
    // }

    getDeviceState(callback: Function): void {
        this.sendRequest('getDeviceState', callback);
    }

    resetDevice(callback: Function): void {
        this.sendRequest('resetDevice', callback);
    }

    rebootDevice(callback: Function): void {
        this.sendRequest('rebootDevice', callback);
    }

    renewCert(callback: Function): void {
        this.sendRequest('renewCert', callback);
    }

    getDeviceInfo(callback: Function): void {
        this.sendRequest('getDevice', callback);
    }

    getDeviceParams(callback: Function): void {
        this.sendRequest('getDeviceParams', callback);
    }

    setDeviceParams(params: any, callback: Function): void {
        this.sendRequest('setDeviceParams', params, callback);
    }

    getDeviceDetails(callback: Function): void {
        this.sendRequest('getDeviceDetails', callback);
    }

    connect(callback?: Function): void {
        if (this.websocket) {
            return callback && callback(new Error('initializeCall for Websocket, but Websocket already set, so ignore call'));
        }
        this.stop = false;
        this.websocket = new ws(this.wsProtocol + '://' + this.ip + ':' + this.port + '/WebSocket', {
            rejectUnauthorized: false,
            origin: this.wsProtocol + '://' + this.ip + ':' + this.port
        });
        this.websocket.on('open', () => {
            this.logger(this.ip + ': Websocket Open for Session, starting heartbeat');
            this.heartbeat(5000);
            if (!this.wasConnected) {
                this.wasConnected = true;
                this.emit('connected');
            }
            else {
                this.emit('reconnected');
            }
            callback && callback();
        });
        this.websocket.on('close', (code, reason) => {
            this.logger(this.ip + ': Websocket Close ' + code + ': ' + reason);
            this.websocket = null;
            this.errorCounter++;
            if (this.heartbeatTimeout) {
                clearTimeout(this.heartbeatTimeout);
                this.heartbeatTimeout = null;
            }
            if (!this.stop) {
                let reconnectDelay = this.errorCounter * 5 + 5;
                if (reconnectDelay > 60) reconnectDelay = 60;
                this.logger(this.ip + ': Reconnect in ' + reconnectDelay + 's');
                this.reconnectTimeout = setTimeout(() => {
                    this.logger(this.ip + ': Reconnect ... (' + this.errorCounter + ')');
                    this.reconnectTimeout = null;
                    this.connect();
                }, reconnectDelay * 1000);
            }
            this.emit('closed', code, reason);
        });
        this.websocket.on('error', (error) => {
            this.logger(this.ip + ': Websocket Error ' + error);
            this.emit('error', error);
        });
        this.websocket.on('message', (message) => {
            this.logger(this.ip + ': RECEIVE: ' + message);
            let msg;
            try {
                msg = JSON.parse(message.toString());
            } catch (e) {
                this.logger(this.ip + ': Error parsing message ' + message);
                return;
            }
            if (msg.id && this.awaitingResponses[msg.id]) {
                if (this.awaitingResponses[msg.id].timeout) {
                    clearTimeout(this.awaitingResponses[msg.id].timeout);
                }
                if (this.awaitingResponses[msg.id].callback) {
                    // Call the callback with the response from the server
                    this.awaitingResponses[msg.id].callback(null, msg);
                }
                delete this.awaitingResponses[msg.id];
            } else {
                this.emit('message', msg);
            }
        });
    }

    disconnect(): void {
        this.stop = true;
        if (this.websocket) {
            this.websocket.close();
            this.websocket = null;
        }
        if (this.heartbeatTimeout) {
            clearTimeout(this.heartbeatTimeout);
            this.heartbeatTimeout = null;
        }
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }
    }
}