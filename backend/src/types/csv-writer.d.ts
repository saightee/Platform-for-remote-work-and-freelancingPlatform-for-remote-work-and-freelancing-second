declare module 'csv-writer' {
  export interface ObjectCsvStringifier {
    getHeaderString(): string;
    stringifyRecords(records: any[]): string;
  }

  export function createObjectCsvStringifier(config: {
    header: Array<{ id: string; title: string }>;
    fieldDelimiter?: string;
  }): ObjectCsvStringifier;
}