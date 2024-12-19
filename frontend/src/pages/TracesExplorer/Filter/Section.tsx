import './Filter.styles.scss';

import { Button, Collapse, Divider } from 'antd';
import {
	Dispatch,
	MouseEvent,
	SetStateAction,
	useEffect,
	useMemo,
	useState,
} from 'react';

import { DurationSection } from './DurationSection';
import {
	AllTraceFilterKeys,
	AllTraceFilterKeyValue,
	FilterType,
	HandleRunProps,
} from './filterUtils';
import { SectionBody } from './SectionContent';

interface SectionProps {
	panelName: AllTraceFilterKeys;
	selectedFilters: FilterType | undefined;
	setSelectedFilters: Dispatch<SetStateAction<FilterType | undefined>>;
	handleRun: (props?: HandleRunProps) => void;
}

export function Section(props: SectionProps): JSX.Element {
	const { panelName, setSelectedFilters, selectedFilters, handleRun } = props;

	const defaultOpenPanes = useMemo(
		() =>
			Array.from(
				new Set([
					...Object.keys(selectedFilters || {}),
					'hasError',
					'durationNano',
					'serviceName',
					'deployment.environment',
				]),
			),
		[selectedFilters],
	);

	const [activeKeys, setActiveKeys] = useState<string[]>(defaultOpenPanes);

	useEffect(() => {
		setActiveKeys(defaultOpenPanes);
	}, [defaultOpenPanes]);

	const onClearHandler = (e: MouseEvent): void => {
		e.stopPropagation();
		e.preventDefault();

		if (
			selectedFilters?.[panelName] ||
			selectedFilters?.durationNanoMin ||
			selectedFilters?.durationNanoMax
		) {
			handleRun({ clearByType: panelName });
		}
	};

	return (
		<div>
			<Divider plain className="divider" />
			<div className="section-body-header" data-testid={`collapse-${panelName}`}>
				<Collapse
					bordered={false}
					className="collapseContainer"
					activeKey={activeKeys}
					onChange={(keys): void => setActiveKeys(keys as string[])}
					items={[
						panelName === 'durationNano'
							? {
									key: panelName,
									children: (
										<DurationSection
											setSelectedFilters={setSelectedFilters}
											selectedFilters={selectedFilters}
										/>
									),
									label: AllTraceFilterKeyValue[panelName],
							  }
							: {
									key: panelName,
									children: (
										<SectionBody
											type={panelName}
											selectedFilters={selectedFilters}
											setSelectedFilters={setSelectedFilters}
											handleRun={handleRun}
										/>
									),
									label: AllTraceFilterKeyValue[panelName],
							  },
					]}
				/>
				<Button
					type="link"
					onClick={onClearHandler}
					data-testid={`collapse-${panelName}-clearBtn`}
				>
					Clear All
				</Button>
			</div>
		</div>
	);
}
