import {getLogger} from "../core";
import React, {useCallback, useEffect, useState} from "react";
import {login as loginApi} from "./authApi"
import {Preferences} from "@capacitor/preferences";

const log = getLogger("AuthProvider");

type LoginFn = (username?: string, password?: string) => void;
type LogoutFn = () => void;

export interface AuthState{
    authenticationError: Error | null;
    isAuthenticated: boolean;
    isAuthenticating: boolean;
    login?: LoginFn;
    pendingAuthentication?: boolean;
    username?: string;
    password?: string;
    token: string;
    logout?: LogoutFn;
}

const initialState: AuthState = {
    isAuthenticated: false,
    isAuthenticating: false,
    authenticationError: null,
    pendingAuthentication: false,
    token: '',
}

export const AuthContext = React.createContext<AuthState>(initialState);

interface AuthProviderProps {
    children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [state, setState] = useState<AuthState>(initialState);
    const { isAuthenticated, isAuthenticating, authenticationError, pendingAuthentication, token } = state;
    const login = useCallback<LoginFn>(loginCallback, []);
    const logout = useCallback<LogoutFn>(logoutCallback, []);
    useEffect(authenticationEffect, [pendingAuthentication]);
    useEffect(() => {
        //const storedToken = localStorage.getItem("token");
        const loadToken = async () => {
            const { value } = await Preferences.get({key: 'token'});
            if (value){
                setState(prev => ({
                    ...prev,
                    token: value,
                    isAuthenticated: true,
                }))
            }
        }
        loadToken();
    },[]);
    /*
    useEffect(() => {
        const handleStorageChange = (event: StorageEvent) => {
            if (event.key === 'token') {
                const newToken = event.newValue;
                setState(prev => ({
                    ...prev,
                    token: newToken || '',
                    isAuthenticated: !!newToken
                }));
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);*/


    const value = { isAuthenticated, login, isAuthenticating, authenticationError, token, logout };
    log('render');
    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );

    function logoutCallback () {
        Preferences.remove({ key: 'token' }).then(() => {
            setState({ ...initialState });
        });
    }

    function loginCallback(username?: string, password?: string): void {
        log('login');
        setState({
            ...state,
            pendingAuthentication: true,
            username,
            password
        });
    }

    function authenticationEffect() {
        let canceled = false;
        authenticate();
        return () => {
            canceled = true;
        }

        async function authenticate() {
            if (!pendingAuthentication) {
                log('authenticate, !pendingAuthentication, return');
                return;
            }
            try {
                log('authenticate...');
                setState({
                    ...state,
                    isAuthenticating: true,
                });
                const { username, password } = state;
                const { token } = await loginApi(username, password);
                if (canceled) {
                    return;
                }
                log('authenticate succeeded');
                await Preferences.set({key: 'token', value: token});
                setState({
                    ...state,
                    token,
                    pendingAuthentication: false,
                    isAuthenticated: true,
                    isAuthenticating: false,
                });
            } catch (error) {
                if (canceled) {
                    return;
                }
                log('authenticate failed');
                setState({
                    ...state,
                    authenticationError: error as Error,
                    pendingAuthentication: false,
                    isAuthenticating: false,
                });
            }
        }
    }
}