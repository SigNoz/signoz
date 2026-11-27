import { AllTheProviders, renderHook } from 'tests/test-utils';
import { buildPermission } from 'lib/authz/hooks/useAuthZ/utils';
import { useAuthZ } from 'lib/authz/hooks/useAuthZ/useAuthZ';
import {
	mockUseAuthZDenyAll,
	mockUseAuthZGrantAll,
} from 'lib/authz/utils/authz-test-utils';

import { useAuthZDisabled } from './useAuthZDisabled';

jest.mock('lib/authz/hooks/useAuthZ/useAuthZ');

const CHECKS = [buildPermission('list', 'route-policy:*')];

const renderDisabled = (): ReturnType<
	typeof renderHook<ReturnType<typeof useAuthZDisabled>, unknown>
> => renderHook(() => useAuthZDisabled(CHECKS), { wrapper: AllTheProviders });

describe('useAuthZDisabled', () => {
	it('keeps a tooltip when allowed', () => {
		jest.mocked(useAuthZ).mockImplementation(mockUseAuthZGrantAll);
		const { result } = renderDisabled();

		expect(result.current.disabled).toBe(false);
		expect(result.current.disabledTooltip).toBeTruthy();
	});

	it('disables when denied', () => {
		jest.mocked(useAuthZ).mockImplementation(mockUseAuthZDenyAll);
		const { result } = renderDisabled();

		expect(result.current.disabled).toBe(true);
	});
});
