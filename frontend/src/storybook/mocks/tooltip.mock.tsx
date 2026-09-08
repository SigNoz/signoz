// The barrel is banned for the ~90 components it eagerly loads in a test run.
// This module stands in for the `tooltip` subpath, so importing that subpath
// here would resolve back to itself; the barrel is the only specifier left that
// reaches the real components, and it never runs under jest.
import {
	TooltipContent as UiTooltipContent,
	TooltipProvider as UiTooltipProvider,
	TooltipRoot as UiTooltipRoot,
	TooltipSimple as UiTooltipSimple,
	TooltipTrigger as UiTooltipTrigger,
	type TooltipRootProps,
	type TooltipSimpleProps,
	// eslint-disable-next-line signoz/no-signozhq-ui-barrel
} from '@signozhq/ui';
import { forwardRef } from 'react';

import { heldOpenState } from './tooltipsHeldOpen';

/**
 * Replaces `@signozhq/ui/tooltip` in Storybook (aliased in `.storybook/main.ts`)
 * so the Tooltips control can hold every tooltip a page renders open at once.
 * See the Tooltips section of `src/storybook/README.md`.
 *
 * The real components are imported from the package root, which re-exports them
 * over a relative path the alias does not match. The app therefore still sees
 * one tooltip context rather than two that cannot talk to each other.
 */
const HeldTooltipSimple = forwardRef<HTMLButtonElement, TooltipSimpleProps>(
	(props, ref) => (
		<UiTooltipSimple
			{...props}
			ref={ref}
			open={heldOpenState(props.open, props.title)}
		/>
	),
);

HeldTooltipSimple.displayName = 'TooltipSimple';

function HeldTooltipRoot({ open, ...props }: TooltipRootProps): JSX.Element {
	return <UiTooltipRoot {...props} open={heldOpenState(open, true)} />;
}

/**
 * The annotation checks the module's shape against the real one, so an export
 * added to the tooltip module fails to compile here rather than at render.
 */
const tooltipModule: typeof import('@signozhq/ui/tooltip') = {
	TooltipContent: UiTooltipContent,
	TooltipProvider: UiTooltipProvider,
	TooltipRoot: HeldTooltipRoot,
	TooltipSimple: HeldTooltipSimple,
	TooltipTrigger: UiTooltipTrigger,
};

export const {
	TooltipContent,
	TooltipProvider,
	TooltipRoot,
	TooltipSimple,
	TooltipTrigger,
} = tooltipModule;

export type {
	TooltipContentProps,
	TooltipProviderProps,
	TooltipRootProps,
	TooltipSimpleProps,
	TooltipTriggerProps,
	// eslint-disable-next-line signoz/no-signozhq-ui-barrel
} from '@signozhq/ui';
