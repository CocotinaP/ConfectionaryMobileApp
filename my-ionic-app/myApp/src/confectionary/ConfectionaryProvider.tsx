import {getLogger} from "../core";
import {ConfectionaryProps} from "./ConfectionaryProps";
import React, {useCallback, useContext, useEffect, useReducer, useState} from "react";
import {
    createConfectionary,
    deleteConfectionaryApi,
    getConfectionaries,
    newWebSocket,
    updateConfectionary
} from "./confectionaryApi";
import {AuthContext} from "../auth";
import {useNetwork} from "./useNetwork";
import {Preferences} from "@capacitor/preferences";
import {Network} from "@capacitor/network";

const log = getLogger("ItemProvider");

type SaveConfectionaryFn = (confectionary: ConfectionaryProps) => Promise<any>;
type DeleteConfectionaryFn = (confectionaryId: string) => Promise<any>;

export interface ConfectionariesState {
    confectionaries?: ConfectionaryProps[],
    fetching: boolean,
    fetchingError?: Error | null,
    saving: boolean,
    savingError?: Error | null,
    deleting: boolean,
    deletingError?: Error | null,
    saveConfectionary?: SaveConfectionaryFn,
    deleteConfectionary?: DeleteConfectionaryFn,
    offlineCount?: number,
}

interface ActionProps{
    type: string,
    payload?: any,
}

const initialState: ConfectionariesState = {
    fetching: false,
    saving: false,
    deleting: false,
    offlineCount: 0,
}

const FETCH_CONFECTIONARIES_STARTED = 'FETCH_CONFECTIONARIES_STARTED';
const FETCH_CONFECTIONARIES_SUCCEEDED = 'FETCH_CONFECTIONARIES_SUCCEEDED';
const FETCH_CONFECTIONARIES_FAILED = 'FETCH_CONFECTIONARIES_FAILED';
const SAVE_CONFECTIONARIES_STARTED = 'SAVE_CONFECTIONARIES_STARTED';
const SAVE_CONFECTIONARIES_SUCCEEDED = 'SAVE_CONFECTIONARIES_SUCCEEDED';
const SAVE_CONFECTIONARIES_FAILED = 'SAVE_CONFECTIONARIES_FAILED';
const DELETE_CONFECTIONARY_STARTED = 'DELETE_CONFECTIONARY_STARTED';
const DELETE_CONFECTIONARY_SUCCEEDED = 'DELETE_CONFECTIONARY_SUCCEEDED';
const DELETE_CONFECTIONARY_FAILED = 'DELETE_CONFECTIONARY_FAILED';
const SAVE_CONFECTIONARY_OFFLINE = 'SAVE_CONFECTIONARY_OFFLINE';
const UPDATE_OFFLINE_COUNT = 'UPDATE_OFFLINE_COUNT';
const REMOVE_LOCAL_ITEM = 'REMOVE_LOCAL_ITEM';


const reducer: (state: ConfectionariesState, action: ActionProps) => ConfectionariesState =
    (state, { type, payload }) => {
        console.log("Reducer action:", type, "Payload:", payload);
        switch(type) {
            case FETCH_CONFECTIONARIES_STARTED:
                return {...state, fetching: true};
            case FETCH_CONFECTIONARIES_SUCCEEDED:
                return {...state, confectionaries: payload.confectionaries, fetching: false};
            case FETCH_CONFECTIONARIES_FAILED:
                return {...state, fetchingError: payload.error, fetching: false};
            case SAVE_CONFECTIONARIES_STARTED:
                return {...state, savingError: null, saving: true};
            case SAVE_CONFECTIONARIES_SUCCEEDED:
                const confectionaries = [...(state.confectionaries || [])];
                const confectionary = payload.confectionary;
                const index = confectionaries.findIndex(c => c._id === confectionary._id);
                if (index === -1) {
                    confectionaries.splice(0, 0, confectionary);
                } else {
                    confectionaries[index] = confectionary;
                }
                return {...state, confectionaries, saving: false};
            case SAVE_CONFECTIONARIES_FAILED:
                return {...state, savingError: payload.error, fetching: false};
            case DELETE_CONFECTIONARY_STARTED:
                return {...state, deletingError: null, deleting: true};
            case DELETE_CONFECTIONARY_SUCCEEDED:
                const id = payload.id;
                return {...state,
                    confectionaries: (state.confectionaries || []).filter(c => c._id !== id), deleting: false};
            case DELETE_CONFECTIONARY_FAILED:
                return {...state, deletingError: payload.error, fetching: false};
            case 'SAVE_CONFECTIONARY_OFFLINE':
                return {
                    ...state,
                    confectionaries: [...(state.confectionaries || []), payload.confectionary]
                };
            case UPDATE_OFFLINE_COUNT:
                return {...state, offlineCount: payload.count};
            case REMOVE_LOCAL_ITEM:
                return {
                    ...state,
                    confectionaries: (state.confectionaries || []).filter(c => c.localId !== payload.localId)
                };

            default:
                return state;
        }
    };

export const ConfectionaryContext = React.createContext<ConfectionariesState>(initialState);

interface ConfectionaryProviderProps {
    children: React.ReactNode,
}

export const ConfectionaryProvider: React.FC<ConfectionaryProviderProps> = ({children}) => {
    const [state, dispatch] = useReducer(reducer, initialState);
    const { token } = useContext(AuthContext);
    const {networkStatus} = useNetwork();
    const isOnline = networkStatus.connected;
    const { confectionaries, fetching, fetchingError, saving, savingError, deleting, deletingError } = state;

    const saveConfectionary = useCallback<SaveConfectionaryFn>(saveConfectionariesCallback, [token]);
    const deleteConfectionary = useCallback<DeleteConfectionaryFn>(deleteConfectionaryCallback, [token]);

    const value = {confectionaries, fetching, fetchingError, saving, savingError, deleting, deletingError, saveConfectionary, deleteConfectionary};

    useEffect(getConfectionariesEffect, [token]);
    useEffect(wsEffect, [token]);
    useEffect(() => {
        if (isOnline){
            syncOfflineItems();
        } else {
            checkOfflineCount();
        }
    }, [isOnline]);

    async function checkOfflineCount() {
        const {value} = await Preferences.get({key: 'offlineItems'});
        const items = value ? JSON.parse(value) : [];
        dispatch({type: UPDATE_OFFLINE_COUNT, payload: {count: items.length}});
    }

    async function syncOfflineItems() {
        // Sincronizare ștergeri
        const { value: deleteValue } = await Preferences.get({ key: 'offlineDeletes' });
        const deleteIds: string[] = deleteValue ? JSON.parse(deleteValue) : [];
        const remainingDeletes: string[] = [];

        for (const id of deleteIds) {
            try {
                await deleteConfectionaryApi(token, id);
                dispatch({ type: DELETE_CONFECTIONARY_SUCCEEDED, payload: { id } });
            } catch (e) {
                log("Sync delete failed for id:", id);
                remainingDeletes.push(id);
            }
        }

        if (remainingDeletes.length === 0) {
            await Preferences.remove({ key: 'offlineDeletes' });
        } else {
            await Preferences.set({ key: 'offlineDeletes', value: JSON.stringify(remainingDeletes) });
        }

        const { value } = await Preferences.get({ key: 'offlineItems' });
        const items: ConfectionaryProps[] = value ? JSON.parse(value) : [];

        if (!token || items.length === 0) {
            // 🔄 Reîncarcă lista de pe server chiar dacă nu sunt elemente offline
            fetchConfectionaries(token, dispatch);
            return;
        }

        const remaining: ConfectionaryProps[] = [];

        for (const item of items) {
            try {
                const { localId, ...payload } = item;
                const saved = await createConfectionary(token, payload);

                dispatch({ type: REMOVE_LOCAL_ITEM, payload: { localId } });
                dispatch({ type: SAVE_CONFECTIONARIES_SUCCEEDED, payload: { confectionary: saved } });
            } catch (e) {
                remaining.push(item);
            }
        }

        if (remaining.length === 0) {
            await Preferences.remove({ key: 'offlineItems' });
            dispatch({ type: UPDATE_OFFLINE_COUNT, payload: { count: 0 } });
        } else {
            await Preferences.set({ key: 'offlineItems', value: JSON.stringify(remaining) });
            dispatch({ type: UPDATE_OFFLINE_COUNT, payload: { count: remaining.length } });
        }

        fetchConfectionaries(token, dispatch);
    }



    log(`returns -fetching = ${fetching}, items = ${JSON.stringify(confectionaries)}`);
    return (
        <ConfectionaryContext.Provider value={value}>
            {children}
        </ConfectionaryContext.Provider>
    );

    function getConfectionariesEffect() {
        //let canceled = false;
        if (token) {
            return fetchConfectionaries(token, dispatch);
        }
        return () => {};

        /*
        async function fetchConfectionaries() {
            try {
                log("fetchConfectionaries started");
                dispatch({type: FETCH_CONFECTIONARIES_STARTED});
                const confectionaries = await getConfectionaries(token);
                log("fetchConfectionaries succeeded");
                if (!canceled) {
                    dispatch({type: FETCH_CONFECTIONARIES_SUCCEEDED, payload: { confectionaries }});
                }
            } catch (error) {
                log("fetchConfectionaries failed");
                if (!canceled) {
                    dispatch({type: FETCH_CONFECTIONARIES_FAILED, payload: { error }});
                }
            }
        }*/
    }

    function fetchConfectionaries(token: string, dispatch: React.Dispatch<ActionProps>) {
        let canceled = false;

        (async () => {
            try {
                log("fetchConfectionaries started");
                dispatch({type: FETCH_CONFECTIONARIES_STARTED});
                const confectionaries = await getConfectionaries(token);
                log("fetchConfectionaries succeeded");
                if (!canceled) {
                    dispatch({type: FETCH_CONFECTIONARIES_SUCCEEDED, payload: { confectionaries }});
                }
            } catch (error) {
                log("fetchConfectionaries failed");
                if (!canceled) {
                    dispatch({type: FETCH_CONFECTIONARIES_FAILED, payload: { error }});
                }
            }
        })();

        return () => {
            canceled = true;
        };
    }


    async function storeOfflineItem(localItem: ConfectionaryProps) {
        const { value } = await Preferences.get({ key: 'offlineItems' });
        const items = value ? JSON.parse(value) : [];
        items.push(localItem);
        await Preferences.set({ key: 'offlineItems', value: JSON.stringify(items) });
        dispatch({ type: UPDATE_OFFLINE_COUNT, payload: { count: items.length } });
    }


    async function saveConfectionariesCallback(confectionary: ConfectionaryProps) {
        dispatch({ type: SAVE_CONFECTIONARIES_STARTED });

        const status = await Network.getStatus();

        if (!status.connected) {
            log("Offline — storing locally");
            const localItem = { ...confectionary, localId: Date.now() };
            await storeOfflineItem(localItem);
            dispatch({
                type: SAVE_CONFECTIONARY_OFFLINE,
                payload: { confectionary: localItem },
            });
            return;
        }

        try {
            log("Online — attempting save");
            const savedConfectionary = await (confectionary._id
                ? updateConfectionary(token, confectionary)
                : createConfectionary(token, confectionary));
            dispatch({
                type: SAVE_CONFECTIONARIES_SUCCEEDED,
                payload: { confectionary: savedConfectionary },
            });
        } catch (error) {
            const fallbackStatus = await Network.getStatus();
            if (!fallbackStatus.connected) {
                log("Save failed — offline fallback");
                const localItem = { ...confectionary, localId: Date.now() };
                await storeOfflineItem(localItem);
                dispatch({
                    type: SAVE_CONFECTIONARY_OFFLINE,
                    payload: { confectionary: localItem },
                });
            } else {
                log("Save failed — network error");
                dispatch({
                    type: SAVE_CONFECTIONARIES_FAILED,
                    payload: { error },
                });
            }
        }
    }



    async function deleteLocalOffline(localId: number) {
        log("Deleting local-only item");

        // Elimină din state
        dispatch({ type: REMOVE_LOCAL_ITEM, payload: { localId } });

        // Elimină din Preferences
        const { value } = await Preferences.get({ key: 'offlineItems' });
        const items = value ? JSON.parse(value) : [];
        const filtered = items.filter((item: ConfectionaryProps) => item.localId !== localId);
        await Preferences.set({ key: 'offlineItems', value: JSON.stringify(filtered) });

        // Actualizează numărul de elemente offline
        dispatch({ type: UPDATE_OFFLINE_COUNT, payload: { count: filtered.length } });
    }


    /*
    async function deleteConfectionaryCallback(id: string) {
        const normalizedId = id.trim();

        // Caută itemul în state
        const item = state.confectionaries?.find(c =>
            c._id?.trim() === normalizedId || c.localId?.toString().trim() === normalizedId
        );

        if (!item) {
            log("Item not found — nothing to delete:", normalizedId);
            return;
        }

        // 🔁 Dacă itemul nu are _id → e local → ștergere locală
        if (!item._id && item.localId) {
            log("Offline item — deleting locally");
            await deleteLocalOffline(item.localId);
            dispatch({
                type: DELETE_CONFECTIONARY_SUCCEEDED,
                payload: { id: item.localId.toString() },
            });
            return;
        }

        // 🔁 Verificare rețea în timp real
        const status = await Network.getStatus();
        if (!status.connected) {
            log("Offline — storing delete request for later");
            await storeOfflineDelete(id);
            dispatch({
                type: DELETE_CONFECTIONARY_SUCCEEDED,
                payload: { id },
            });
            return;
        }

        // 🔁 Cerere către server
        try {
            log("Online — attempting server delete");
            await deleteConfectionaryApi(token, id);
            log("Server delete succeeded");
            dispatch({
                type: DELETE_CONFECTIONARY_SUCCEEDED,
                payload: { id },
            });
        } catch (error) {
            log("Server delete failed", error);

            // 🔁 Fallback: verificăm din nou dacă suntem offline
            const fallbackStatus = await Network.getStatus();
            if (!fallbackStatus.connected) {
                log("Offline fallback — deleting locally");

                if (item.localId) {
                    await deleteLocalOffline(item.localId);
                    dispatch({
                        type: DELETE_CONFECTIONARY_SUCCEEDED,
                        payload: { id: item.localId.toString() },
                    });
                } else {
                    await storeOfflineDelete(id);
                    dispatch({
                        type: DELETE_CONFECTIONARY_SUCCEEDED,
                        payload: { id },
                    });
                }
            } else {
                dispatch({
                    type: DELETE_CONFECTIONARY_FAILED,
                    payload: { error },
                });
            }
        }
    }*/

    async function deleteConfectionaryCallback(id: string){
        try{
            log("deleteConfectionary started");
            await deleteConfectionaryApi(token, id);
            log("deleteConfectionary succeed");
            dispatch({ type: DELETE_CONFECTIONARY_SUCCEEDED, payload: {id} });
        } catch (error){
            log("deleteConfectionary failed");
            dispatch({type: DELETE_CONFECTIONARY_FAILED, payload: { error}});
        }
    }



    async function storeOfflineDelete(id: string) {
        const { value } = await Preferences.get({ key: 'offlineDeletes' });
        const deletes = value ? JSON.parse(value) : [];
        deletes.push(id);
        await Preferences.set({ key: 'offlineDeletes', value: JSON.stringify(deletes) });

        dispatch({ type: DELETE_CONFECTIONARY_SUCCEEDED, payload: { id } });
    }


    function wsEffect(){
        let canceled = false;
        log("wsEffect - connecting");
        const closeWebSocket = newWebSocket(token, message => {
            if (canceled) {
                return;
            }

            const { event, payload: {confectionary} } = message;
            log(`ws message, confectionary ${event}`);
            if (event === 'created' || event === 'updated') {
                dispatch({ type: SAVE_CONFECTIONARIES_SUCCEEDED, payload: {confectionary} });
            }
            if (event === 'deleted') {
                dispatch({ type: DELETE_CONFECTIONARY_SUCCEEDED, payload: { id: confectionary._id } });
            }

        });

        return () => {
            log("wsEffect - disconnecting");
            canceled = true;
            closeWebSocket();
        }
    }
}
