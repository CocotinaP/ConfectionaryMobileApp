import {
    IonButton,
    IonButtons,
    IonContent,
    IonFab,
    IonFabButton,
    IonHeader,
    IonIcon, IonList,
    IonLoading,
    IonPage,
    IonTitle,
    IonToolbar
} from "@ionic/react";
import Item from "./Confectionary";
import {getLogger} from "../core";
import {add, logOutOutline} from "ionicons/icons";
import React, {useContext} from "react";
import {RouteComponentProps} from "react-router";
import {ConfectionaryContext} from "./ConfectionaryProvider";
import {AuthContext} from "../auth";

const log = getLogger("ConfectionaryList");

const ConfectionaryList: React.FC<RouteComponentProps> = ({ history }) => {
    const {confectionaries, fetching, fetchingError} = useContext(ConfectionaryContext);
    const {logout} = useContext(AuthContext);

    log("render");

    return (
        <IonPage>
            <IonHeader>
                <IonToolbar>
                    <IonTitle>Confectionaries</IonTitle>
                    <IonButtons slot="end">
                        <IonButton onClick={logout}>
                            <IonIcon icon={logOutOutline} />
                        </IonButton>
                    </IonButtons>
                </IonToolbar>
            </IonHeader>
            <IonContent>
                <IonLoading isOpen={fetching} message="Fetching confectionaries"/>
                {confectionaries && (
                    <IonList>
                        {confectionaries.map((c) => <Item onEdit={() => history.push(`/confectionary/${c._id}`)} key={c._id} _id={c._id} name={c.name} date={c.date} inCluj={c.inCluj} rating={c.rating}/>)}
                    </IonList>
                )}
                {fetchingError && (
                    <div>{fetchingError.message || "Failed to fetch confectionaries."}</div>
                )}
                <IonFab vertical="bottom" horizontal="end" slot="fixed">
                    <IonFabButton onClick={() => history.push(`/confectionary`)}>
                        <IonIcon icon={add}/>
                    </IonFabButton>
                </IonFab>
            </IonContent>
        </IonPage>
    )
}

export default ConfectionaryList;