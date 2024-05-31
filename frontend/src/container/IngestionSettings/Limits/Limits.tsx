import './Limits.styles.scss';

import { CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { InputNumber, Select, Switch } from 'antd';
import { useEffect, useState } from 'react';
const { Option } = Select;

const LIMITS = [
	{
		id: 'yearly',
		title: 'Yearly limit',
		subTitle: 'Add a limit for data ingested yearly',
	},
	{
		id: 'monthly',
		title: 'Monthly limit',
		subTitle: 'Add a limit for data ingested monthly',
	},
	{
		id: 'daily',
		title: 'Daily limit',
		subTitle: 'Add a limit for data ingested daily',
	},
	{
		id: 'hourly',
		title: 'Hourly limit',
		subTitle: 'Add a limit for data ingested hourly',
	},
	{
		id: 'minute',
		title: 'Per minute limit',
		subTitle: 'Add a limit for data ingested every minute',
	},
	{
		id: 'second',
		title: 'Per second limit',
		subTitle: 'Add a limit for data ingested every second',
	},
];

export interface LimitProps {
	size: number;
	count: number;
	sizeUnit: string;
	enabled: boolean;
}

interface LimitsProps {
	id: string;
	onLimitUpdate: (
		id: string,
		data: {
			[key: string]: LimitProps;
		},
	) => void;
}

export default function Limits({ id, onLimitUpdate }: LimitsProps) {
	const [limitValues, setLimitValues] = useState<{
		[key: string]: LimitProps;
	}>(() => {
		const initialLimits: {
			[key: string]: LimitProps;
		} = {};

		LIMITS.forEach((limit) => {
			initialLimits[limit.id] = {
				size: 0,
				count: 0,
				sizeUnit: 'GB',
				enabled: false,
			};
		});
		return initialLimits;
	});

	const handleChange = (
		limitId: string,
		field: string,
		value: number | string | boolean,
	) => {
		setLimitValues((prevState) => ({
			...prevState,
			[limitId]: {
				...prevState[limitId],
				[field]: value,
			},
		}));
	};

	const handleBlur = (
		limitId: string,
		field: string,
		value: number | string | boolean,
	) => {
		// Call handleChange only on blur
		handleChange(limitId, field, value);
	};

	useEffect(() => {
		onLimitUpdate(id, limitValues);
	}, [limitValues]);

	return (
		<div className="ingestion-key-limits-container">
			{LIMITS.map((limit) => {
				return (
					<div className={`limit ${limit.id}`} key={limit.id}>
						<div className="header">
							<div className="info">
								<div className="title">{limit.title}</div>

								<div className="sub-title">{limit.subTitle}</div>
							</div>

							<div className="enable-disable-toggle">
								<Switch
									checkedChildren={<CheckOutlined />}
									unCheckedChildren={<CloseOutlined />}
									defaultChecked={limitValues[limit.id].enabled}
									onChange={(value) => handleBlur(limit.id, 'enabled', value)}
								/>
							</div>
						</div>

						<div className="size-count-limit-inputs">
							<div className="size">
								<InputNumber
									min={1}
									type="number"
									disabled={!limitValues[limit.id].enabled}
									addonAfter={
										<Select
											defaultValue="GB"
											onChange={(value) => handleBlur(limit.id, 'sizeUnit', value)}
											disabled={!limitValues[limit.id].enabled}
										>
											<Option value="TB">Terrabytes</Option>
											<Option value="GB">Gigabytes</Option>
											<Option value="MB">Megabytes</Option>
											<Option value="KB">Kilobytes</Option>
										</Select>
									}
									onBlur={(e) =>
										handleBlur(
											limit.id,
											'size',
											e.target.value ? parseInt(e.target.value) : 0,
										)
									}
								/>
							</div>

							<div className="divider">OR</div>
							<div className="count">
								<InputNumber
									addonAfter="Spans"
									disabled={!limitValues[limit.id].enabled}
									min={1}
									onBlur={(e) =>
										handleBlur(
											limit.id,
											'count',
											e.target.value ? parseInt(e.target.value) : 0,
										)
									}
								/>
							</div>
						</div>
					</div>
				);
			})}
		</div>
	);
}
