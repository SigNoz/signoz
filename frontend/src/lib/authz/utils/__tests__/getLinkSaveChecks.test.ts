import { buildPermission } from 'lib/authz/hooks/useAuthZ/utils';
import type { LinkPermissions } from 'lib/authz/hooks/useLinkPickerAccess/types';

import { getLinkSaveChecks } from '../getLinkSaveChecks';

const UPDATE = buildPermission('update', 'route-policy:p1');
const OWNER: LinkPermissions = {
	attach: buildPermission('attach', 'route-policy:p1'),
	detach: buildPermission('detach', 'route-policy:p1'),
};
const item = (id: string): LinkPermissions => ({
	attach: buildPermission('attach', `notification-channel:${id}`),
	detach: buildPermission('detach', `notification-channel:${id}`),
});

const checks = (savedIds: string[], incomingIds: string[]): unknown =>
	getLinkSaveChecks({
		ownerChecks: [UPDATE],
		owner: OWNER,
		buildItemPermissions: item,
		savedIds,
		incomingIds,
	});

describe('getLinkSaveChecks', () => {
	it("needs only the owner's checks when the links are unchanged", () => {
		expect(checks(['a', 'b'], ['b', 'a'])).toStrictEqual([UPDATE]);
	});

	it('attaches what is gained and detaches what is lost, once each', () => {
		expect(checks(['a', 'b'], ['b', 'c', 'c'])).toStrictEqual([
			UPDATE,
			OWNER.attach,
			item('c').attach,
			OWNER.detach,
			item('a').detach,
		]);
	});
});
