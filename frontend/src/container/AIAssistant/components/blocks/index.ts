/**
 * AI response block system.
 *
 * Import this module once (e.g. in MessageBubble / StreamingMessage) to
 * register all built-in block types.  External modules can extend the registry
 * at any time:
 *
 *   import { BlockRegistry } from 'container/AIAssistant/components/blocks';
 *   BlockRegistry.register('my-panel', MyPanelComponent);
 */

import ActionBlock from './ActionBlock';
import { BlockRegistry } from './BlockRegistry';
import ConfirmBlock from './ConfirmBlock';
import InteractiveQuestion from './InteractiveQuestion';

// ─── Register built-in block types ───────────────────────────────────────────

BlockRegistry.register('question', InteractiveQuestion);
BlockRegistry.register('confirm', ConfirmBlock);
// Page-aware action block
BlockRegistry.register('action', ActionBlock);

// ─── Public exports ───────────────────────────────────────────────────────────

export { BlockRegistry } from './BlockRegistry';
export { default as RichCodeBlock } from './RichCodeBlock';
