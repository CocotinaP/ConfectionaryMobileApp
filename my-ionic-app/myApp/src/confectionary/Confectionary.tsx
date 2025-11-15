import React, {memo, useContext} from "react";
import {getLogger} from "../core";
import {
    IonButton,
    IonCard,
    IonCardContent,
    IonCardHeader, IonFab,
    IonFabButton, IonIcon,
    IonItem,
    IonLabel,
    IonList
} from "@ionic/react";
import "./style/confectionary.css"
import {ConfectionaryProps} from "./ConfectionaryProps";
import {add} from "ionicons/icons";
import {ConfectionaryContext} from "./ConfectionaryProvider";

const log = getLogger("Confectionary");

interface ConfectionaryPropsExt extends ConfectionaryProps {
    onEdit: (id?: string) => void;
    localId?: any;
}

const Confectionary:React.FC<ConfectionaryPropsExt> = (props: ConfectionaryPropsExt) => {
    const {deleteConfectionary} = useContext(ConfectionaryContext);

    log(`render ${props.name}`);
    console.log("props received", props);
    return (
        <IonCard button={true} onClick={() => console.log(`Clicked ${props.name}`)}>
            <IonCardHeader className="card-header">
                <strong>{props.name}</strong>
            </IonCardHeader>
            <IonCardContent className="card-content">
                <IonItem lines="none" onClick={() => props.onEdit(props._id)}>
                    <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                        <IonLabel>Date: {new Date(props.date).toLocaleDateString()}📅</IonLabel>
                        <IonLabel>In Cluj: {props.inCluj ? "Yes👍" : "No👎"}</IonLabel>
                        <IonLabel>Rating: {props.rating}⭐</IonLabel>
                    </div>
                    {
                    <IonButton color="danger" expand="block" onClick={(e) => {
                        e.stopPropagation();
                        const id = props._id ?? props.localId?.toString();
                        console.log(`delete click ${id}`);
                        id && deleteConfectionary?.(id);
                    }}>
                        🗑️
                    </IonButton>}
                </IonItem>
            </IonCardContent>
        </IonCard>
    );
};

export default memo(Confectionary);