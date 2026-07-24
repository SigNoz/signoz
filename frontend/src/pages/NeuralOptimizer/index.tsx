import React, { useEffect, useState } from 'react';
import axios, { ApiV3Instance, ApiV5Instance } from 'api';
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

  const fetchTracesForService = async (serviceName: string): Promise<TraceLog[]> => {
    const endMs = Date.now();
    const startMs = endMs - 24 * 60 * 60 * 1000; // last 24 hours to ensure we catch recent traces

    // Attempt 1: Try V5 query_range
    try {
      const v5Payload = {
        schemaVersion: 'v5',
        start: startMs,
        end: endMs,
        requestType: 'trace',
        compositeQuery: {
          queries: [
            {
              type: 'builder_query',
              spec: {
                signal: 'traces',
                filter: { expression: `serviceName == '${serviceName}'` },
                order: [{ key: { name: 'timestamp' }, direction: 'desc' }],
                limit: 15,
              },
            },
          ],
        },
      };
      const resV5 = await ApiV5Instance.post('/query_range', v5Payload);
      const rows = resV5?.data?.data?.results?.[0]?.rows || resV5?.data?.data?.result?.[0]?.list || [];
      if (rows.length > 0) {
        return rows.map((row: any, idx: number) => ({
          id: row.traceId || row.spanId || `${serviceName}-${idx}`,
          timestamp: row.timestamp ? new Date(row.timestamp).getTime() : Date.now(),
          serviceName,
          name: row.name || row.spanName || row.data?.name || 'agent_task',
          status: row.statusCode === 2 || row.hasError || row.data?.hasError ? 'error' : 'ok',
          duration: row.durationMs || Math.floor((row.durationNano || 0) / 1000000) || 120,
          isError: row.statusCode === 2 || row.hasError || row.data?.hasError || false,
          attributes: row.tagMap || row.attributes || row.data?.tagMap || { 'service.name': serviceName },
        }));
      }
    } catch {
      // Ignore and try fallback
    }

    // Attempt 2: Try V3 query_range
    try {
      const v3Payload = {
        start: startMs * 1000000,
        end: endMs * 1000000,
        step: 60,
        compositeQuery: {
          queryType: 'builder',
          panelType: 'list',
          builderQueries: {
            A: {
              queryName: 'A',
              dataSource: 'traces',
              aggregateOperator: 'noop',
              limit: 15,
              orderBy: [{ columnName: 'timestamp', order: 'desc' }],
              filters: {
                items: [
                  {
                    key: { key: 'serviceName', dataType: 'string', type: 'resource' },
                    op: '=',
                    value: serviceName,
                  },
                ],
                op: 'AND',
              },
            },
          },
        },
      };
      const resV3 = await ApiV3Instance.post('/query_range', v3Payload);
      const rows = resV3?.data?.data?.result?.[0]?.list || resV3?.data?.payload?.list || [];
      if (rows.length > 0) {
        return rows.map((row: any, idx: number) => ({
          id: row.traceId || row.spanId || `${serviceName}-${idx}`,
          timestamp: row.timestamp ? Math.floor(row.timestamp / 1000000) : Date.now(),
          serviceName,
          name: row.name || row.spanName || 'agent_task',
          status: row.statusCode === 2 || row.hasError ? 'error' : 'ok',
          duration: row.durationMs || Math.floor((row.durationNano || 0) / 1000000) || 120,
          isError: row.statusCode === 2 || row.hasError || false,
          attributes: row.tagMap || row.attributes || { 'service.name': serviceName },
        }));
      }
    } catch {
      // Ignore and try fallback
    }

    // Attempt 3: Try legacy /getFilteredSpans endpoint
    try {
      const legacyPayload = {
        start: String(startMs * 1000000),
        end: String(endMs * 1000000),
        limit: 15,
        offset: 0,
        serviceName: [serviceName],
        tags: [],
      };
      const resLegacy = await axios.post('/getFilteredSpans', legacyPayload);
      const rows = resLegacy?.data?.spans || resLegacy?.data?.payload?.spans || [];
      if (rows.length > 0) {
        return rows.map((row: any, idx: number) => ({
          id: row.traceId || row.spanId || `${serviceName}-${idx}`,
          timestamp: row.timestamp ? Math.floor(row.timestamp / 1000000) : Date.now(),
          serviceName,
          name: row.operationName || row.name || 'agent_task',
          status: row.statusCode === 'ERROR' || row.hasError ? 'error' : 'ok',
          duration: row.durationMs || Math.floor((row.durationNano || 0) / 1000000) || 120,
          isError: row.statusCode === 'ERROR' || row.hasError || false,
          attributes: row.tagMap || row.attributes || { 'service.name': serviceName },
        }));
      }
    } catch {
      // Ignore
    }

    return [];
  };

  const fetchTraces = async () => {
    setIsLoading(true);
    try {
      const [workers, overminds] = await Promise.all([
        fetchTracesForService('hackathon-ai-worker'),
        fetchTracesForService('hackathon-ai-overmind'),
      ]);

      setWorkerTraces(workers);
      setOvermindTraces(overminds);
    } catch (e) {
      console.error('Error fetching live traces:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTraces();
    const interval = setInterval(fetchTraces, 5000);
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
          {isLoading ? 'SYNCING SIGNOZ...' : 'OVERMIND ACTIVE'}
        </LiveStatusBadge>
      </HeaderContainer>

      <FeedGrid>
        {/* Worker Node Column */}
        <FeedColumn>
          <h2>
            <span style={{ color: '#00C3FF' }}>●</span> Execution Stream (Worker)
          </h2>
          {workerTraces.length === 0 ? (
            <FeedCard $isError={false}>
              <TerminalHeader>
                <div className="time">Awaiting Telemetry</div>
              </TerminalHeader>
              <div className="title">No live worker traces detected in SigNoz</div>
              <TerminalContent>
                Run <code style={{ color: '#00FF88' }}>python run.py</code> inside <code style={{ color: '#00C3FF' }}>hackathon-agent/</code> to stream live agent execution traces to ClickHouse.
              </TerminalContent>
            </FeedCard>
          ) : (
            workerTraces.map((trace, i) => (
              <FeedCard key={trace.id} $isError={trace.isError} style={{ animationDelay: `${i * 0.1}s` }} className="fade-in">
                <TerminalHeader>
                  <div className="time">{new Date(trace.timestamp).toLocaleTimeString()}</div>
                  <div className="duration">{trace.duration}ms</div>
                </TerminalHeader>
                <div className="title">{'➜ ' + trace.name}</div>
                <TerminalContent>
                  {Object.entries(trace.attributes).map(([k, v]) => (
                    <div key={k}>
                      <strong>[{k}]</strong> {String(v)}
                    </div>
                  ))}
                </TerminalContent>
                <div className="tags">
                  <span className="service">{trace.serviceName}</span>
                  <span
                    className="status"
                    style={{
                      color: trace.isError ? '#FF5555' : '#00FF88',
                      borderColor: trace.isError ? 'rgba(255,85,85,0.3)' : 'rgba(0,255,128,0.3)',
                    }}
                  >
                    {trace.isError ? 'FAILURE' : 'SUCCESS'}
                  </span>
                </div>
              </FeedCard>
            ))
          )}
        </FeedColumn>

        {/* Overmind Column */}
        <FeedColumn>
          <h2>
            <span style={{ color: '#00FF88' }}>●</span> Diagnostic Stream (Overmind)
          </h2>
          {overmindTraces.length === 0 ? (
            <FeedCard $isOvermind>
              <TerminalHeader>
                <div className="time">Awaiting Telemetry</div>
              </TerminalHeader>
              <div className="title">No live overmind diagnoses detected in SigNoz</div>
              <TerminalContent $highlight>
                Overmind scans ClickHouse for failed worker traces and posts root-cause diagnoses back into SigNoz.
              </TerminalContent>
            </FeedCard>
          ) : (
            overmindTraces.map((trace, i) => (
              <FeedCard key={trace.id} $isOvermind style={{ animationDelay: `${i * 0.2}s` }} className="fade-in">
                <TerminalHeader>
                  <div className="time">{new Date(trace.timestamp).toLocaleTimeString()}</div>
                  <div className="duration">{trace.duration}ms</div>
                </TerminalHeader>
                <div className="title">{'[SCAN] ' + trace.name}</div>
                <TerminalContent $highlight>
                  {Object.entries(trace.attributes).map(([k, v]) => (
                    <div key={k}>
                      <span style={{ color: '#00C3FF' }}>❯ {k.toUpperCase()}</span>
                      <br />
                      {String(v)}
                    </div>
                  ))}
                </TerminalContent>
                <div className="tags">
                  <span className="service" style={{ borderColor: 'rgba(0,195,255,0.3)', color: '#00C3FF' }}>
                    {trace.serviceName}
                  </span>
                  <span className="status">AI SUPERVISOR</span>
                </div>
              </FeedCard>
            ))
          )}
        </FeedColumn>
      </FeedGrid>
    </OptimizerContainer>
  );
};

export default NeuralOptimizer;
