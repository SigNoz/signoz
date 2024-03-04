DROP TABLE IF EXISTS signoz_traces.dependency_graph_minutes ON CLUSTER {{.SIGNOZ_CLUSTER}};
DROP VIEW IF EXISTS signoz_traces.dependency_graph_minutes_service_calls_mv ON CLUSTER {{.SIGNOZ_CLUSTER}};
DROP VIEW IF EXISTS signoz_traces.dependency_graph_minutes_db_calls_mv ON CLUSTER {{.SIGNOZ_CLUSTER}};
DROP VIEW IF EXISTS signoz_traces.dependency_graph_minutes_messaging_calls_mv ON CLUSTER {{.SIGNOZ_CLUSTER}};
