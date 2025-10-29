import {getLogger} from "../core";
import {RouteComponentProps} from "react-router";
import React, {useCallback, useContext, useEffect, useState} from "react";
import {AuthContext} from "./AuthProvider";
import {
    IonButton,
    IonContent,
    IonHeader, IonIcon,
    IonInput,
    IonItem,
    IonLoading,
    IonPage,
    IonTitle,
    IonToolbar
} from "@ionic/react";
import {eye, eyeOff} from "ionicons/icons";

const log = getLogger("Login");

interface LoginState {
    username?: string;
    password?: string;
}

export const Login: React.FC<RouteComponentProps> = ({history}) => {
    const { isAuthenticated, isAuthenticating, login, authenticationError } = useContext(AuthContext);
    const [state, setState] = useState<LoginState>({});
    const { username, password } = state;
    const [showPassword, setShowPassword] = useState(false);

    const handlePasswordChange = useCallback((e: any)=> setState({
        ...state,
        password: e.detail.value || ''
    }), [state]);

    const handleUsernameChange = useCallback((e: any) => setState({
        ...state,
        username: e.detail.value || ''
    }), [state]);

    const handleLogin = useCallback(() => {
        log('handleLogin...');
        login?.(username, password);
    }, [username, password]);
    log('render');

    useEffect(() => {
        if (isAuthenticated) {
            log('redirecting to home');
            history.push('/');
        }
    }, [isAuthenticated]);
    return (

        <IonPage>
            <IonHeader>
                <IonToolbar>
                    <IonTitle>Login</IonTitle>
                </IonToolbar>
            </IonHeader>
            <IonContent>
                <IonInput
                    placeholder="Username"
                    value={username}
                    onIonChange={handleUsernameChange}/>
                <IonItem>
                    <IonInput
                        placeholder="Password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onIonChange={handlePasswordChange}/>
                    <IonButton fill="clear" slot="end" onClick={() => setShowPassword(!showPassword)}>
                        <IonIcon icon={showPassword ? eyeOff : eye} />
                    </IonButton>
                </IonItem>
                <IonLoading isOpen={isAuthenticating}/>
                {authenticationError && (
                    <div>{authenticationError.message || 'Failed to authenticate'}</div>
                )}
                <IonButton onClick={handleLogin}>Login</IonButton>
            </IonContent>
        </IonPage>
    );
}