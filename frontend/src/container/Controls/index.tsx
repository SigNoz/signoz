import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import { Button, Select } from 'antd';
import { memo, useMemo } from 'react';

import { defaultSelectStyle, ITEMS_PER_PAGE_OPTIONS } from './config';
import { Container } from './styles';

interface ControlsProps {
	count: number;
	countPerPage: number;
	isLoading: boolean;
	handleNavigatePrevious: () => void;
	handleNavigateNext: () => void;
	handleCountItemsPerPageChange: (e: number) => void;
}

function Controls(props: ControlsProps): JSX.Element | null {
	const {
		count,
		isLoading,
		countPerPage,
		handleNavigatePrevious,
		handleNavigateNext,
		handleCountItemsPerPageChange,
	} = props;

	const isNextAndPreviousDisabled = useMemo(
		() => isLoading || countPerPage === 0 || count === 0 || count < countPerPage,
		[isLoading, countPerPage, count],
	);

	return (
		<Container>
			<Button
				loading={isLoading}
				size="small"
				type="link"
				disabled={isNextAndPreviousDisabled}
				onClick={handleNavigatePrevious}
			>
				<LeftOutlined /> Previous
			</Button>
			<Button
				loading={isLoading}
				size="small"
				type="link"
				disabled={isNextAndPreviousDisabled}
				onClick={handleNavigateNext}
			>
				Next <RightOutlined />
			</Button>
			<Select
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

export default memo(Controls);
