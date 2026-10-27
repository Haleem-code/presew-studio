declare module "pg" {
  export class Pool {
    constructor(config?: {
      connectionString?: string;
      options?: string;
      max?: number;
      [key: string]: unknown;
    });
    connect(): Promise<unknown>;
    query(text: string, values?: unknown[]): Promise<unknown>;
    end(): Promise<void>;
  }
}
