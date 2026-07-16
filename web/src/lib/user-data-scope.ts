"use client";

import localforage from "localforage";

const ACTIVE_USER_KEY = "sceneflow:active_user_id";
const ANONYMOUS_SCOPE = "anonymous";

export function getActiveLocalUserId() {
    if (typeof window === "undefined") return "";
    try {
        return window.localStorage.getItem(ACTIVE_USER_KEY) || "";
    } catch {
        return "";
    }
}

export function setActiveLocalUserId(userId: string | null) {
    if (typeof window === "undefined") return false;
    const previous = getActiveLocalUserId();
    try {
        if (userId) window.localStorage.setItem(ACTIVE_USER_KEY, userId);
        else window.localStorage.removeItem(ACTIVE_USER_KEY);
    } catch {
        return false;
    }
    return previous !== (userId || "");
}

export function scopedStorageKey(key: string) {
    const userId = getActiveLocalUserId() || ANONYMOUS_SCOPE;
    return `${key}:${userId}`;
}

export function scopedStoreName(storeName: string) {
    const userId = getActiveLocalUserId() || ANONYMOUS_SCOPE;
    return `${storeName}_${userId.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
}

export function createScopedLocalForageStore(storeName: string) {
    return localforage.createInstance({ name: "infinite-canvas", storeName: scopedStoreName(storeName) });
}

export function isAuthPage() {
    if (typeof window === "undefined") return false;
    return window.location.pathname.includes("/login") || window.location.pathname.includes("/register");
}
