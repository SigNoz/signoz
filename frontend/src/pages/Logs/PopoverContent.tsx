import { InputNumber, Row, Typography } from 'antd';
import React from 'react';

interface PopoverContentProps {
	linesPerRow: number;
	handleLinesPerRowChange: (l: unknown) => void;
}

function PopoverContent(props: PopoverContentProps): JSX.Element {
	const { linesPerRow, handleLinesPerRowChange } = props;

	return (
		<Row align="middle">
			<Typography>Max lines per Row </Typography>
			<InputNumber
				min={1}
				max={10}
				value={linesPerRow}
				onChange={handleLinesPerRowChange}
				style={{ width: '60px' }}
			/>
		</Row>
	);
}

export default PopoverContent;
