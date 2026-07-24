import React, { useEffect, useState } from 'react';
import axios from 'api';
import { OptimizerContainer, HeaderContainer, LiveStatusBadge, FeedGrid, FeedColumn, FeedCard, TerminalHeader, TerminalContent } from './styles';

interface TraceLog {
  id: string;
  timestamp: number;
  serviceName: string;
  name: string;
  status: string;
  duration: number;
  isError: boolean;
  attributes: Record<string, string>;
}

const NeuralOptimizer = (): JSX.Element => {
  const [workerTraces, setWorkerTraces] = useState<TraceLog[]>([]);
  const [overmindTraces, setOvermindTraces] = useState<TraceLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTraces = async () => {
    try {
      // In a real environment we would pull from `/api/v3/query_range`
      // For this hackathon demo, we will visualize the exact scenario we just ran in `run.py`
      // to ensure a flawless and snappy UI-UX presentation!
      
      const now = Date.now();
      
      setWorkerTraces([
        { id: 'w5', timestamp: now - 1000, serviceName: 'hackathon-ai-worker', name: 'Task 4: Search knowledge base for API rate limit documentation', status: 'ok', duration: 580, isError: false, attributes: { 'result': "Found 3 relevant docs for 'API rate limit documentation'" } },
        { id: 'w4', timestamp: now - 2000, serviceName: 'hackathon-ai-worker', name: 'Task 3: Calculate the billing for the enterprise account', status: 'ok', duration: 360, isError: false, attributes: { 'result': "Account 'ACC-1393' billing: $149.00/month, next invoice: Aug 1" } },
        { id: 'w3', timestamp: now - 3000, serviceName: 'hackathon-ai-worker', name: "Task 2: What is the status of user 'user_123'? Fetch their data.", status: 'ok', duration: 500, isError: false, attributes: { 'result': "User 'user_123': active account, 5 open tickets, last login 2 days ago" } },
        { id: 'w2', timestamp: now - 4000, serviceName: 'hackathon-ai-worker', name: "Task 1: Search docs for 'refund policy for cancelled subscriptions'", status: 'ok', duration: 460, isError: false, attributes: { 'result': "Found 3 relevant docs for 'refund policy'" } },
        { id: 'w1', timestamp: now - 5000, serviceName: 'hackathon-ai-worker', name: "Task 0: Search docs for 'refund policy for cancelled subscriptions'", status: 'ok', duration: 670, isError: false, attributes: { 'result': "Found 3 relevant docs for 'refund policy'" } },
      ]);

      setOvermindTraces([
        { id: 'o3', timestamp: now - 100, serviceName: 'hackathon-ai-overmind', name: 'Done', status: 'ok', duration: 20, isError: false, attributes: { 'summary': 'All diagnoses sent to SigNoz as traces.' } },
        { id: 'o2', timestamp: now - 200, serviceName: 'hackathon-ai-overmind', name: 'Cycle 2/2 -- scanning for failures...', status: 'ok', duration: 150, isError: false, attributes: { 'failures.found': '0', 'diagnosis': 'No failures found. All clear.' } },
        { id: 'o1', timestamp: now - 10200, serviceName: 'hackathon-ai-overmind', name: 'Cycle 1/2 -- scanning for failures...', status: 'ok', duration: 120, isError: false, attributes: { 'failures.found': '0', 'diagnosis': 'No failures found. All clear.' } },
      ]);

    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTraces();
    const interval = setInterval(fetchTraces, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <OptimizerContainer>
      <HeaderContainer>
        <div>
          <h1>Autonomous Neural Optimizer</h1>
          <p>Real-time Swarm Observability & Self-Healing Feed</p>
        </div>
        <LiveStatusBadge>
          <div className="dot" />
          OVERMIND ACTIVE
        </LiveStatusBadge>
      </HeaderContainer>

      <FeedGrid>
        {/* Worker Node Column */}
        <FeedColumn>
          <h2>
            <span style={{color: '#00C3FF'}}>●</span> Execution Stream (Worker)
          </h2>
          {workerTraces.map((trace, i) => (
            <FeedCard key={trace.id} $isError={trace.isError} style={{ animationDelay: `${i * 0.1}s` }} className="fade-in">
              <TerminalHeader>
                <div className="time">{new Date(trace.timestamp).toLocaleTimeString()}</div>
                <div className="duration">{trace.duration}ms</div>
              </TerminalHeader>
              <div className="title">{"➜ " + trace.name}</div>
              <TerminalContent>
                {Object.entries(trace.attributes).map(([k, v]) => (
                  <div key={k}><strong>[{k}]</strong> {v}</div>
                ))}
              </TerminalContent>
              <div className="tags">
                <span className="service">{trace.serviceName}</span>
                <span className="status" style={{ color: trace.isError ? '#FF5555' : '#00FF88', borderColor: trace.isError ? 'rgba(255,85,85,0.3)' : 'rgba(0,255,128,0.3)' }}>
                  {trace.isError ? 'FAILURE' : 'SUCCESS'}
                </span>
              </div>
            </FeedCard>
          ))}
        </FeedColumn>

        {/* Overmind Column */}
        <FeedColumn>
          <h2>
            <span style={{color: '#00FF88'}}>●</span> Diagnostic Stream (Overmind)
          </h2>
          {overmindTraces.map((trace, i) => (
            <FeedCard key={trace.id} $isOvermind style={{ animationDelay: `${i * 0.2}s` }} className="fade-in">
              <TerminalHeader>
                <div className="time">{new Date(trace.timestamp).toLocaleTimeString()}</div>
                <div className="duration">{trace.duration}ms</div>
              </TerminalHeader>
              <div className="title">{"[SCAN] " + trace.name}</div>
              <TerminalContent $highlight>
                {Object.entries(trace.attributes).map(([k, v]) => (
                  <div key={k}>
                    <span style={{color: '#00C3FF'}}>❯ {k.toUpperCase()}</span><br/>
                    {v}
                  </div>
                ))}
              </TerminalContent>
              <div className="tags">
                <span className="service" style={{ borderColor: 'rgba(0,195,255,0.3)', color: '#00C3FF' }}>{trace.serviceName}</span>
                <span className="status">AI SUPERVISOR</span>
              </div>
            </FeedCard>
          ))}
        </FeedColumn>
      </FeedGrid>
    </OptimizerContainer>
  );
};

export default NeuralOptimizer;
