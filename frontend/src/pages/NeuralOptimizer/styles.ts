import styled, { keyframes } from 'styled-components';

const pulse = keyframes`
  0% { box-shadow: 0 0 10px rgba(0, 255, 128, 0.2); }
  50% { box-shadow: 0 0 30px rgba(0, 255, 128, 0.6); }
  100% { box-shadow: 0 0 10px rgba(0, 255, 128, 0.2); }
`;

export const OptimizerContainer = styled.div`
  padding: 32px;
  background-color: #0d0f12;
  color: #a8b2c1;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  min-height: calc(100vh - 64px);
`;

export const HeaderContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 40px;
  border-bottom: 1px solid rgba(255,255,255,0.1);
  padding-bottom: 24px;

  h1 {
    font-size: 32px;
    font-weight: 800;
    color: #ffffff;
    margin: 0;
    background: linear-gradient(90deg, #00FF88 0%, #00C3FF 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  p {
    margin-top: 8px;
    font-size: 16px;
    color: #8c9baf;
  }
`;

export const LiveStatusBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(0, 255, 128, 0.1);
  border: 1px solid rgba(0, 255, 128, 0.3);
  padding: 8px 16px;
  border-radius: 24px;
  color: #00FF88;
  font-weight: 600;
  font-size: 14px;
  animation: ${pulse} 2s infinite;

  .dot {
    width: 8px;
    height: 8px;
    background-color: #00FF88;
    border-radius: 50%;
  }
`;

export const FeedGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
`;

export const FeedColumn = styled.div`
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-height: 700px;
  overflow-y: auto;

  h2 {
    color: #fff;
    font-size: 20px;
    margin-top: 0;
    margin-bottom: 16px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  /* Custom scrollbar */
  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-track {
    background: rgba(0,0,0,0.1);
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(255,255,255,0.1);
    border-radius: 4px;
  }
`;

export const FeedCard = styled.div<{ $isError?: boolean; $isOvermind?: boolean }>`
  background: ${(props) => 
    props.$isOvermind ? 'rgba(0, 195, 255, 0.05)' :
    props.$isError ? 'rgba(255, 85, 85, 0.05)' : 'rgba(255, 255, 255, 0.03)'};
  border: 1px solid ${(props) => 
    props.$isOvermind ? 'rgba(0, 195, 255, 0.2)' :
    props.$isError ? 'rgba(255, 85, 85, 0.2)' : 'rgba(255, 255, 255, 0.1)'};
  border-left: 4px solid ${(props) => 
    props.$isOvermind ? '#00C3FF' :
    props.$isError ? '#FF5555' : '#8c9baf'};
  padding: 16px;
  border-radius: 8px;
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
  }

  .time {
    font-size: 12px;
    color: #6c798f;
    margin-bottom: 8px;
  }

  .title {
    color: ${(props) => 
      props.$isOvermind ? '#00C3FF' :
      props.$isError ? '#FF5555' : '#ffffff'};
    font-weight: 600;
    font-size: 15px;
    margin-bottom: 12px;
  }

  .tags {
    display: flex;
    gap: 8px;
    margin-top: 16px;
    flex-wrap: wrap;

    span.service {
      background: rgba(255,255,255,0.05);
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 11px;
      color: #8c9baf;
      border: 1px solid rgba(255,255,255,0.1);
    }
    
    span.status {
      background: rgba(0,0,0,0.3);
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 700;
      border: 1px solid rgba(255,255,255,0.1);
    }
  }

  &.fade-in {
    animation: fadeIn 0.5s ease-out forwards;
    opacity: 0;
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;

export const TerminalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #6c798f;
  margin-bottom: 12px;
  border-bottom: 1px solid rgba(255,255,255,0.05);
  padding-bottom: 8px;
`;

export const TerminalContent = styled.div<{ $highlight?: boolean }>`
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  line-height: 1.6;
  color: ${(props) => props.$highlight ? '#e2e8f0' : '#94a3b8'};
  background: #06080a;
  padding: 16px;
  border-radius: 6px;
  white-space: pre-wrap;
  word-break: break-word;
  border: 1px solid rgba(255,255,255,0.02);
  box-shadow: inset 0 2px 4px rgba(0,0,0,0.5);
`;
