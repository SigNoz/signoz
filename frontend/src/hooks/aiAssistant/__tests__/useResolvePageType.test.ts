import { renderHook } from '@testing-library/react';
import { PageTypeDTO } from 'api/ai-assistant/sigNozAIAssistantAPI.schemas';
import type { AIAssistantVariant } from 'container/AIAssistant/VariantContext';
import ROUTES from 'constants/routes';

import { useResolvePageType } from '../useResolvePageType';

const mockUseLocation = jest.fn();
const mockUseVariant = jest.fn();

jest.mock('react-router-dom', () => ({
	...jest.requireActual('react-router-dom'),
	useLocation: (): unknown => mockUseLocation(),
}));

jest.mock('container/AIAssistant/VariantContext', () => ({
	useVariant: (): unknown => mockUseVariant(),
}));

function setup(
	pathname: string,
	search: string,
	variant: AIAssistantVariant,
): PageTypeDTO {
	mockUseLocation.mockReturnValue({ pathname, search });
	mockUseVariant.mockReturnValue(variant);

	return renderHook(() => useResolvePageType()).result.current;
}

describe('useResolvePageType', () => {
	afterEach(() => {
		jest.clearAllMocks();
	});

	it('returns other for the standalone "page" assistant surface', () => {
		const pathname = ROUTES.DASHBOARD.replace(':dashboardId', 'dash-123');

		expect(setup(pathname, '', 'page')).toBe(PageTypeDTO.other);
	});

	it('resolves the underlying page type for embedded variants', () => {
		const pathname = ROUTES.DASHBOARD.replace(':dashboardId', 'dash-123');

		expect(setup(pathname, '', 'panel')).toBe(PageTypeDTO.dashboard_detail);
		expect(setup(pathname, '', 'modal')).toBe(PageTypeDTO.dashboard_detail);
	});
});
