// frontend/src/sqljs.d.ts OR frontend/src/types/sqljs.d.ts

// Declare the specific module path you are importing
declare module 'sql.js/dist/sql-wasm.js' {
    // You can provide more specific types here if you know them,
    // but exporting 'any' is often sufficient to satisfy the import.
    // Or look at the main @types/sql.js for the actual 'initSqlJs' type.

    // Let's try defining the expected default export shape:
    export interface SqlJsConfig {
        locateFile?: (file: string) => string;
        // Add other config options if needed based on sql.js documentation
    }

    export interface Database {
        exec(sql: string): any[]; // Adjust 'any' if you know the result structure better
        run(sql: string, params?: any[] | Record<string, any>): this;
        export(): Uint8Array;
        close(): void;
        // Add other methods you use like prepare, getRowsModified, etc.
    }

    export interface SqlJsStatic {
        Database: new (data?: Uint8Array | null) => Database;
        // Add other static properties if needed
    }

    // Define the function signature for the default export
    const initSqlJs: (config?: SqlJsConfig) => Promise<SqlJsStatic>;

    export default initSqlJs;
}