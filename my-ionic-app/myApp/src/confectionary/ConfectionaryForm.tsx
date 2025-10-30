import {
    IonPage,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonItem,
    IonLabel,
    IonInput,
    IonSelect,
    IonSelectOption,
    IonDatetime,
    IonButton
} from '@ionic/react';
import React, {useCallback, useContext, useEffect, useState} from 'react';
import {RouteComponentProps} from "react-router";
import {ConfectionaryProps} from "./ConfectionaryProps";
import {ConfectionaryContext} from "./ConfectionaryProvider";
import {getLogger} from "../core";
import {useNetwork} from "./useNetwork";

interface ConfectionaryEditProps extends RouteComponentProps<{
    id?: string;
}> {}

const log = getLogger("ConfectionaryForm");

const ConfectionaryForm: React.FC<ConfectionaryEditProps> = ({history, match}) => {

    const {confectionaries, saving, savingError, saveConfectionary} = useContext(ConfectionaryContext);
    const [name, setName] = useState('');
    const [date, setDate] = useState('');
    const [inCluj, setInCluj] = useState(true);
    const [rating, setRating] = useState('');
    const [confectionary, setConfectionary] = useState<ConfectionaryProps>();

    const {networkStatus} = useNetwork();

    const resetFields = () =>{
        setName('');
        setDate('');
        setInCluj(true);
        setRating('');
        history.push('/confectionary');
    }

    useEffect(() => {
        log("useEffect");
        const routeId = match.params.id !== undefined ? match.params.id : '';
        const confectionary = confectionaries?.find(c => c._id && c._id.toString() === routeId);
        setConfectionary(confectionary);
        if (confectionary){
            setName(confectionary.name);
            setDate(new Date(confectionary.date).toISOString());
            setInCluj(confectionary.inCluj);
            setRating(confectionary.rating.toString());
        }
    }, [match.params.id, confectionaries]);

    /*
    const save = useCallback(() => {
        const editedConfectionary = confectionary ? {... confectionary, name: name, date:new Date(date), inCluj: inCluj, rating: parseInt(rating) }
            : {name: name, date: new Date(date), inCluj: inCluj, rating: parseInt(rating)};
        saveConfectionary && saveConfectionary(editedConfectionary).then(() => history.push('/confectionaries'));
    }, [confectionary, saveConfectionary, name, date, inCluj, rating, history]);
 */
    const save = useCallback(async () => {
        const edited: ConfectionaryProps = confectionary
            ? {...confectionary, name, date: new Date(date), inCluj, rating: parseInt(rating)}
            : {name, date: new Date(date), inCluj, rating: parseInt(rating)};

        try {
            await saveConfectionary?.(edited);
            if (!networkStatus.connected) {
                alert("📦 Item salvat local — va fi sincronizat când revii online.");
            }
            history.push('/confectionaries');
        } catch (error) {
            alert(`❗Error: ${error}`);
            history.push('/confectionaries');
        }
    }, [confectionary, saveConfectionary, name, date, inCluj, rating, networkStatus.connected, history]);

    log("render");
    return (
        <IonPage>
            <IonHeader>
                <IonToolbar>
                    <IonTitle>Confectionary Details</IonTitle>
                </IonToolbar>
            </IonHeader>

            <IonContent className="ion-padding">
                    <IonItem>
                        <IonLabel position="stacked">Name</IonLabel>
                        <IonInput value={name} onIonChange={e => setName(e.detail.value!)} required />
                    </IonItem>

                    <IonItem>
                        <IonLabel position="stacked">Data</IonLabel>
                        <IonDatetime value={date} onIonChange={e => setDate(e.detail.value! as string)} />
                    </IonItem>

                    <IonItem>
                        <IonLabel position="stacked">In Cluj</IonLabel>
                        <IonSelect value={inCluj} onIonChange={e => setInCluj(e.detail.value)}>
                            <IonSelectOption value={true}>Da</IonSelectOption>
                            <IonSelectOption value={false}>Nu</IonSelectOption>
                        </IonSelect>
                    </IonItem>

                    <IonItem>
                        <IonLabel position="stacked">Rating</IonLabel>
                        <IonInput type="number" value={rating} min={0} max={5} onIonChange={e => setRating(e.detail.value!)} />
                    </IonItem>

                    <IonButton expand="block" type="submit" className="ion-margin-top" onClick={save}>
                        SAVE
                    </IonButton>
            </IonContent>
        </IonPage>
    );
};

export default ConfectionaryForm;
