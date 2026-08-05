import { unparse } from 'papaparse';

import { SerializedTable } from './types';

/** Serializes a table to CSV. `fields` pins column order regardless of row keys. */
export function toCsv(table: SerializedTable): string {
	return unparse({ fields: table.headers, data: table.rows });
}
