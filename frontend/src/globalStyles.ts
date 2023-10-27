import { createGlobalStyle } from 'styled-components';

const GlobalStyles = createGlobalStyle`
#root,
html,
body {
  height: 100%;
  overflow: hidden;
}

body {
  padding: 0;
  margin: 0;
  box-sizing: border-box;
}

.u-legend {
  max-height: 30px; // slicing the height of the widget Header height ;
  overflow-y: auto;
}

#overlay {
  font-family: 'Lucida Sans', 'Lucida Sans Regular', 'Lucida Grande',
    'Lucida Sans Unicode', Geneva, Verdana, sans-serif;
  font-size: 12px;
  position: absolute;
  background: rgba(0, 0, 0, 0.9);
  padding: 0.5rem;
  margin: 0.5rem;
  color: #fff;
  z-index: 100;
  pointer-events: none;
  overflow: auto;
  max-height: 300px;
  border-radius: 5px;
}

.tooltip-content-row {
  display: flex;
  align-items: center;
  gap: 4px;
}
`;

export default GlobalStyles;
