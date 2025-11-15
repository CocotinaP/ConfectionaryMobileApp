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
    IonButton, IonImg, IonFab, IonFabButton, IonIcon, IonActionSheet
} from '@ionic/react';
import React, {useCallback, useContext, useEffect, useState} from 'react';
import {RouteComponentProps} from "react-router";
import {ConfectionaryProps} from "./ConfectionaryProps";
import {ConfectionaryContext} from "./ConfectionaryProvider";
import {getLogger} from "../core";
import {useNetwork} from "./useNetwork";
import {MyPhoto, usePhotos} from "./usePhotos";
import {camera, trash, close} from "ionicons/icons";
import {useFilesystem} from "./useFilesystem";
import {usePreferences} from "./usePreferences";
import {Filesystem} from "@capacitor/filesystem";

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
    const { photos, setPhotos, takePhoto, deletePhoto } = usePhotos();
    const [photoToEdit, setPhotoToEdit] = useState<MyPhoto>();
    const { readFile } = useFilesystem();
    const [photo, setPhoto] = useState<MyPhoto | undefined>();
    const { get } = usePreferences();
    const [localPhoto, setLocalPhoto] = useState<MyPhoto | undefined>();


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

    useEffect(() => {
        if (confectionary?.photoPath) {
            const webviewPath = `http://localhost:3000${confectionary.photoPath}`;
            setPhoto({ filepath: confectionary.photoPath, webviewPath });
            setPhotos([]);
        } else {
            setPhoto(undefined);
            setPhotos([]);
        }

    }, [confectionary]);



    const handleTakePhoto = async () => {
        const newPhoto = await takePhoto();
        setLocalPhoto(newPhoto);
    };



    async function uploadPhotoFromFile(photo: MyPhoto, confectionary: ConfectionaryProps) {
        let blob: Blob;

        if (photo.webviewPath?.startsWith("data:image")) {
            blob = await fetch(photo.webviewPath).then(res => res.blob());
        } else if (photo.filepath) {
            const file = await Filesystem.readFile({path: photo.filepath});
            const base64Data = file.data;
            blob = await fetch(`data:image/jpeg;base64,${base64Data}`).then(res => res.blob());
        } else {
            throw new Error("No valid photo path");
        }

        const formData = new FormData();
        formData.append("image", blob, "photo.jpeg");
        formData.append("name", confectionary.name);
        formData.append("inCluj", confectionary.inCluj.toString());
        formData.append("rating", confectionary.rating.toString());
        formData.append("date", confectionary.date.toISOString());

        const token = await get("token");

        const url = confectionary._id
            ? `http://localhost:3000/api/confectionary/upload/${confectionary._id}` // update
            : `http://localhost:3000/api/confectionary/upload`; // create

        const response = await fetch(url, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token ?? ""}`,
            },
            body: formData,
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`Upload failed: ${response.status} ${text}`);
        }

        return await response.json();
    }

    const save = useCallback(async () => {
        let photoPath = confectionary?.photoPath;

        if (photos[0]) {
            const result = await uploadPhotoFromFile(photos[0], {
                ...confectionary,
                name,
                date: new Date(date),
                inCluj,
                rating: parseInt(rating),
            });
            photoPath = result.imagePath; // backend îți returnează path‑ul
        }


        const edited: ConfectionaryProps = confectionary
            ? {
                ...confectionary,
                name,
                date: new Date(date),
                inCluj,
                rating: parseInt(rating),
                photoPath   // salvezi path‑ul primei poze
            }
            : {
                name,
                date: new Date(date),
                inCluj,
                rating: parseInt(rating),
                photoPath
            };

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
    }, [confectionary, saveConfectionary, name, date, inCluj, rating, photos, networkStatus.connected, history]);


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

                <IonItem>
                    <IonLabel position="stacked">Photo</IonLabel>
                </IonItem>

                {localPhoto ? (
                    <IonItem>
                        <IonImg src={localPhoto.webviewPath} />
                    </IonItem>
                ) : photo ? (
                    <IonItem>
                        <IonImg src={photo.webviewPath} />
                    </IonItem>
                ) : null}



                <IonFab vertical="bottom" horizontal="center" slot="fixed">
                    <IonFabButton onClick={() => handleTakePhoto()}>
                        <IonIcon icon={camera} />
                    </IonFabButton>
                </IonFab>

                <IonActionSheet
                    isOpen={!!photoToEdit}
                    buttons={[
                        {
                            text: "Replace",
                            icon: camera,
                            handler: async () => {
                                if (photoToEdit) {
                                    const newPhoto = await takePhoto();
                                    // înlocuiești poza selectată cu cea nouă
                                    deletePhoto(photoToEdit);
                                    setPhotoToEdit(undefined);
                                }
                            }
                        },
                        {
                            text: "Delete",
                            role: "destructive",
                            icon: trash,
                            handler: () => {
                                if (photoToEdit) {
                                    deletePhoto(photoToEdit);
                                    setPhotoToEdit(undefined);
                                }
                            }
                        },
                        {
                            text: "Cancel",
                            icon: close,
                            role: "cancel"
                        }
                    ]}
                    onDidDismiss={() => setPhotoToEdit(undefined)}
                />


                <IonButton expand="block" type="submit" className="ion-margin-top" onClick={save}>
                        SAVE
                </IonButton>
            </IonContent>
        </IonPage>
    );
};

export default ConfectionaryForm;
