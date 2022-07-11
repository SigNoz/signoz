import {
	CloseCircleFilled,
	ExclamationCircleOutlined,
} from '@ant-design/icons';
import { useMachine } from '@xstate/react';
import { Button, Input, message, Modal } from 'antd';
import { map } from 'lodash-es';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
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

interface LabelSelectProps {
	onSetLabels: (q: Labels) => void;
	initialValues: Labels | undefined;
}

function LabelSelect({
	onSetLabels,
	initialValues,
}: LabelSelectProps): JSX.Element | null {
	const { t } = useTranslation('rules');
	const { isDarkMode } = useSelector<AppState, AppReducer>((state) => state.app);
	const [currentVal, setCurrentVal] = useState('');
	const [staging, setStaging] = useState<string[]>([]);
	const [queries, setQueries] = useState<ILabelRecord[]>(
		initialValues ? flattenLabels(initialValues) : [],
	);

	const dispatchChanges = (updatedRecs: ILabelRecord[]): void => {
		onSetLabels(prepareLabels(updatedRecs, initialValues));
		setQueries(updatedRecs);
	};

	const [state, send] = useMachine(ResourceAttributesFilterMachine, {
		actions: {
			onSelectLabelKey: () => {},
			onSelectLabelValue: () => {
				if (currentVal !== '') {
					setStaging((prevState) => [...prevState, currentVal]);
				} else {
					return;
				}
				setCurrentVal('');
			},
			onValidateQuery: (): void => {
				if (currentVal === '') {
					return;
				}

				const generatedQuery = createQuery([...staging, currentVal]);

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

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
		setCurrentVal(e.target?.value);
	};

	const handleClose = (key: string): void => {
		dispatchChanges(queries.filter((queryData) => queryData.key !== key));
	};

	const handleClearAll = (): void => {
		Modal.confirm({
			title: 'Confirm',
			icon: <ExclamationCircleOutlined />,
			content: t('remove_label_confirm'),
			onOk() {
				send('RESET');
				dispatchChanges([]);
				setStaging([]);
				message.success(t('remove_label_success'));
			},
			okText: t('button_yes'),
			cancelText: t('button_no'),
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
				{map(staging, (item) => {
					return <QueryChipItem key={uuid()}>{item}</QueryChipItem>;
				})}
			</div>

			<div style={{ display: 'flex', width: '100%' }}>
				<Input
					placeholder={`Enter ${
						state.value === 'Idle' ? t('placeholder_label_key_pair') : state.value
					}`}
					onChange={handleChange}
					onKeyUp={(e): void => {
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
