import { memo, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from '@signozhq/icons';
import { Flex, Select } from 'antd';
import { DEFAULT_PER_PAGE_OPTIONS, Pagination } from 'hooks/queryPagination';
import { popupContainer } from 'utils/selectPopupContainer';

import { defaultSelectStyle } from './config';
import { Container } from './styles';
import { Button } from '@signozhq/ui/button';

function Controls({
	offset = 0,
	perPageOptions = DEFAULT_PER_PAGE_OPTIONS,
	isLoading,
	totalCount,
	countPerPage,
	handleNavigatePrevious,
	handleNavigateNext,
	handleCountItemsPerPageChange,
	isLogPanel = false,
	showSizeChanger = true,
}: ControlsProps): JSX.Element | null {
	const isNextAndPreviousDisabled = useMemo(
		() => isLoading || countPerPage < 0 || totalCount === 0,
		[isLoading, countPerPage, totalCount],
	);
	const isPreviousDisabled = useMemo(
		() => (isLogPanel ? false : offset <= 0 || isNextAndPreviousDisabled),
		[isLogPanel, isNextAndPreviousDisabled, offset],
	);
	const isNextDisabled = useMemo(
		() =>
			isLogPanel ? false : totalCount < countPerPage || isNextAndPreviousDisabled,
		[countPerPage, isLogPanel, isNextAndPreviousDisabled, totalCount],
	);

	return (
		<Container>
			<Button
				loading={isLoading}
				disabled={isPreviousDisabled}
				onClick={handleNavigatePrevious}
				size="sm"
				variant="link"
			>
				<Flex align="center" gap="4px">
					<ChevronLeft size={16} /> Previous
				</Flex>
			</Button>
			<Button
				loading={isLoading}
				disabled={isNextDisabled}
				onClick={handleNavigateNext}
				size="sm"
				variant="link"
			>
				<Flex align="center" gap="4px">
					Next <ChevronRight size={16} />
				</Flex>
			</Button>

			{showSizeChanger && (
				<Select<Pagination['limit']>
					style={defaultSelectStyle}
					loading={isLoading}
					value={countPerPage}
					onChange={handleCountItemsPerPageChange}
					getPopupContainer={popupContainer}
				>
					{perPageOptions.map((count) => (
						<Select.Option
							key={count}
							value={count}
						>{`${count} / page`}</Select.Option>
					))}
				</Select>
			)}
		</Container>
	);
}

Controls.defaultProps = {
	offset: 0,
	perPageOptions: DEFAULT_PER_PAGE_OPTIONS,
	isLogPanel: false,
	showSizeChanger: true,
};

export interface ControlsProps {
	offset?: Pagination['offset'];
	perPageOptions?: number[];
	totalCount: number;
	countPerPage: Pagination['limit'];
	isLoading: boolean;
	handleNavigatePrevious: () => void;
	handleNavigateNext: () => void;
	handleCountItemsPerPageChange: (value: Pagination['limit']) => void;
	isLogPanel?: boolean;
	showSizeChanger?: boolean;
}

export default memo(Controls);
