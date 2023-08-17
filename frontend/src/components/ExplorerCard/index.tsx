import { Card, Space, Typography } from 'antd';
import TextToolTip from 'components/TextToolTip';

function ExplorerCard({ children }: Props): JSX.Element {
	return (
		<Card
			size="small"
			title={
				<Space>
					<Typography>Query Builder</Typography>
					<TextToolTip
						url="https://signoz.io/docs/userguide/query-builder/?utm_source=product&utm_medium=new-query-builder"
						text="More details on how to use query builder"
					/>
				</Space>
			}
		>
			{children}
		</Card>
	);
}

interface Props {
	children: React.ReactNode;
}

export default ExplorerCard;
