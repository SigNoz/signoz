export type BundleFile =
	| { type: 'asset'; source: string | Uint8Array }
	| { type: 'chunk' };

export type Bundle = Record<string, BundleFile>;

export const IMPORT_MAP_FILE = 'importmap.json';
export const BOOT_GUARD_ID = 'signoz-boot-guard';
