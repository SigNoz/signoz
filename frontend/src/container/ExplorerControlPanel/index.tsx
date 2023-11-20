import { Col, Row } from 'antd';
import OptionsMenu from 'container/OptionsMenu';
import PageSizeSelect from 'container/PageSizeSelect';

import { ExplorerControlPanelProps } from './ExplorerControlPanel.interfaces';
import { ContainerStyled } from './styles';

function ExplorerControlPanel({
	selectedOptionFormat,
	isLoading,
	isShowPageSize,
	optionsMenuConfig,
}: ExplorerControlPanelProps): JSX.Element {
	return (
		<ContainerStyled>
			<Row justify="end" gutter={30}>
				{optionsMenuConfig && (
					<Col>
						<OptionsMenu
							selectedOptionFormat={selectedOptionFormat}
							config={optionsMenuConfig}
						/>
					</Col>
				)}
				<Col>
					<PageSizeSelect isLoading={isLoading} isShow={isShowPageSize} />
				</Col>
			</Row>
		</ContainerStyled>
	);
}

export default ExplorerControlPanel;
