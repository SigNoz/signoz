import { InputNumber, Row, Space, Typography } from 'antd';

interface PopoverContentProps {
	linesPerRow: number;
	handleLinesPerRowChange: (l: unknown) => void;
}

function PopoverContent({
	linesPerRow,
	handleLinesPerRowChange,
}: PopoverContentProps): JSX.Element {
	return (
		<Row align="middle">
			<Space align="center">
				<Typography>Max lines per Row </Typography>
				<InputNumber
					min={1}
					max={10}
					value={linesPerRow}
					onChange={handleLinesPerRowChange}
				/>
			</Space>
		</Row>
	);
}

export default PopoverContent;
