import {
    IonButton,
    IonButtons,
    IonContent,
    IonFab,
    IonFabButton,
    IonHeader,
    IonIcon, IonInfiniteScroll, IonInfiniteScrollContent, IonList,
    IonLoading,
    IonPage, IonSearchbar, IonSelect, IonSelectOption,
    IonTitle, IonToast,
    IonToolbar
} from "@ionic/react";
import Item from "./Confectionary";
import {getLogger} from "../core";
import {add, globeOutline, logOutOutline, wifiOutline} from "ionicons/icons";
import React, {useContext, useEffect, useState} from "react";
import {RouteComponentProps} from "react-router";
import {ConfectionaryContext} from "./ConfectionaryProvider";
import {AuthContext} from "../auth";
import {ConfectionaryProps} from "./ConfectionaryProps";
import {useNetwork} from "./useNetwork";
import {Preferences} from "@capacitor/preferences";

const log = getLogger("ConfectionaryList");

const ConfectionaryList: React.FC<RouteComponentProps> = ({ history }) => {
    const {confectionaries, fetching, fetchingError, offlineCount} = useContext(ConfectionaryContext);
    const {logout} = useContext(AuthContext);
    const [visibleItems, setVisibleItems] = useState<ConfectionaryProps[]>([]);
    const [page, setPage] = useState(1);
    const itemsPerPage = 4;
    const ratings = [1, 2, 3, 4, 5];
    const allFilterValue = "All";
    const [search, setSearch] = useState<string>('');
    const [filter, setFilter] = useState<number | string | undefined>(undefined);
    const [disableInfiniteScroll, setDisableInfiniteScroll] = useState<boolean>(false);
    const {networkStatus} = useNetwork();

    useEffect(() => {
        if (confectionaries && confectionaries.length > 0) {
            let filtered : ConfectionaryProps[] = [];

            if (search.trim() !== "") {
                const lowerSearch = search.toLowerCase();
                filtered = confectionaries.filter(c => c.name.toLowerCase().includes(lowerSearch));
            } else if (filter && typeof filter === "number") {
                filtered = confectionaries.filter(c => c.rating === filter);
            } else {
                filtered = confectionaries;
            }
            setVisibleItems(filtered.slice(0, itemsPerPage));
            setPage(1);
            setDisableInfiniteScroll(filtered.length <= itemsPerPage);
        }
    }, [confectionaries, filter, search]);

    async function searchNext($event: CustomEvent<void>){
        const nextPage = page + 1;
        const start = page * itemsPerPage;
        const end = start + itemsPerPage;

        let filtered : ConfectionaryProps[] = [];

        if (search.trim() !== "") {
            const lowerSearch = search.toLowerCase();
            filtered = confectionaries?.filter(c => c.name.toLowerCase().includes(lowerSearch)) || [];
        } else if (filter && typeof filter === "number") {
            filtered = confectionaries?.filter(c => c.rating === filter) || [];
        } else {
            filtered = confectionaries || [];
        }

        const nextItems = filtered?.slice(start, end) || [];

        setVisibleItems(prev => [...prev, ...nextItems]);
        setPage(nextPage);

        await ($event.target as HTMLIonInfiniteScrollElement).complete();

        if (end >= (filtered?.length || 0)){
            setDisableInfiniteScroll(true);
        }
    }

    log("render");

    return (
        <IonPage>
            <IonHeader>
                <IonToolbar>
                    <IonTitle>Confectionaries</IonTitle>
                    <IonButtons slot="end">
                        <IonIcon icon={networkStatus.connected ? wifiOutline : globeOutline} />
                        <IonButton onClick={logout}>
                            <IonIcon icon={logOutOutline} />
                        </IonButton>
                    </IonButtons>
                </IonToolbar>
            </IonHeader>
            <IonContent>
                <IonSearchbar
                    value={search}
                    debounce={500}
                    onIonInput={e => {setSearch(e.detail.value!);
                    setFilter(undefined);}}>
                </IonSearchbar>
                <IonSelect value={filter} placeholder="Select Rating" onIonChange={e => {setFilter(e.detail.value);
                setSearch('');}}>
                    <IonSelectOption key={allFilterValue} value={undefined}>{allFilterValue}</IonSelectOption>
                    {ratings.map(r => <IonSelectOption key={r} value={r}>{r}</IonSelectOption>)}
                </IonSelect>
                <IonLoading isOpen={fetching} message="Fetching confectionaries"/>
                {visibleItems && (
                    <IonList>
                        {visibleItems.map((c) => <Item onEdit={() => history.push(`/confectionary/${c._id}`)} key={c._id} _id={c._id} name={c.name} date={c.date} inCluj={c.inCluj} rating={c.rating}/>)}
                    </IonList>
                )}
                {fetchingError && (
                    <div>{fetchingError.message || "Failed to fetch confectionaries."}</div>
                )}
                <IonInfiniteScroll threshold="100px" disabled={disableInfiniteScroll}
                                   onIonInfinite={(e: CustomEvent<void>) => searchNext(e)}>
                    <IonInfiniteScrollContent
                        loadingText="Loading more good doggos...">
                    </IonInfiniteScrollContent>
                </IonInfiniteScroll>
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