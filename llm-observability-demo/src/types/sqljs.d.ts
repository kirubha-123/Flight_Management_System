declare module "sql.js" {
  export interface SqlJsConfig {
    locateFile?: (file: string, prefix: string) => string;
  }

  export interface SqlJsStatement {
    bind(values: unknown[]): void;
    step(): boolean;
    getAsObject(): Record<string, unknown>;
    free(): void;
  }

  export interface SqlJsDatabase {
    export(): Uint8Array;
    exec(sql: string): void;
    prepare(sql: string): SqlJsStatement;
  }

  export interface SqlJsStatic {
    Database: new (data?: Uint8Array | ArrayBuffer | ArrayBufferLike) => SqlJsDatabase;
  }

  export default function initSqlJs(config?: SqlJsConfig): Promise<SqlJsStatic>;
}