import { Typography } from 'antd';

function PaginationInfoText(
	total: number,
	[start, end]: number[],
): JSX.Element {
	return (
		<span
			style={{
				position: 'absolute',
				left: 0,
				width: 'max-content',
				marginLeft: '16px',
			}}
		>
			<Typography.Text className="numbers">
				{start} &#8212; {end}
			</Typography.Text>
			<Typography.Text className="total"> of {total}</Typography.Text>
		</span>
	);
}

export default PaginationInfoText;
