import { ChangeEvent, useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
	CloseCircleFilled,
	ExclamationCircleOutlined,
} from '@ant-design/icons';
import { Button, Input, message, Modal } from 'antd';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { map } from 'lodash-es';
import { Labels } from 'types/api/alerts/def';
import { v4 as uuid } from 'uuid';

import QueryChip from './QueryChip';
import { QueryChipItem, SearchContainer } from './styles';
import { ILabelRecord } from './types';
import { createQuery, flattenLabels, prepareLabels } from './utils';

type LabelStep = 'Idle' | 'LabelKey' | 'LabelValue';
type LabelEvent = 'NEXT' | 'onBlur' | 'RESET';

interface LabelSelectProps {
	onSetLabels: (q: Labels) => void;
	initialValues: Labels | undefined;
}

function LabelSelect({
	onSetLabels,
	initialValues,
}: LabelSelectProps): JSX.Element | null {
	const { t } = useTranslation('alerts');
	const isDarkMode = useIsDarkMode();

	const [currentVal, setCurrentVal] = useState('');
	const [staging, setStaging] = useState<string[]>([]);
	const [queries, setQueries] = useState<ILabelRecord[]>(
		initialValues ? flattenLabels(initialValues) : [],
	);
	const [step, setStep] = useState<LabelStep>('Idle');

	const dispatchChanges = (updatedRecs: ILabelRecord[]): void => {
		onSetLabels(prepareLabels(updatedRecs, initialValues));
		setQueries(updatedRecs);
	};

	const onSelectLabelValue = (): void => {
		if (currentVal !== '') {
			setStaging((prevState) => [...prevState, currentVal]);
		} else {
			return;
		}
		setCurrentVal('');
	};

	const onValidateQuery = (): void => {
		if (currentVal === '') {
			return;
		}

		const generatedQuery = createQuery([...staging, currentVal]);

		if (generatedQuery) {
			dispatchChanges([...queries, generatedQuery]);
			setStaging([]);
			setCurrentVal('');
			setStep('Idle');
		}
	};

	const send = (event: LabelEvent): void => {
		if (event === 'RESET') {
			setStep('Idle');
			return;
		}
		if (event === 'NEXT') {
			if (step === 'Idle') {
				setStep('LabelKey');
			} else if (step === 'LabelKey') {
				onSelectLabelValue();
				setStep('LabelValue');
			} else if (step === 'LabelValue') {
				onValidateQuery();
			}
			return;
		}
		if (event === 'onBlur') {
			if (step === 'LabelKey') {
				onSelectLabelValue();
				setStep('LabelValue');
			} else if (step === 'LabelValue') {
				onValidateQuery();
			}
		}
	};

	const handleFocus = (): void => {
		if (step === 'Idle') {
			send('NEXT');
		}
	};

	const handleBlur = useCallback((): void => {
		if (staging.length === 1 && staging[0] !== undefined) {
			send('onBlur');
		}
	}, [staging]);

	useEffect(() => {
		handleBlur();
	}, [handleBlur]);

	const handleLabelChange = (event: ChangeEvent<HTMLInputElement>): void => {
		// Remove the colon if it's the last character.
		// As the colon is used to separate the key and value in the query.
		setCurrentVal(
			event.target?.value.endsWith(':')
				? event.target?.value.slice(0, -1)
				: event.target?.value,
		);
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
	const renderPlaceholder = useCallback((): string => {
		if (step === 'LabelKey') {
			return 'Enter a label key then press ENTER.';
		}
		if (step === 'LabelValue') {
			return `Enter a value for label key(${staging[0]}) then press ENTER.`;
		}
		return t('placeholder_label_key_pair');
	}, [t, step, staging]);
	return (
		<SearchContainer isDarkMode={isDarkMode} disabled={false}>
			<div style={{ display: 'inline-flex', flexWrap: 'wrap' }}>
				{queries.length > 0 &&
					map(
						queries,
						(query): JSX.Element => (
							<QueryChip key={query.key} queryData={query} onRemove={handleClose} />
						),
					)}
			</div>
			<div>
				{map(staging, (item) => (
					<QueryChipItem key={uuid()}>{item}</QueryChipItem>
				))}
			</div>

			<div style={{ display: 'flex', width: '100%' }}>
				<Input
					placeholder={renderPlaceholder()}
					onChange={handleLabelChange}
					onKeyUp={(e): void => {
						if (e.key === 'Enter' || e.code === 'Enter' || e.key === ':') {
							send('NEXT');
						}
						if (step === 'Idle') {
							send('NEXT');
						}
					}}
					bordered={false}
					value={currentVal as never}
					style={{ flex: 1 }}
					onFocus={handleFocus}
					onBlur={handleBlur}
				/>

				{queries.length > 0 || staging.length > 0 || currentVal ? (
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
