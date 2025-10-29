import axios from 'axios';
import {authConfig, baseUrl, getLogger, withLogs} from "../core";
import {ConfectionaryProps} from "./ConfectionaryProps";
import {useContext} from "react";
import {AuthContext} from "../auth";

const log = getLogger("ws")

//const baseUrl = "localhost:3000";
const confectionaryUrl = `http://${baseUrl}/api/confectionary`;

interface ResponseProps<T> {
    data: T;
}

// function withLogs<T>(promise: Promise<ResponseProps<T>>, fnName: string): Promise<T> {
//     log(`${fnName} - started`);
//     return promise
//         .then(res => {
//             log(`${fnName} - succeeded`);
//             return Promise.resolve(res.data);
//         })
//         .catch(err => {
//             log(`${fnName} - failed`);
//             return Promise.reject(err);
//         });
// }

// const config = {
//     headers: {
//         'Content-Type': 'application/json'
//     }
// };

export const getConfectionaries: (token: string) => Promise<ConfectionaryProps[]> = (token) =>{
    return withLogs(axios.get(confectionaryUrl, authConfig(token)), 'getConfectionary');
}

export const createConfectionary: (token: string, confectionary: ConfectionaryProps) => Promise<ConfectionaryProps[]> = (token, confectionary) => {
    return withLogs(axios.post(confectionaryUrl, confectionary, authConfig(token)), 'createConfectionary');
}

export const updateConfectionary: (token: string, confectionary: ConfectionaryProps) => Promise<ConfectionaryProps[]> = (token, confectionary) => {
    return withLogs(axios.put(`${confectionaryUrl}/${confectionary._id}`, confectionary, authConfig(token)), 'updateConfectionary');
}

export const deleteConfectionaryApi: (token: string, id: string) => Promise<ConfectionaryProps[]> = (token, id) => {
    return withLogs(axios.delete(`${confectionaryUrl}/${id}`, authConfig(token)), 'deleteConfectionary');
}

interface MessageData {
    event: string;
    payload: {
        confectionary: ConfectionaryProps;
    };
}

export const newWebSocket = (token:string, onMessage: (data : MessageData) => void) => {
    const ws = new WebSocket(`ws://${baseUrl}`);
    ws.onopen = () => {
        log('web socket onopen');
        if (token) {
            ws.send(JSON.stringify({
                type: 'authorization',
                payload: { token }
            }));
        }
    };
    ws.onclose = () => {
        log('web socket onclose');
    };
    ws.onerror = error => {
        log('web socket onerror', error);
    };
    ws.onmessage = messageEvent => {
        log('web socket onmessage');
        onMessage(JSON.parse(messageEvent.data));
    };

    return () => {
        ws.close();
    }
}