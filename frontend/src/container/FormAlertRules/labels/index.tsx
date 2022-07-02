import {
	CloseCircleFilled,
	ExclamationCircleOutlined,
} from '@ant-design/icons';
import { useMachine } from '@xstate/react';
import { Button, Input, message, Modal } from 'antd';
import { map } from 'lodash-es';
import React, { useCallback, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { Labels } from 'types/api/alerts/def';
import AppReducer from 'types/reducer/app';
import { v4 as uuid } from 'uuid';

import { ResourceAttributesFilterMachine } from './Labels.machine';
import QueryChip from './QueryChip';
import { QueryChipItem, SearchContainer } from './styles';
import { ILabelRecord } from './types';
import { createQuery, flattenLabels, prepareLabels } from './utils';

function LabelSelect({
	onSetLabels,
	initialValues,
}: {
	onSetLabels: (q: Labels) => void;
	initialValues: Labels | undefined;
}): JSX.Element | null {
	const { isDarkMode } = useSelector<AppState, AppReducer>((state) => state.app);
	const [currentVal, setCurrentVal] = useState('');
	const [staging, setStaging] = useState<string[]>([]);
	const [queries, setQueries] = useState<ILabelRecord[]>([]);

	const dispatchChanges = (updatedRecs: ILabelRecord[]): void => {
		onSetLabels(prepareLabels(updatedRecs));
		setQueries(updatedRecs);
	};

	useEffect(() => {
		if (initialValues) setQueries(flattenLabels(initialValues));
	}, [initialValues]);

	const [state, send] = useMachine(ResourceAttributesFilterMachine, {
		actions: {
			onSelectLabelKey: () => {},
			onSelectLabelValue: () => {
				console.log('onSelectLabelValue:', currentVal);
				if (currentVal !== '') {
					setStaging((prevState) => [...prevState, currentVal]);
				} else {
					return;
				}
				setCurrentVal('');
			},
			onValidateQuery: (): void => {
				console.log('onValidateQuery:', currentVal);
				if (currentVal === '') {
					return;
				}

				console.log('staging', staging);

				const generatedQuery = createQuery([...staging, currentVal]);

				console.log('generatedQuery:', generatedQuery);
				if (generatedQuery) {
					dispatchChanges([...queries, generatedQuery]);
					setStaging([]);
					setCurrentVal('');
					send('RESET');
				}
			},
		},
	});

	const handleFocus = (): void => {
		if (state.value === 'Idle') {
			send('NEXT');
		}
	};

	const handleBlur = useCallback((): void => {
		send('onBlur');
	}, [send]);

	useEffect(() => {
		handleBlur();
	}, [handleBlur]);

	const handleChange = (e): void => {
		setCurrentVal(e.target?.value);
	};

	const handleClose = (key: string): void => {
		dispatchChanges(queries.filter((queryData) => queryData.key !== key));
	};

	const handleClearAll = (): void => {
		Modal.confirm({
			title: 'Confirm',
			icon: <ExclamationCircleOutlined />,
			content: 'This action will remove all the labels. Do you want to proceed?',
			onOk() {
				send('RESET');
				dispatchChanges([]);
				setStaging([]);
				message.success('Labels cleared');
			},
			okText: 'Yes',
			cancelText: 'No',
		});
	};

	return (
		<SearchContainer isDarkMode={isDarkMode} disabled={false}>
			<div style={{ display: 'inline-flex', flexWrap: 'wrap' }}>
				{queries.length > 0 &&
					map(
						queries,
						(query): JSX.Element => {
							return (
								<QueryChip key={query.key} queryData={query} onRemove={handleClose} />
							);
						},
					)}
			</div>
			<div>
				{map(staging, (item, idx) => {
					return (
						<QueryChipItem key={uuid()} onRemove={handleClose}>
							{item}
						</QueryChipItem>
					);
				})}
			</div>

			<div style={{ display: 'flex', width: '100%' }}>
				<Input
					placeholder={`Enter ${
						state.value === 'Idle' ? 'Label Key Pair' : state.value
					}`}
					onChange={handleChange}
					onKeyUp={(e) => {
						if (e.key === 'Enter' || e.code === 'Enter') {
							send('NEXT');
						}
					}}
					bordered={false}
					value={currentVal as never}
					style={{ flex: 1 }}
					onFocus={handleFocus}
					onBlur={handleBlur}
				/>

				{queries.length || staging.length || currentVal ? (
					<Button
						onClick={handleClearAll}
						icon={<CloseCircleFilled />}
						type="text"
					/>
				) : null}
			</div>
		</SearchContainer>
	);
}

export default LabelSelect;
