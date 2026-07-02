export const APP_BASE_PATH = "/canvas";

export function apiPath(path: string) {
    return `${APP_BASE_PATH}${path.startsWith("/") ? path : `/${path}`}`;
}

export function publicPath(path: string) {
    return `${APP_BASE_PATH}${path.startsWith("/") ? path : `/${path}`}`;
}
