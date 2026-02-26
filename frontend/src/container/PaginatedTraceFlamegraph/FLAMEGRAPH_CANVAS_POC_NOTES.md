# Flamegraph Canvas POC Notes

## Overview
This document tracks the proof-of-concept (POC) implementation of a canvas-based flamegraph rendering system, replacing the previous DOM-based approach.

## Implementation Status

### ✅ Completed Features

1. **Canvas-based Rendering**
   - Replaced DOM elements (`react-virtuoso` and `div.span-item`) with a single HTML5 Canvas
   - Implemented `drawFlamegraph` function to render all spans as rectangles on canvas
   - Added device pixel ratio (DPR) support for crisp rendering

2. **Time-window-based Zoom**
   - Replaced pixel-based zoom/pan with time-window-based approach (`viewStartTs`, `viewEndTs`)
   - Prevents pixelation by redrawing from data with new time bounds
   - Zoom anchors to cursor position
   - Horizontal zoom works correctly (min: 1/100th of trace, max: full trace)

3. **Drag to Pan**
   - Implemented drag-to-pan functionality for navigating the canvas
   - Differentiates between click (span selection) and drag (panning) based on distance moved
   - Prevents unwanted window zoom

4. **Minimap with 2D Navigation**
   - Canvas-based minimap showing density histogram (time × levels)
   - 2D brush overlay for both horizontal (time) and vertical (levels) navigation
   - Draggable brush to pan both dimensions
   - Bidirectional synchronization between main canvas and minimap

5. **Timeline Synchronization**
   - `TimelineV2` component synchronized with visible time window
   - Updates correctly during zoom and pan operations

6. **Hit Testing**
   - Implemented span rectangle tracking for click detection
   - Tooltip on hover
   - Span selection via click

### ❌ Known Issues / Not Working

1. **Vertical Zoom - NOT WORKING**
   - **Status**: Attempted implementation but not functioning correctly
   - **Issue**: When horizontal zoom reaches maximum (full trace width), vertical zoom cannot continue to zoom out further
   - **Attempted Solution**: Added `rowHeightScale` state to control vertical row spacing, but the implementation does not work as expected
   - **Impact**: Users cannot fully zoom out vertically to see all levels when horizontal zoom is at maximum
   - **Next Steps**: Needs further investigation and alternative approach

2. **Timeline Scale Alignment - NOT WORKING PROPERLY**
   - **Status**: Issue identified but not fully resolved
   - **Issue**: The timeline scale does not align properly when dragging/panning the canvas. The timeline aligns correctly during zoom operations, but not during drag/pan operations.
   - **Impact**: Timeline may show incorrect time values while dragging the canvas
   - **Attempted Solution**: Used refs (`viewStartTsRef`, `viewEndTsRef`) to track current time window and incremental delta calculation, but issue persists
   - **Next Steps**: Needs further investigation to ensure timeline stays synchronized during all interaction types

### 🔄 Pending / Future Work

1. **Performance Optimization**
   - Consider adding an interaction layer (separate canvas on top) for better performance
   - Optimize rendering for large traces

2. **Code Quality**
   - Reduce cognitive complexity of `drawFlamegraph` function (currently 26, target: 15)
   - Reduce cognitive complexity of `drawMinimap` function (currently 30, target: 15)

3. **Additional Features**
   - Keyboard shortcuts for navigation
   - Better zoom controls
   - Export functionality

## Technical Details

### Key Files Modified
- `frontend/src/container/PaginatedTraceFlamegraph/TraceFlamegraphStates/Success/Success.tsx` - Main rendering component
- `frontend/src/container/PaginatedTraceFlamegraph/TraceFlamegraphStates/Success/Success.styles.scss` - Styles for canvas and minimap
- `frontend/src/components/TimelineV2/TimelineV2.tsx` - Timeline synchronization

### Key Concepts
- **Time-window-based zoom**: Instead of scaling canvas bitmap, redraw from data with new time bounds
- **Device Pixel Ratio**: Render at DPR resolution for crisp display on high-DPI screens
- **2D Minimap**: Shows density heatmap across both time (horizontal) and levels (vertical) dimensions
- **Brush Navigation**: Draggable rectangle overlay for panning both dimensions

## Notes
- This is a POC implementation - code quality and optimization can be improved after validation
- Some linting warnings (cognitive complexity) are acceptable for POC phase
- All changes should be validated before production use
