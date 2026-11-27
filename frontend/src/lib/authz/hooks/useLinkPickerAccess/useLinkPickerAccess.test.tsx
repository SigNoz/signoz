import { act, AllTheProviders, renderHook } from 'tests/test-utils';
import type {
	BrandedPermission,
	UseAuthZResult,
} from 'lib/authz/hooks/useAuthZ/types';
import { buildPermission } from 'lib/authz/hooks/useAuthZ/utils';
import { useAuthZ } from 'lib/authz/hooks/useAuthZ/useAuthZ';
import { mockUseAuthZGrantAll } from 'lib/authz/utils/authz-test-utils';

import type { LinkPermissions, UseLinkPickerAccessArgs } from './types';
import { useLinkPickerAccess } from './useLinkPickerAccess';

jest.mock('lib/authz/hooks/useAuthZ/useAuthZ');

const OWNER: LinkPermissions = {
	attach: buildPermission('attach', 'route-policy:p1'),
	detach: buildPermission('detach', 'route-policy:p1'),
};
const item = (id: string): LinkPermissions => ({
	attach: buildPermission('attach', `notification-channel:${id}`),
	detach: buildPermission('detach', `notification-channel:${id}`),
});

/** The checks of the latest `useAuthZ` call that is enabled, per request. */
const requested = (): {
	upfront: BrandedPermission[];
	picker: BrandedPermission[];
} => {
	const calls = jest.mocked(useAuthZ).mock.calls;
	const [upfront, picker] = calls.slice(-2);
	const enabledChecks = (call: (typeof calls)[number]): BrandedPermission[] =>
		call[1]?.enabled === false ? [] : call[0];
	return { upfront: enabledChecks(upfront), picker: enabledChecks(picker) };
};

const renderAccess = (
	args: Partial<UseLinkPickerAccessArgs>,
): ReturnType<
	typeof renderHook<ReturnType<typeof useLinkPickerAccess>, unknown>
> =>
	renderHook(
		() =>
			useLinkPickerAccess({
				linkedIds: [],
				optionIds: ['a', 'b'],
				buildItemPermissions: item,
				...args,
			}),
		{ wrapper: AllTheProviders },
	);

describe('useLinkPickerAccess', () => {
	beforeEach(() => {
		jest.mocked(useAuthZ).mockClear();
		jest.mocked(useAuthZ).mockImplementation(mockUseAuthZGrantAll);
	});

	it('asks nothing up front when nothing is linked', () => {
		renderAccess({ owner: OWNER });

		expect(requested()).toStrictEqual({ upfront: [], picker: [] });
	});

	it('asks the owner and the linked items for detach up front', () => {
		renderAccess({ owner: OWNER, linkedIds: ['a'] });

		expect(requested().upfront).toStrictEqual([OWNER.detach, item('a').detach]);
	});

	it('asks the owner and the other items for attach once the picker opens', () => {
		const { result } = renderAccess({ owner: OWNER, linkedIds: ['a'] });
		expect(requested().picker).toStrictEqual([]);

		act(() => result.current.onPickerVisibleChange(true));

		expect(requested().picker).toStrictEqual([OWNER.attach, item('b').attach]);
	});

	it('asks nothing for exempt items and always allows them', () => {
		const denied = new Set([
			item('a').detach,
			item('b').attach,
			item('c').attach,
		]);
		jest.mocked(useAuthZ).mockImplementation((checks) => ({
			...mockUseAuthZGrantAll(checks),
			permissions: Object.fromEntries(
				checks.map((check) => [check, { isGranted: !denied.has(check) }]),
			) as UseAuthZResult['permissions'],
		}));
		const { result } = renderAccess({
			owner: OWNER,
			linkedIds: ['a'],
			exemptIds: ['a', 'b'],
			optionIds: ['a', 'b', 'c'],
		});
		act(() => result.current.onPickerVisibleChange(true));

		expect(requested()).toStrictEqual({
			upfront: [],
			picker: [OWNER.attach, item('c').attach],
		});
		expect(result.current.getAccess('a').disabled).toBe(false);
		expect(result.current.getAccess('b').disabled).toBe(false);
		expect(result.current.getAccess('c').disabled).toBe(true);
	});

	it('tells a refused item from one still being checked', () => {
		jest.mocked(useAuthZ).mockImplementation((checks, options) => ({
			...mockUseAuthZGrantAll(checks),
			permissions:
				options?.enabled === false
					? null
					: (Object.fromEntries(
							checks.map((check) => [
								check,
								{ isGranted: check !== item('a').detach },
							]),
						) as UseAuthZResult['permissions']),
		}));
		const { result } = renderAccess({
			owner: OWNER,
			linkedIds: ['a'],
			optionIds: ['a', 'b'],
		});

		expect(result.current.getAccess('a')).toMatchObject({
			disabled: true,
			denied: true,
		});
		expect(result.current.getAccess('b')).toMatchObject({
			disabled: true,
			denied: false,
		});
	});
});
