import { Typography } from 'antd';
import { themeColors } from 'constants/theme';
import { useGetApDexSettings } from 'hooks/apDex/useGetApDexSettings';
import { useEffect, useState } from 'react';

function DumpyComponent({ servicename }: DumpyComponentProps): JSX.Element {
	const [threadholdValue, setThreadholdValue] = useState(0);
	const { data, isLoading } = useGetApDexSettings(servicename);

	console.log('data and loading', data, isLoading, threadholdValue);

	useEffect(() => {
		setThreadholdValue(data?.threshold ?? 0);
	}, [data]);

	const handleThreadholdChange = (
		e: React.ChangeEvent<HTMLInputElement>,
	): void => {
		setThreadholdValue(Number(e.target.value));
	};

	const onSaveHandler = (): void => {};

	if (isLoading) {
		return (
			<Typography.Text style={{ color: themeColors.white }}>
				Loading
			</Typography.Text>
		);
	}

	return (
		<>
			<Typography.Text style={{ color: themeColors.white }}>
				DummyComponent
			</Typography.Text>
			<input
				type="number"
				value={threadholdValue}
				onChange={handleThreadholdChange}
				max={1}
				min={0}
			/>
			<button type="button" onClick={onSaveHandler}>
				Save
			</button>
		</>
	);
}

interface DumpyComponentProps {
	servicename: string;
}

export default DumpyComponent;
