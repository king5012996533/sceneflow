import localforage from "localforage";
import type { StateStorage } from "zustand/middleware";

import { scopedStorageKey } from "@/lib/user-data-scope";

localforage.config({
    name: "infinite-canvas",
    storeName: "app_state",
});

export const localForageStorage: StateStorage = {
    getItem: async (name) => {
        if (typeof window === "undefined") return null;
        try {
            return (await localforage.getItem<string>(scopedStorageKey(name))) || null;
        } catch {
            return window.localStorage.getItem(scopedStorageKey(name));
        }
    },
    setItem: async (name, value) => {
        if (typeof window === "undefined") return;
        try {
            await localforage.setItem(scopedStorageKey(name), value);
        } catch {
            window.localStorage.setItem(scopedStorageKey(name), value);
        }
    },
    removeItem: async (name) => {
        if (typeof window === "undefined") return;
        try {
            await localforage.removeItem(scopedStorageKey(name));
        } catch {
            window.localStorage.removeItem(scopedStorageKey(name));
        }
    },
};
