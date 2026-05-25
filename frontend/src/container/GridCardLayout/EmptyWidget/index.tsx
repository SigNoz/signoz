import { Typography } from '@signozhq/ui/typography';

import { Container } from './styles';

function EmptyWidget(): JSX.Element {
	return (
		<Container>
			<Typography.Text>
				Click one of the widget types above (Time Series / Value) to add here
			</Typography.Text>
		</Container>
	);
}

export default EmptyWidget;
