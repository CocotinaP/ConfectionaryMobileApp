import {getLogger} from "../core";
import React, {useContext} from "react";
import {AuthContext, AuthState} from "./AuthProvider";
import {Redirect, Route} from "react-router-dom";

const log = getLogger("Login");

export interface PrivateRouteProps{
    component: any,
    path: string,
    exact?: boolean,
}

export const PrivateRoute: React.FC<PrivateRouteProps> = ({component: Component, ...rest}) => {
    const {isAuthenticated} = useContext<AuthState>(AuthContext);
    log("render, isAuthenticated", isAuthenticated);
    return (
        <Route {...rest} render={props => {
            if (isAuthenticated) {
                return <Component {...props} />;
            }
            return <Redirect to={{pathname: "/login"}} />;
        }}></Route>
    )
}