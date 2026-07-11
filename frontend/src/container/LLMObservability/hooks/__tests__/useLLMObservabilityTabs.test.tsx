import { MemoryRouter } from 'react-router-dom';
import { act, renderHook } from '@testing-library/react';
import { safeNavigateMock } from '__tests__/safeNavigateMock';
import ROUTES from 'constants/routes';

import { useLLMObservabilityTabs } from '../useLLMObservabilityTabs';

function renderTabsAt(
	route: string,
): ReturnType<
	typeof renderHook<ReturnType<typeof useLLMObservabilityTabs>, unknown>
> {
	const wrapper = ({
		children,
	}: {
		children: React.ReactNode;
	}): React.ReactElement => (
		<MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
	);
	return renderHook(() => useLLMObservabilityTabs(), { wrapper });
}

describe('useLLMObservabilityTabs', () => {
	it('marks the overview tab active on the overview route', () => {
		const { result } = renderTabsAt(ROUTES.LLM_OBSERVABILITY_OVERVIEW);

		expect(result.current.activeTab).toBe(ROUTES.LLM_OBSERVABILITY_OVERVIEW);
	});

	it('marks the configuration tab active on the configuration route', () => {
		const { result } = renderTabsAt(ROUTES.LLM_OBSERVABILITY_CONFIGURATION);

		expect(result.current.activeTab).toBe(ROUTES.LLM_OBSERVABILITY_CONFIGURATION);
	});

	it('marks the attribute mapping tab active on the attribute mapping route', () => {
		const { result } = renderTabsAt(ROUTES.LLM_OBSERVABILITY_ATTRIBUTE_MAPPING);

		expect(result.current.activeTab).toBe(
			ROUTES.LLM_OBSERVABILITY_ATTRIBUTE_MAPPING,
		);
	});

	it('exposes all route-keyed tab items', () => {
		const { result } = renderTabsAt(ROUTES.LLM_OBSERVABILITY_OVERVIEW);

		expect(result.current.items).toHaveLength(3);
		const keys = result.current.items.map((item) => item.key);
		expect(keys).toStrictEqual([
			ROUTES.LLM_OBSERVABILITY_OVERVIEW,
			ROUTES.LLM_OBSERVABILITY_CONFIGURATION,
			ROUTES.LLM_OBSERVABILITY_ATTRIBUTE_MAPPING,
		]);
	});

	it('navigates to the selected tab key on change', () => {
		const { result } = renderTabsAt(ROUTES.LLM_OBSERVABILITY_OVERVIEW);

		act(() => {
			result.current.onTabChange(ROUTES.LLM_OBSERVABILITY_CONFIGURATION);
		});

		expect(safeNavigateMock).toHaveBeenCalledWith(
			ROUTES.LLM_OBSERVABILITY_CONFIGURATION,
		);
	});
});
