// import {getLogger} from "../core";
// import {useCallback, useEffect, useReducer, useState} from "react";
// import {ConfectionaryProps} from "./ConfectionaryProps";
// import {getConfectionaries} from "./confectionaryApi";
// import {useHistory} from "react-router";
//
// const log = getLogger("useConfectionary");
//
// export interface ConfectionariesState{
//     confectionaries?: ConfectionaryProps[],
//     fetching: boolean,
//     fetchingError?: Error,
// }
//
// export interface ConfectionariesProps extends ConfectionariesState{
//     addConfectionary: () => void,
// }
//
// interface ActionProps {
//     type: string;
//     payload?: any;
// }
//
// const initialState: ConfectionariesState = {
//     confectionaries: undefined,
//     fetching: false,
//     fetchingError: undefined,
// }
//
// const FETCH_CONFECTIONARIES_STARTED = 'FETCH_CONFECTIONARIES_STARTED';
// const FETCH_CONFECTIONARIES_SUCCEEDED = 'FETCH_CONFECTIONARIES_SUCCEEDED';
// const FETCH_CONFECTIONARIES_FAILED = 'FETCH_CONFECTIONARIES_FAILED';
//
// const reducer: (state: ConfectionariesState, action: ActionProps) => ConfectionariesState =
//     (state, { type, payload }) => {
//         switch(type) {
//             case FETCH_CONFECTIONARIES_STARTED:
//                 return { ...state, fetching: true };
//             case FETCH_CONFECTIONARIES_SUCCEEDED:
//                 return { ...state, confectionaries: payload, fetching: false };
//             case FETCH_CONFECTIONARIES_FAILED:
//                 return { ...state, fetchingError: payload.error, fetching: false };
//             default:
//                 return state;
//         }
//     };
//
// export const useConfectionary: () => ConfectionariesProps = () => {
//     const [state, dispatch] = useReducer(reducer, initialState);
//     const { confectionaries, fetching, fetchingError } = state;
//
//     const history = useHistory();
//
//     const addConfectionary = useCallback(() => {
//         history.push("/confectionary/addForm");
//     }, []);
//
//     useEffect(getConfectionariesEffect, []);
//     log(`returns -fetching = ${fetching}, items = ${JSON.stringify(confectionaries)}`);
//     return {
//         confectionaries,
//         fetching,
//         fetchingError,
//         addConfectionary,
//     }
//
//     function getConfectionariesEffect() {
//         let canceled = false;
//         fetchConfectionaries();
//         return () => {
//             canceled = true;
//         }
//
//         async function fetchConfectionaries() {
//             try {
//                 log("fetchConfectionaries started");
//                 dispatch({type: FETCH_CONFECTIONARIES_STARTED});
//                 const confectionaries = await getConfectionaries();
//                 log("fetchConfectionaries succeeded");
//                 if (!canceled) {
//                     dispatch({type: FETCH_CONFECTIONARIES_SUCCEEDED, payload: confectionaries});
//                 }
//             } catch (error) {
//                 log("fetchConfectionaries failed");
//                 if (!canceled) {
//                     dispatch({type: FETCH_CONFECTIONARIES_FAILED, payload: error});
//                 }
//             }
//         }
//     }
// };