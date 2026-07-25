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

const extractRowsFromResponse = (obj: any): any[] => {
  if (!obj || typeof obj !== 'object') return [];
  if (Array.isArray(obj)) return obj;

  if (Array.isArray(obj.rows)) return obj.rows;
  if (Array.isArray(obj.list)) return obj.list;
  if (Array.isArray(obj.spans)) return obj.spans;

  if (Array.isArray(obj.results)) {
    for (const item of obj.results) {
      const sub = extractRowsFromResponse(item);
      if (sub.length > 0) return sub;
    }
  }
  if (Array.isArray(obj.result)) {
    for (const item of obj.result) {
      const sub = extractRowsFromResponse(item);
      if (sub.length > 0) return sub;
    }
  }

  if (obj.data) {
    const sub = extractRowsFromResponse(obj.data);
    if (sub.length > 0) return sub;
  }
  if (obj.payload) {
    const sub = extractRowsFromResponse(obj.payload);
    if (sub.length > 0) return sub;
  }

  return [];
};

const NeuralOptimizer = (): JSX.Element => {
  const [workerTraces, setWorkerTraces] = useState<TraceLog[]>([]);
  const [overmindTraces, setOvermindTraces] = useState<TraceLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTracesForService = async (serviceName: string): Promise<TraceLog[]> => {
    const endMs = Date.now();
    const startMs = endMs - 24 * 60 * 60 * 1000; // last 24 hours

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
      const rows = extractRowsFromResponse(resV5.data);
      if (rows.length > 0) {
        return rows.map((row: any, idx: number) => {
          const item = row.data || row;
          return {
            id: item.traceId || item.traceID || item.spanId || `${serviceName}-${idx}`,
            timestamp: item.timestamp ? new Date(item.timestamp).getTime() : Date.now(),
            serviceName,
            name: item.name || item.spanName || item.operationName || 'agent_task',
            status: item.statusCode === 2 || item.statusCode === 'ERROR' || item.hasError ? 'error' : 'ok',
            duration: item.durationMs || Math.floor((item.durationNano || 0) / 1000000) || 120,
            isError: item.statusCode === 2 || item.statusCode === 'ERROR' || item.hasError || false,
            attributes: item.tagMap || item.attributes || { 'service.name': serviceName },
          };
        });
      }
    } catch (e) {
      console.warn('V5 fetch error:', e);
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
      const rows = extractRowsFromResponse(resV3.data);
      if (rows.length > 0) {
        return rows.map((row: any, idx: number) => {
          const item = row.data || row;
          return {
            id: item.traceId || item.traceID || item.spanId || `${serviceName}-${idx}`,
            timestamp: item.timestamp ? Math.floor(item.timestamp / 1000000) : Date.now(),
            serviceName,
            name: item.name || item.spanName || 'agent_task',
            status: item.statusCode === 2 || item.hasError ? 'error' : 'ok',
            duration: item.durationMs || Math.floor((item.durationNano || 0) / 1000000) || 120,
            isError: item.statusCode === 2 || item.hasError || false,
            attributes: item.tagMap || item.attributes || { 'service.name': serviceName },
          };
        });
      }
    } catch (e) {
      console.warn('V3 fetch error:', e);
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
      const rows = extractRowsFromResponse(resLegacy.data);
      if (rows.length > 0) {
        return rows.map((row: any, idx: number) => {
          const item = row.data || row;
          return {
            id: item.traceId || item.traceID || item.spanId || `${serviceName}-${idx}`,
            timestamp: item.timestamp ? Math.floor(item.timestamp / 1000000) : Date.now(),
            serviceName,
            name: item.operationName || item.name || 'agent_task',
            status: item.statusCode === 'ERROR' || item.hasError ? 'error' : 'ok',
            duration: item.durationMs || Math.floor((item.durationNano || 0) / 1000000) || 120,
            isError: item.statusCode === 'ERROR' || item.hasError || false,
            attributes: item.tagMap || item.attributes || { 'service.name': serviceName },
          };
        });
      }
    } catch (e) {
      console.warn('Legacy fetch error:', e);
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
