import { RestHandler } from 'msw';

import { autocompleteHandlers } from './autocomplete';

export const handlers: RestHandler[] = [...autocompleteHandlers];
