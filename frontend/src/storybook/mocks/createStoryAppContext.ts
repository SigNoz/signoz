import { IAppContext } from 'providers/App/types';
import { fn } from 'storybook/test';
import { createAppContextMock } from 'tests/fixtures/appContextMock';

export const createStoryAppContext = (
	role: string,
	overrides?: Partial<IAppContext>,
): IAppContext => createAppContextMock(role, overrides, () => fn());
