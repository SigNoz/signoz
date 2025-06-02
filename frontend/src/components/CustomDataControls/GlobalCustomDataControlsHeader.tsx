import './CustomDataControls.styles.scss';

import { Card, InputNumber, Switch, Typography } from 'antd';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { useDashboard } from 'providers/Dashboard/Dashboard';

const { Text } = Typography;

function GlobalCustomDataControlsHeader(): JSX.Element {
	const {
		globalCustomDataMode,
		setGlobalCustomDataMode,
		globalCustomXData,
		setGlobalCustomXData,
		globalCustomYData,
		setGlobalCustomYData,
	} = useDashboard();

	const isDarkMode = useIsDarkMode();

	const handleCustomDataModeChange = (checked: boolean): void => {
		setGlobalCustomDataMode(checked);

		// Set default values if not already set
		if (checked) {
			if (!globalCustomXData) setGlobalCustomXData(15);
			if (!globalCustomYData) setGlobalCustomYData(4);
		}
	};

	const handleDataPointsChange = (value: number | null): void => {
		if (value !== null && value > 0) {
			setGlobalCustomXData(value);
		}
	};

	const handleSeriesCountChange = (value: number | null): void => {
		if (value !== null && value > 0) {
			setGlobalCustomYData(value);
		}
	};

	return (
		<Card
			className={`custom-data-controls global-custom-data-controls inline-layout ${
				isDarkMode ? 'dark-mode' : ''
			}`}
			size="small"
		>
			<div className="custom-data-inline-container">
				<div className="title-switch-group">
					<Text strong>Custom Data Generator</Text>
					<Switch
						checked={globalCustomDataMode}
						onChange={handleCustomDataModeChange}
						size="small"
					/>
				</div>

				{globalCustomDataMode && (
					<div className="inputs-container">
						<div className="input-group">
							<Text className="input-label">Points (X):</Text>
							<InputNumber
								value={globalCustomXData || 15}
								onChange={handleDataPointsChange}
								size="small"
								style={{ width: 80 }}
							/>
						</div>

						<div className="input-group">
							<Text className="input-label">Series (Y):</Text>
							<InputNumber
								value={globalCustomYData || 4}
								onChange={handleSeriesCountChange}
								size="small"
								style={{ width: 80 }}
							/>
						</div>
					</div>
				)}
			</div>
		</Card>
	);
}

export default GlobalCustomDataControlsHeader;
