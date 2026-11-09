import { createStore, del, get, set, type UseStore } from "idb-keyval";
import type { Side } from "@/lib/schemas";

/**
 * Photos stay on the customer's phone (IndexedDB) until they consent and submit.
 * This also survives the browser reloading the tab after the camera app was open.
 */

let store: UseStore | null = null;
const db = () => (store ??= createStore("zf-entretien", "photos"));

export const savePhotoLocally = (side: Side, blob: Blob) => set(side, blob, db());
export const loadPhotoLocally = (side: Side) => get<Blob>(side, db());
export const deletePhotoLocally = (side: Side) => del(side, db());
