import { handlers } from 'mocks/handlers';
import { setupServer } from 'msw/node';

export const server = setupServer(...handlers);
