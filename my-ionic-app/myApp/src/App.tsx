import { Redirect, Route } from 'react-router-dom';
import { IonApp, IonRouterOutlet, setupIonicReact } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';

/* Core CSS required for Ionic components to work properly */
import '@ionic/react/css/core.css';

/* Basic CSS for apps built with Ionic */
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';

/* Optional CSS utils that can be commented out */
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';

/**
 * Ionic Dark Mode
 * -----------------------------------------------------
 * For more info, please see:
 * https://ionicframework.com/docs/theming/dark-mode
 */

/* import '@ionic/react/css/palettes/dark.always.css'; */
/* import '@ionic/react/css/palettes/dark.class.css'; */
import '@ionic/react/css/palettes/dark.system.css';

/* Theme variables */
import './theme/variables.css';
import {ConfectionaryList} from "./confectionary";
import React from "react";
import {ConfectionaryProvider} from "./confectionary/ConfectionaryProvider";
import ConfectionaryForm from "./confectionary/ConfectionaryForm";
import {AuthProvider, Login, PrivateRoute} from "./auth";

setupIonicReact();

const App: React.FC = () => (
  <IonApp style={{padding: "0 20px"}}>
        <IonReactRouter>
          <IonRouterOutlet>
              <AuthProvider>
                  <Route path="/login" component={Login} exact={true} />
                  <ConfectionaryProvider>
                        <PrivateRoute path="/confectionaries" component={ConfectionaryList} exact={true}/>
                        <PrivateRoute path="/confectionary" component={ConfectionaryForm} exact={true}/>
                        <PrivateRoute path="/confectionary/:id" component={ConfectionaryForm} exact={true}/>
                  </ConfectionaryProvider>
                  <Route exact path="/" render={() => <Redirect to="/confectionaries"/>}/>
              </AuthProvider>
          </IonRouterOutlet>
        </IonReactRouter>
  </IonApp>
);

export default App;
