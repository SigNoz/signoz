/**
 * AI-owned. Generated and maintained by coding agents alongside the specs that
 * use it. Do not hand-edit: regenerate it with the spec that needs the change.
 */
import { type Locator } from '@playwright/test';

export interface TableRows {
	rows(): Locator;
}

export function tableAt(root: () => Locator): TableRows {
	return {
		rows: () => root().locator('tbody tr.ant-table-row'),
	};
}
