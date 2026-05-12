import { useMemo } from 'react';
import type { MenuItem } from '@signozhq/ui';
import { Button } from '@signozhq/ui';
import { DropdownMenuSimple as Dropdown } from '@signozhq/ui/dropdown-menu';
import { Ellipsis } from '@signozhq/icons';

import { useTraceContext } from '../contexts/TraceContext';

interface TraceOptionsMenuProps {
	showTraceDetails: boolean;
	onToggleTraceDetails: () => void;
	onOpenPreviewFields: () => void;
}

function TraceOptionsMenu({
	showTraceDetails,
	onToggleTraceDetails,
	onOpenPreviewFields,
}: TraceOptionsMenuProps): JSX.Element {
	const { colorByField, setColorByField, availableColorByOptions } =
		useTraceContext();

	const menuItems: MenuItem[] = useMemo(() => {
		const items: MenuItem[] = [
			{
				key: 'toggle-trace-details',
				label: showTraceDetails ? 'Hide trace details' : 'Show trace details',
				onClick: onToggleTraceDetails,
			},
			{
				key: 'preview-fields',
				label: 'Preview fields',
				onClick: onOpenPreviewFields,
			},
		];

		// Only show the "Colour by" submenu if there's an actual choice to make.
		if (availableColorByOptions.length > 1) {
			items.push({
				key: 'colour-by',
				label: 'Colour by',
				children: [
					{
						type: 'group',
						label: 'COLOUR BY',
						children: [
							{
								type: 'radio-group',
								value: colorByField.name,
								onChange: (name: string): void => {
									const next = availableColorByOptions.find(
										(o) => o.field.name === name,
									);
									if (next) {
										setColorByField(next.field);
									}
								},
								children: availableColorByOptions.map((opt) => ({
									type: 'radio',
									key: opt.field.name,
									label: opt.label,
									value: opt.field.name,
								})),
							},
						],
					},
				],
			});
		}

		return items;
	}, [
		showTraceDetails,
		onToggleTraceDetails,
		onOpenPreviewFields,
		colorByField.name,
		setColorByField,
		availableColorByOptions,
	]);

	return (
		<Dropdown menu={{ items: menuItems }}>
			<Button
				variant="solid"
				color="secondary"
				size="sm"
				prefix={<Ellipsis size={14} />}
			/>
		</Dropdown>
	);
}

export default TraceOptionsMenu;
