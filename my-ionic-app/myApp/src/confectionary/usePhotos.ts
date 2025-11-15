import {useEffect, useState} from "react";
import {useCamera} from "./useCamera";
import {useFilesystem} from "./useFilesystem";
import {usePreferences} from "./usePreferences";

export interface MyPhoto {
    filepath: string;
    webviewPath?: string;
}

const PHOTOS = 'photos';

export function usePhotos(){
    const [photos, setPhotos] = useState<MyPhoto[]>([]);
    const { getPhoto } = useCamera();
    const { readFile, writeFile, deleteFile } = useFilesystem();
    const { get, set } = usePreferences();

    useEffect(loadPhotos, [get, readFile, setPhotos]);
    return {
        photos,
        setPhotos,
        takePhoto,
        deletePhoto,
    };

    async function takePhoto(){
        const data = await getPhoto();
        const filepath = new Date().getTime() + ".jpeg";
        await writeFile(filepath, data.base64String!);
        const webviewPath = `data:image/jpeg;base64,${data.base64String}`;
        const newPhoto = { filepath, webviewPath };
        const newPhotos = [newPhoto, ...photos];
        await set(PHOTOS, JSON.stringify(newPhotos));
        setPhotos(newPhotos);
        return newPhoto;
    }

    async function deletePhoto(photo: MyPhoto){
        const newPhotos = photos.filter(p => p.filepath !== photo.filepath);
        await set(PHOTOS, JSON.stringify(newPhotos));
        await deleteFile(photo.filepath);
        setPhotos(newPhotos);
    }

    function loadPhotos(){
        loadSavedPhotos();

        async function loadSavedPhotos() {
            const savedPhotoString = await get(PHOTOS);
            const savedPhotos = (savedPhotoString ? JSON.parse(savedPhotoString) : []) as MyPhoto[];
            for (let photo of savedPhotos) {
                if (!photo.webviewPath) {
                    try {
                        const data = await readFile(photo.filepath);
                        photo.webviewPath = `data:image/jpeg;base64,${data}`;
                    } catch (err) {
                        console.warn("Nu am putut citi fișierul:", photo.filepath, err);
                    }
                }
            }
            setPhotos(savedPhotos);
        }

    }
}