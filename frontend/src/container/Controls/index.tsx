import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import { Button, Select } from 'antd';
import { Pagination } from 'hooks/queryPagination';
import { memo, useMemo } from 'react';

import { defaultSelectStyle, ITEMS_PER_PAGE_OPTIONS } from './config';
import { Container } from './styles';

function Controls({
	offset = 0,
	isLoading,
	totalCount,
	countPerPage,
	handleNavigatePrevious,
	handleNavigateNext,
	handleCountItemsPerPageChange,
}: ControlsProps): JSX.Element | null {
	const isNextAndPreviousDisabled = useMemo(
		() => isLoading || countPerPage < 0 || totalCount === 0,
		[isLoading, countPerPage, totalCount],
	);
	const isPreviousDisabled = useMemo(() => offset <= 0, [offset]);
	const isNextDisabled = useMemo(() => totalCount < countPerPage, [
		countPerPage,
		totalCount,
	]);

	return (
		<Container>
			<Button
				loading={isLoading}
				size="small"
				type="link"
				disabled={isPreviousDisabled || isNextAndPreviousDisabled}
				onClick={handleNavigatePrevious}
			>
				<LeftOutlined /> Previous
			</Button>
			<Button
				loading={isLoading}
				size="small"
				type="link"
				disabled={isNextDisabled || isNextAndPreviousDisabled}
				onClick={handleNavigateNext}
			>
				Next <RightOutlined />
			</Button>
			<Select<Pagination['limit']>
				style={defaultSelectStyle}
				loading={isLoading}
				value={countPerPage}
				onChange={handleCountItemsPerPageChange}
			>
				{ITEMS_PER_PAGE_OPTIONS.map((count) => (
					<Select.Option
						key={count}
						value={count}
					>{`${count} / page`}</Select.Option>
				))}
			</Select>
		</Container>
	);
}

Controls.defaultProps = {
	offset: 0,
};

export interface ControlsProps {
	offset?: Pagination['offset'];
	totalCount: number;
	countPerPage: Pagination['limit'];
	isLoading: boolean;
	handleNavigatePrevious: () => void;
	handleNavigateNext: () => void;
	handleCountItemsPerPageChange: (value: Pagination['limit']) => void;
}

export default memo(Controls);
