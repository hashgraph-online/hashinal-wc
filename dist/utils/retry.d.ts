export declare const retry: <T>(callback: () => Promise<T>) => Promise<any>;
export declare const fetchWithRetry: (input: string | Request | URL, init?: import("fetch-retry").RequestInitWithRetry<typeof fetch>) => Promise<Response>;
