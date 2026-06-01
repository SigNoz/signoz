import { Button } from 'antd';
import { Badge } from '@signozhq/ui/badge';
import { Typography } from '@signozhq/ui/typography';
import {
	ClipboardType,
	DatabaseZap,
	Info,
	LayoutList,
	Pyramid,
} from '@signozhq/icons';
import { Color } from '@signozhq/design-tokens';
import cx from 'classnames';
import TextToolTip from 'components/TextToolTip';
import { useIsDarkMode } from 'hooks/useDarkMode';

import { LabelContainer, VariableItemRow } from '../../../../DashboardContainer/DashboardSettings/DashboardVariableSettings/VariableItem/styles';
import type { V2VariableKind } from '../types';

import '../../../../DashboardContainer/DashboardSettings/DashboardVariableSettings/VariableItem/VariableItem.styles.scss';

interface Props {
	kind: V2VariableKind;
	onChange: (kind: V2VariableKind) => void;
}

function TypeSelector({ kind, onChange }: Props): JSX.Element {
	const isDarkMode = useIsDarkMode();

	return (
		<VariableItemRow className="variable-type-section">
			<LabelContainer className="variable-type-label-container">
				<Typography className="typography-variables">Variable Type</Typography>
				<TextToolTip
					text="Learn more about supported variable types"
					url="https://signoz.io/docs/userguide/manage-variables/#supported-variable-types"
					urlText="here"
					useFilledIcon={false}
					outlinedIcon={
						<Info
							size={14}
							style={{
								color: isDarkMode ? Color.BG_VANILLA_100 : Color.BG_INK_500,
								marginTop: 1,
							}}
						/>
					}
				/>
			</LabelContainer>

			<div className="variable-type-btn-group">
				<Button
					type="text"
					icon={<Pyramid size={14} />}
					className={cx(
						'variable-type-btn',
						kind === 'DYNAMIC' ? 'selected' : '',
					)}
					onClick={(): void => onChange('DYNAMIC')}
					data-testid="variable-type-dynamic-v2"
				>
					Dynamic
					<Badge className="sidenav-beta-tag" color="robin">
						Beta
					</Badge>
				</Button>
				<Button
					type="text"
					icon={<ClipboardType size={14} />}
					className={cx(
						'variable-type-btn',
						kind === 'TEXT' ? 'selected' : '',
					)}
					onClick={(): void => onChange('TEXT')}
					data-testid="variable-type-text-v2"
				>
					Textbox
				</Button>
				<Button
					type="text"
					icon={<LayoutList size={14} />}
					className={cx(
						'variable-type-btn',
						kind === 'CUSTOM' ? 'selected' : '',
					)}
					onClick={(): void => onChange('CUSTOM')}
					data-testid="variable-type-custom-v2"
				>
					Custom
				</Button>
				<Button
					type="text"
					icon={<DatabaseZap size={14} />}
					className={cx(
						'variable-type-btn',
						kind === 'QUERY' ? 'selected' : '',
					)}
					onClick={(): void => onChange('QUERY')}
					data-testid="variable-type-query-v2"
				>
					Query
					<Badge className="sidenav-beta-tag" color="warning">
						Not Recommended
					</Badge>
					<div onClick={(e): void => e.stopPropagation()}>
						<TextToolTip
							text="Learn why we don't recommend"
							url="https://signoz.io/docs/userguide/manage-variables/#why-avoid-clickhouse-query-variables"
							urlText="here"
							useFilledIcon={false}
							outlinedIcon={
								<Info
									size={14}
									style={{
										color: isDarkMode ? Color.BG_VANILLA_100 : Color.BG_INK_500,
										marginTop: 1,
									}}
								/>
							}
						/>
					</div>
				</Button>
			</div>
		</VariableItemRow>
	);
}

export default TypeSelector;
