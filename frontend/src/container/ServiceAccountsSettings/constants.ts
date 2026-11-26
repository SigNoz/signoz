export const SA_PAGE_SIZE = 20;

// `service_account_list_filter_invalid`: DSL syntax / key / operator; `service_account_invalid_input`: other list params.
export const SA_LIST_INVALID_ERROR_CODES: readonly string[] = [
	'service_account_list_filter_invalid',
	'service_account_invalid_input',
];

export const SA_QUERY_PARAMS = {
	CREATE_SA: 'create-sa',
	ACCOUNT: 'account',
	PAGE: 'page',
	SEARCH: 'search',
	TAB: 'tab',
	KEYS_PAGE: 'keysPage',
	ADD_KEY: 'add-key',
	EDIT_KEY: 'edit-key',
	REVOKE_KEY: 'revoke-key',
	DELETE_SA: 'delete-sa',
} as const;
