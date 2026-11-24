import { driver, kit, type Layer } from '../kit';

import { nozDriver, type Noz } from './driver';

export type { FakeAssistant, SentMessage } from './fake';

export const withNoz: Layer<{ noz: Noz }> = driver('noz', ({ page }) =>
	nozDriver(page),
);

export const test = withNoz(kit);
export { expect } from '../kit';
