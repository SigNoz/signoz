import type { ComponentType } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Route } from 'react-router-dom';
import ROUTES from 'constants/routes';
import { expect, screen, userEvent, waitFor } from 'storybook/test';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import { panelEditorMocks } from '../PanelEditorPage.stories.mocks';
import { addThreshold, openLinkDialog } from './panelEditorPlay';

import PanelEditorPage from '../../PanelEditorPage';

type PanelEditorArgs = PageStoryArgs<typeof panelEditorMocks>;

const pageStory = storyMocks(panelEditorMocks, { layout: 'app' });

/**
 * The panel editor's Thresholds and Context Links sections. A threshold row
 * takes the shape of its panel kind: a labelled line on a chart, a comparison
 * on a number, a column rule on a table. A context link opens a dialog whose
 * URL can carry the dashboard's variables.
 *
 * Route: `/dashboard/:dashboardId/panel/:panelId`.
 */
const meta = {
	title: 'Pages/Dashboards/Panel Editor/Thresholds and Links',
	tags: ['authz', 'play'],
	component: PanelEditorPage as ComponentType<PanelEditorArgs>,
	render: (): JSX.Element => (
		<Route path={ROUTES.DASHBOARD_PANEL_EDITOR} component={PanelEditorPage} />
	),
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<PanelEditorArgs>;

export default meta;

type Story = StoryObj<PanelEditorArgs>;

/** A time series threshold: a value, a color and a label drawn on the chart. */
export const Threshold: Story = {
	play: async () => {
		await addThreshold();
		await screen.findByTestId('threshold-value-0');
	},
};

/** The threshold's custom color picker, open beside the preset swatches. */
export const ThresholdColorOpen: Story = {
	play: async (context) => {
		await Threshold.play?.(context);
		await userEvent.click(screen.getByTestId('threshold-color-0-custom'));
		await waitFor(() =>
			expect(
				document.querySelector('.ant-color-picker-inner-content'),
			).toBeVisible(),
		);
	},
};

/** A number panel's threshold, which compares the value and recolors it. */
export const NumberThreshold: Story = {
	args: { panel: 'p99-latency' },
	play: async () => {
		await addThreshold('panel-editor-v2-add-comparison-threshold');
		await screen.findByTestId('comparison-threshold-operator-0');
	},
};

/** A table's threshold, which picks the column it colors. */
export const TableThreshold: Story = {
	args: { panel: 'top-endpoints' },
	play: async () => {
		await addThreshold('panel-editor-v2-add-table-threshold');
		await screen.findByTestId('table-threshold-column-0');
	},
};

/** The add-link dialog, empty, with Save waiting for a URL. */
export const ContextLinkDialog: Story = {
	play: async () => {
		await openLinkDialog();
	},
};

/** The URL field focused, offering the variables it can interpolate. */
export const ContextLinkVariables: Story = {
	play: async () => {
		await openLinkDialog();
		await userEvent.click(screen.getByTestId('context-link-url'));
		await screen.findByTestId('context-link-variable-service');
	},
};

/** A URL with query parameters, split into rows that can be edited one by one. */
export const ContextLinkParams: Story = {
	play: async () => {
		await openLinkDialog();
		await userEvent.type(
			screen.getByTestId('context-link-label'),
			'Open service traces',
		);
		await userEvent.click(screen.getByTestId('context-link-url'));
		await userEvent.paste(
			'/traces-explorer?service={{service}}&env={{environment}}',
		);
		// Leaving the URL closes the variables list that covers the rows.
		await userEvent.click(screen.getByTestId('context-link-label'));
		await screen.findByTestId('context-link-param-key-1');
	},
};

/** A URL the link cannot open, which the field flags and Save refuses. */
export const ContextLinkInvalidUrl: Story = {
	play: async () => {
		await openLinkDialog();
		await userEvent.click(screen.getByTestId('context-link-url'));
		await userEvent.paste('traces for {{service}}');
		await screen.findByTestId('context-link-url-error');
	},
};

/** A saved link, listed in the section with its edit and remove actions. */
export const ContextLinkSaved: Story = {
	play: async (context) => {
		await ContextLinkParams.play?.(context);
		await userEvent.click(screen.getByTestId('context-link-save'));
		await waitFor(() =>
			expect(screen.queryByTestId('context-link-dialog')).toBeNull(),
		);
		await screen.findByTestId('context-link-item-0');
	},
};
