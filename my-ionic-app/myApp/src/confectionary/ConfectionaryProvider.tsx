import {getLogger} from "../core";
import {ConfectionaryProps} from "./ConfectionaryProps";
import React, {useCallback, useContext, useEffect, useReducer} from "react";
import {
    createConfectionary,
    deleteConfectionaryApi,
    getConfectionaries,
    newWebSocket,
    updateConfectionary
} from "./confectionaryApi";
import {AuthContext} from "../auth";

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
}

interface ActionProps{
    type: string,
    payload?: any,
}

const initialState: ConfectionariesState = {
    fetching: false,
    saving: false,
    deleting: false,
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
    const { confectionaries, fetching, fetchingError, saving, savingError, deleting, deletingError } = state;

    const saveConfectionary = useCallback<SaveConfectionaryFn>(saveConfectionariesCallback, [token]);
    const deleteConfectionary = useCallback<DeleteConfectionaryFn>(deleteConfectionaryCallback, [token]);

    const value = {confectionaries, fetching, fetchingError, saving, savingError, deleting, deletingError, saveConfectionary, deleteConfectionary};

    useEffect(getConfectionariesEffect, [token]);
    useEffect(wsEffect, [token]);

    log(`returns -fetching = ${fetching}, items = ${JSON.stringify(confectionaries)}`);
    return (
        <ConfectionaryContext.Provider value={value}>
            {children}
        </ConfectionaryContext.Provider>
    );

    function getConfectionariesEffect() {
        let canceled = false;
        if (token) {
            fetchConfectionaries();
        }
        return () => {
            canceled = true;
        }

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
        }
    }

    async function saveConfectionariesCallback(confectionary: ConfectionaryProps) {
        try{
            log("saveConfectionaries started");
            dispatch({type: SAVE_CONFECTIONARIES_STARTED});
            const savedConfectionary = await (confectionary._id ? updateConfectionary(token, confectionary) : createConfectionary(token, confectionary));
            log("saveConfectionaries succeeded");
            dispatch({type: SAVE_CONFECTIONARIES_SUCCEEDED, payload: {confectionary: savedConfectionary}});
        } catch (error){
            log("saveConfectionaries failed");
            dispatch({type: SAVE_CONFECTIONARIES_FAILED, payload: { error }});
        }
    }

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
