export const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api';
/** Live API when VITE_USE_MOCK=false. Stays mocked by default so screens look the same without the Node server. */
export const USE_MOCK: boolean = (import.meta.env.VITE_USE_MOCK ?? 'true') !== 'false';
export const TOKEN_KEY = 'tourista.token';
export const USER_KEY = 'tourista.user';
