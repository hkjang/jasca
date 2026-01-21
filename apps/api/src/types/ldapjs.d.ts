// Type declarations for ldapjs (optional dependency)
declare module 'ldapjs' {
    interface ClientOptions {
        url: string;
        tlsOptions?: object;
    }

    interface SearchOptions {
        filter: string;
        scope: string;
        attributes: string[];
    }

    interface SearchEntry {
        dn: { toString(): string };
        objectName?: string;
        object?: Record<string, any>;
        pojo?: {
            attributes?: Array<{
                type: string;
                values?: string[];
                vals?: string[];
            }>;
        };
    }

    interface SearchResult {
        on(event: 'searchEntry', callback: (entry: SearchEntry) => void): void;
        on(event: 'error', callback: (err: Error) => void): void;
        on(event: 'end', callback: () => void): void;
    }

    interface Client {
        bind(dn: string, password: string, callback: (err: Error | null) => void): void;
        unbind(callback?: (err?: Error) => void): void;
        search(base: string, options: SearchOptions, callback: (err: Error | null, res: SearchResult) => void): void;
        on(event: 'error', callback: (err: Error) => void): void;
    }

    export function createClient(options: ClientOptions): Client;
}
