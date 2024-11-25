Some categories of queries that

1. attempt to read all data (CH SQL queries written by the user)
2. access maps and read weeks of data (use of arbitrary attributes)
    - that read map value for high cardinality matching (some ID) to get relevant traces/logs
    - that are doing aggregations like counts and averages
    - that are used in the variables query
3. attempt to group by a high cardinality column
4. attempt to parse the json body or json attributes (predominantly in logs)
5. attempt to count the distinct items on spanID, traceID, span name, etc... (unclear reason why)
6. end up reading all data because all or none resource attributes are selected (while the tables are optimised for the selection of particular resources or needles in the haystack requirements)
7. slow because other queries are running and consuming resources



Queries for each category:

### 1. attempt to read all data (CH SQL queries written by the user)

tenant: `anwe-nwgi`, `bvgw-wj0f`

query:
```sql
SELECT * FROM signoz_traces.distributed_signoz_index_v2
select * from signoz_metrics.distributed_time_series_v4_1day
```

tenant: `major-weasel`
query:
```sql
select * from signoz_logs.tag_attributes;
```

tenant: `dagf-ncx7`
query:
```sql
SELECT DISTINCT name, datatype from signoz_logs.distributed_logs_attribute_keys group by name, datatype
```

tenant: `primer`
query:
```sql
SELECT `metric_name`, `timestamp_ms`, `labels` FROM `signoz_metrics`.`time_series_v2`
```

tenant: `fiscalnote`
query:
```sql
SELECT DISTINCT name, datatype from signoz_logs.distributed_logs_attribute_keys group by name, datatype
```

### 2. access maps and read weeks of data (use of arbitrary attributes)


tenant: `first-bullfrog`
query:
```sql
SELECT quantile(0.5)(durationNano) as p50, quantile(0.95)(durationNano) as p95, quantile(0.99)(durationNano) as p99, COUNT(*) as numCalls, countIf(statusCode=2) as errorCount, name FROM signoz_traces.distributed_signoz_index_v2 WHERE serviceName = 'proposta' AND timestamp>= '1731471112727000000' AND timestamp<= '1731730282727000000' AND (resourceTagsMap['deployment.environment'] = 'production') GROUP BY name ORDER BY p99 DESC
```

```sql
SELECT timestamp as timestamp_datetime, spanID, traceID, serviceName as `serviceName` ,name as `name` ,durationNano as `durationNano` ,stringTagMap['db.statement'] as `db.statement` ,dbOperation as `dbOperation` from signoz_traces.distributed_signoz_index_v2 where (timestamp >= '1731505121000000000' AND timestamp <= '1731506921000000000') AND dbSystem != '' AND serviceName = 'proposta' order by `durationNano` desc LIMIT 10
```


tenant: `tozq-oofb`
query:

```sql
SELECT quantile(0.99)(durationNano) as p99, avg(durationNano) as avgDuration, count(*) as numCalls FROM signoz_traces.distributed_signoz_index_v2 WHERE serviceName = 'account' AND name In ['overflow_operation', 'grpc.health.v1.Health/Check', '/health', '/v3/balance', 'account.AccountService/GetAccount', '/users/:userID/balances', 'db.Prepare', 'stmt.Query', 'db.Query', 'account.AccountService/FindPocketBalances', 'db.Connect', '/chain-detail', 'account.AccountService/GetPocketBalance', 'account.AccountService/GetBalances'] AND timestamp>= '1728657880491000000' AND timestamp<= '1731249880491000000' AND (resourceTagsMap['deployment.environment'] = 'production')
```

```sql
SELECT quantile(0.99)(durationNano) as p99, avg(durationNano) as avgDuration, count(*) as numCalls FROM signoz_traces.distributed_signoz_index_v2 WHERE serviceName = 'authentication' AND name In ['overflow_operation', '/authenticate', '/authenticate/continue'] AND timestamp>= '1728657880491000000' AND timestamp<= '1731249880491000000' AND (resourceTagsMap['deployment.environment'] = 'production')
```

tenant: `rgqk-875w`
query:
```sql
SELECT max(value) as value, now() as ts FROM (SELECT toStartOfInterval(timestamp, INTERVAL 1140 SECOND) AS ts, toFloat64(count()) as value from signoz_traces.distributed_signoz_index_v2 where (timestamp >= '1731279122000000000' AND timestamp <= '1731624722000000000') AND serviceName = 'SentenceSubs-Serving' AND resourceTagsMap['deployment.environment'] IN ['Staging'] AND name ILIKE '%keyword_replace%' group by ts)
```

```sql
SELECT quantile(0.5)(`durationNano`) AS `p50`, quantile(0.95)(`durationNano`) AS `p95`, quantile(0.99)(`durationNano`) AS `p99`, count() AS `numCalls`, countIf(`statusCode` = 2) AS `errorCount`, `name` FROM `signoz_traces`.`signoz_index_v2` WHERE (`serviceName` = 'proposta') AND (`timestamp` >= '1731458349859000000') AND (`timestamp` <= '1731717519859000000') AND ((`resourceTagsMap`['deployment.environment']) = 'production') GROUP BY `name` ORDER BY `p99` DESC
```

```sql
SELECT toStartOfInterval(timestamp, INTERVAL 4020 SECOND) AS ts, quantile(0.5)(durationNano) as value from signoz_traces.distributed_signoz_index_v2 where (timestamp >= '1730417040000000000' AND timestamp <= '1731627060000000000') AND serviceName = 'io-api' AND resourceTagsMap['deployment.environment'] IN ['prod'] AND name = 'POST /v2/auth' group by ts order by value DESC
```

tenant: `teaching-python`
query:
```sql
SELECT timestamp as timestamp_datetime, spanID, traceID, serviceName as `serviceName` ,name as `name` ,durationNano as `durationNano` ,httpMethod as `httpMethod` ,responseStatusCode as `responseStatusCode` from signoz_traces.distributed_signoz_index_v2 where (timestamp >= '1731269612000000000' AND timestamp <= '1731356012000000000') AND stringTagMap['request.body'] ILIKE '%1ZK68991A823933372%' order by `timestamp` desc LIMIT 10
```

tenant: `ufau-vhkq-v2`
```sql
SELECT DISTINCT `resources_string`['service.name'] AS `serviceName` FROM `signoz_logs`.`logs_v2` WHERE ((`timestamp` >= 1729057710000000000.) AND (`timestamp` <= 1731649710000000000.)) AND ((`resources_string`['deployment.environment']) = 'PROD') AND notEmpty(`attributes_string`['requestBody']) LIMIT 100
```

```sql
SELECT `resource_string_service$$name` as `service.name`, toFloat64(count(*)) as value from signoz_logs.distributed_logs_v2 where (timestamp >= 1729057452000000000 AND timestamp <= 1731649452000000000) AND (ts_bucket_start >= 1729055652 AND ts_bucket_start <= 1731649452) AND attributes_string['messageText'] ILIKE '%virunath719@gmail.com%' AND mapContains(attributes_string, 'messageText') AND (resource_fingerprint GLOBAL IN (SELECT fingerprint FROM signoz_logs.distributed_logs_v2_resource WHERE (seen_at_ts_bucket_start >= 1729055652) AND (seen_at_ts_bucket_start <= 1731649452) AND simpleJSONExtractString(labels, 'deployment.environment') = 'PROD' AND labels like '%deployment.environment%PROD%' AND ( (simpleJSONHas(labels, 'service.name') AND labels like '%service.name%') ))) group by `service.name` order by value DESC
```

tenant: `ngxf-whwg`
query:
```sql
SELECT timestamp as timestamp_datetime, spanID, traceID, serviceName as `serviceName` ,name as `name` ,durationNano as `durationNano` ,httpMethod as `httpMethod` ,responseStatusCode as `responseStatusCode` ,stringTagMap['http.url'] as `http.url` from signoz_traces.distributed_signoz_index_v2 where (timestamp >= '1727678613000000000' AND timestamp <= '1731307413000000000') AND httpUrl IN ['http://staging-server.gorattle.com/api/v1.1/board/v2/views/8f79fc96-342d-4698-b751-c05f184ac9f8/refresh?ephemeral_view_id=w1xGAl7f37p4OS0d','http://staging-server.gorattle.com/api/v1.1/board/v2/views/8f79fc96-342d-4698-b751-c05f184ac9f8/refresh?ephemeral_view_id=zCEm1tKI9uSRdTx6','http://staging-server.gorattle.com/api/v1.1/board/v2/views/8f79fc96-342d-4698-b751-c05f184ac9f8/table/aggregate?stackVal=undefined&ephemeral_view_id=w1xGAl7f37p4OS0d'] order by `timestamp` desc LIMIT 10
```

```sql
SELECT timestamp as timestamp_datetime, spanID, traceID, serviceName as `serviceName` ,name as `name` ,durationNano as `durationNano` ,httpMethod as `httpMethod` ,responseStatusCode as `responseStatusCode` ,stringTagMap['http.url'] as `http.url` from signoz_traces.distributed_signoz_index_v2 where (timestamp >= '1727866169000000000' AND timestamp <= '1731494969000000000') AND serviceName IN ['rattle-server-v1'] order by `timestamp` desc LIMIT 10
```

```sql
SELECT DISTINCT JSONExtractString(labels, 'k8s_pod_name') AS pod_name FROM signoz_metrics.distributed_time_series_v2 WHERE JSONExtractString(labels, 'k8s_namespace_name') IN 'rattle-prod' AND JSONExtractString(labels, 'k8s_cluster_name') = 'rattle-prod' AND JSONExtractString(labels, 'k8s_pod_name') LIKE '%rattle-server%'AND JSONExtractString(labels, 'k8s_pod_name') NOT LIKE '%rattle-server-v1%';
```

tenant: `ofwu-c5uc`
query:
```sql
SELECT timestamp as timestamp_datetime, spanID, traceID, serviceName as `serviceName` ,name as `name` ,durationNano as `durationNano` ,httpMethod as `httpMethod` ,responseStatusCode as `responseStatusCode` ,stringTagMap['result'] as `result` from signoz_traces.distributed_signoz_index_v2 where (timestamp >= '1730741653000000000' AND timestamp <= '1731346453000000000') AND serviceName = 'secrets' order by `timestamp` desc LIMIT 10
```

```sql
SELECT now() as ts, name as `name`, max(durationNano) as value from signoz_traces.distributed_signoz_index_v2 where (timestamp >= '1730743334000000000' AND timestamp <= '1731348134000000000') AND resourceTagsMap['service.name'] = 'permissions' AND name IN ['/hierarchy.v1.Hierarchy/GetDescendants','/auth.permissions.v1.AuthPermissions/GetTenantHierarchy','/auth.permissions.v1.AuthPermissions/GetTenantSupportAccess','/auth.permissions.v1.AuthPermissions/IsUserSupportUser','/auth.permissions.v1.AuthPermissions/GetTenant'] AND stringTagMap['env'] = 'prod' AND stringTagMap['cluster'] IN ['a.daily.auvik.com','au1.my.auvik.com','b.daily.auvik.com','ca1.my.auvik.com','eu1.my.auvik.com','eu2.my.auvik.com','lnx.my.auvik.com','us1.my.auvik.com','us1.stage.auvik.com','us2.my.auvik.com','us2.stage.auvik.com','us3.my.auvik.com','us4.my.auvik.com','us5.my.auvik.com','us6.my.auvik.com'] group by `name` LIMIT 100
```

```sql
SELECT toStartOfInterval(timestamp, INTERVAL 60 SECOND) AS ts, stringTagMap['tenant.id'] as `tenant.id`, stringTagMap['cluster'] as `cluster`, toFloat64(count()) as value from signoz_traces.distributed_signoz_index_v2 where (timestamp >= '1731664080000000000' AND timestamp <= '1731685680000000000') AND serviceName = 'integrations-egress-client' AND stringTagMap['cluster'] IN 'us5.my.auvik.com' AND stringTagMap['env'] = 'prod' AND has(stringTagMap, 'tenant.id') AND has(stringTagMap, 'cluster') AND (`tenant.id`,`cluster`) GLOBAL IN (SELECT `tenant.id`,`cluster` from (SELECT stringTagMap['tenant.id'] as `tenant.id`, stringTagMap['cluster'] as `cluster`, toFloat64(count()) as value from signoz_traces.distributed_signoz_index_v2 where (timestamp >= '1731664080000000000' AND timestamp <= '1731685680000000000') AND serviceName = 'integrations-egress-client' AND stringTagMap['cluster'] IN 'us5.my.auvik.com' AND stringTagMap['env'] = 'prod' AND has(stringTagMap, 'tenant.id') AND has(stringTagMap, 'cluster') group by `tenant.id`,`cluster` order by value DESC) LIMIT 20) group by `tenant.id`,`cluster`,ts order by value DESC
```


tenant: `major-weasel`
query:
```sql
SELECT timestamp as timestamp_datetime, spanID, traceID, serviceName as `serviceName` ,name as `name` ,durationNano as `durationNano` ,httpMethod as `httpMethod` ,responseStatusCode as `responseStatusCode` ,stringTagMap['graphql.operation.type'] as `graphql.operation.type` from signoz_traces.distributed_signoz_index_v2 where (timestamp >= '1731015929000000000' AND timestamp <= '1731620729000000000') AND resourceTagsMap['deployment.environment'] IN ['production'] order by `timestamp` desc LIMIT 10
```

tenant: `bvgw-wj0f`
query:
```sql
SELECT timestamp as timestamp_datetime, spanID, traceID, serviceName as `serviceName` ,name as `name` ,durationNano as `durationNano` ,numberTagMap['count'] as `count` from signoz_traces.distributed_signoz_index_v2 where (timestamp >= '1731267181000000000' AND timestamp <= '1731526381000000000') AND httpHost ILIKE '%twelvedata%' order by `timestamp` desc LIMIT 10
```

```sql
SELECT distinct(stringTagMap['celery.queue']) FROM signoz_traces.distributed_signoz_index_v2 WHERE timestamp > now() - INTERVAL 1 day
```

```sql
SELECT toStartOfInterval(timestamp, INTERVAL 840 SECOND) AS ts, quantile(0.99)(durationNano) as value from signoz_traces.distributed_signoz_index_v2 where (timestamp >= '1731345000000000000' AND timestamp <= '1731603720000000000') AND resourceTagsMap['deployment.environment'] = 'prod' AND httpUrl ILIKE 'https://api.twelvedata.com/time_series%' AND serviceName = 'gunicorn' group by ts order by value DESC
```

tenant: `jbvm-kayx`
query:
```sql
SELECT toStartOfInterval(fromUnixTimestamp64Nano(timestamp), INTERVAL 4020 SECOND) AS ts, attributes_string['ServiceLevel'] as `ServiceLevel`, max(attributes_number['MessageRate']) as value from signoz_logs.distributed_logs_v2 where (timestamp >= 1730088930000000000 AND timestamp <= 1731298530000000000) AND (ts_bucket_start >= 1730087130 AND ts_bucket_start <= 1731298530) AND attributes_number['MessageRate'] >= 0.000000 AND mapContains(attributes_number, 'MessageRate') AND lower(body) LIKE lower('%messages in the last minute%') AND mapContains(attributes_string, 'ServiceLevel') AND mapContains(attributes_number, 'MessageRate') AND (resource_fingerprint GLOBAL IN (SELECT fingerprint FROM signoz_logs.distributed_logs_v2_resource WHERE (seen_at_ts_bucket_start >= 1730087130) AND (seen_at_ts_bucket_start <= 1731298530) AND simpleJSONExtractString(labels, 'deployment.id') = '8fe64006-8849-465e-9039-6dbe7d41a184' AND labels like '%deployment.id%8fe64006-8849-465e-9039-6dbe7d41a184%' AND simpleJSONExtractString(labels, 'service.name') = 'Telemetry Websocket' AND labels like '%service.name%Telemetry Websocket%')) group by `ServiceLevel`,ts order by value DESC
```

tenant: `anwe-nwgi`
query:
```sql
SELECT timestamp as timestamp_datetime, spanID, traceID, serviceName as `serviceName` ,name as `name` ,durationNano as `durationNano` ,httpMethod as `httpMethod` ,responseStatusCode as `responseStatusCode` ,stringTagMap['http.target'] as `http.target` from signoz_traces.distributed_signoz_index_v2 where (timestamp >= '1730449223000000000' AND timestamp <= '1731658823000000000') AND resourceTagsMap['deployment.environment'] = 'dev' AND hasError != true AND serviceName NOT IN ['istio-ingressgateway.istio-system','cinev-api.default','admin-backend.default','cinev-auth.default','cinev-backoffice-frontend.default','cinev-frontend.default','mini-cinev.default','s2m-composer.default','task-manager.default','admin-backend-dev.default'] order by `durationNano` desc LIMIT 10
```

tenant: `factual-coyote`
query:
```sql
SELECT toStartOfInterval(fromUnixTimestamp64Nano(timestamp), INTERVAL 15 SECOND) AS interval, toFloat64(count())/15 AS value FROM signoz_logs.distributed_logs_v2 WHERE (timestamp BETWEEN 1731418467000000000 AND 1731504867000000000) AND attributes_string['parsed_user_agent'] NOT IN ['Prediction Guard UptimeRobot', 'Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)', 'k6/0.53.0 (https://k6.io/)', ''] AND attributes_string['xModel'] IN ['Hermes-2-Pro-Llama-3-8B','Hermes-2-Pro-Mistral-7B','Hermes-3-Llama-3.1-70B','Hermes-3-Llama-3.1-8B','Nous-Hermes-Llama2-13b','bridgetower-large-itm-mlm-itc','deepseek-coder-6.7b-instruct','llava-1.5-7b-hf','llava-v1.6-mistral-7b-hf','multilingual-e5-large-instruct','neural-chat-7b-v3-3'] AND attributes_string['xAuthUser'] IN ['Accenture (Evaluation)','Antique Candle Co Chat Application','Ardan Labs Team','BAIM IP','Biblica','CV Chat Application Key','CV ManyChat Key','CV-1','CV-2','CV-3','CV-4','CVC Networks','CVC Networks (New)','Cloud Constable','Contango','Cultura','ETEN','Grange (Evaluation)','Headstarter','IMB-1','IMB-10','IMB-2','IMB-3','IMB-4','IMB-5','IMB-6','IMB-7','IMB-8','IMB-9','Intel Hackathons','Intel Liftoff Team (for demos)','LDM/ EDOC','Monaco Evaluation','PG Team (demo)','PG Team Chat Interface','PrimeAI-AlphaAI','Purdue (Research)','Python Client Test Key','Quantek','SEP-demo','Simwerx','Staging Translation Deployment','TranslateAPI','Uptime Alerts Key','Valnet','Valnet (testing)','Venturely/Intel-liftoff-Pilot','WithSecurity (evaluation)','ace-eval','agustin-eval','ahmed-j-eval','alec-goldis-key','austin-eval','bruno-bosshard-eval','bryan-eval','chipp-ai','chitra-eval','data4good-students','dl-itdc','dl-itdc-dl','dlai-admin','dlai-students','faisal-eval','gaetan-eval','globalpath','ho-so-eval','jacob-test','manya-rathi-pg','marcelcastrobr-eval','mesut-oezdil-eval','mukul-eval','mulaikui-eval','opea-github-key','pankaja-eval','ramesh-eval','rohith-cm-eval','sheikh-eval','srinivas-eval','vikash-eval','yattish-eval'] AND resources_string['k8s.cluster.name'] = 'pg-production' GROUP BY interval ORDER BY interval ASC;
```

```sql
SELECT toStartOfInterval(fromUnixTimestamp64Nano(timestamp), INTERVAL 15 SECOND) AS interval, quantile(0.99)(toFloat64OrZero(attributes_string['parsed_total_latency'])) AS P99_latency FROM signoz_logs.distributed_logs_v2 WHERE (timestamp BETWEEN 1731418467000000000 AND 1731504867000000000) AND attributes_string['parsed_user_agent'] NOT IN ['Prediction Guard UptimeRobot', 'Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)', 'k6/0.53.0 (https://k6.io/)', ''] AND attributes_string['xModel'] in ['Hermes-2-Pro-Llama-3-8B','Hermes-2-Pro-Mistral-7B','Hermes-3-Llama-3.1-70B','Hermes-3-Llama-3.1-8B','Nous-Hermes-Llama2-13b','bridgetower-large-itm-mlm-itc','deepseek-coder-6.7b-instruct','llava-1.5-7b-hf','llava-v1.6-mistral-7b-hf','multilingual-e5-large-instruct','neural-chat-7b-v3-3'] AND attributes_string['xAuthUser'] IN ['Accenture (Evaluation)','Antique Candle Co Chat Application','Ardan Labs Team','BAIM IP','Biblica','CV Chat Application Key','CV ManyChat Key','CV-1','CV-2','CV-3','CV-4','CVC Networks','CVC Networks (New)','Cloud Constable','Contango','Cultura','ETEN','Grange (Evaluation)','Headstarter','IMB-1','IMB-10','IMB-2','IMB-3','IMB-4','IMB-5','IMB-6','IMB-7','IMB-8','IMB-9','Intel Hackathons','Intel Liftoff Team (for demos)','LDM/ EDOC','Monaco Evaluation','PG Team (demo)','PG Team Chat Interface','PrimeAI-AlphaAI','Purdue (Research)','Python Client Test Key','Quantek','SEP-demo','Simwerx','Staging Translation Deployment','TranslateAPI','Uptime Alerts Key','Valnet','Valnet (testing)','Venturely/Intel-liftoff-Pilot','WithSecurity (evaluation)','ace-eval','agustin-eval','ahmed-j-eval','alec-goldis-key','austin-eval','bruno-bosshard-eval','bryan-eval','chipp-ai','chitra-eval','data4good-students','dl-itdc','dl-itdc-dl','dlai-admin','dlai-students','faisal-eval','gaetan-eval','globalpath','ho-so-eval','jacob-test','manya-rathi-pg','marcelcastrobr-eval','mesut-oezdil-eval','mukul-eval','mulaikui-eval','opea-github-key','pankaja-eval','ramesh-eval','rohith-cm-eval','sheikh-eval','srinivas-eval','vikash-eval','yattish-eval'] AND resources_string['k8s.cluster.name'] = 'pg-production' GROUP BY interval ORDER BY interval ASC;
```

```
SELECT attributes_string['parsed_cf_ipcountry'] AS "Country", count() AS "Total" FROM signoz_logs.distributed_logs_v2 WHERE (timestamp BETWEEN 1731418467000000000 AND 1731504867000000000) AND attributes_string['parsed_user_agent'] NOT IN ['Prediction Guard UptimeRobot', 'Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)', 'k6/0.53.0 (https://k6.io/)', ''] AND attributes_string['xModel'] IN ['Hermes-2-Pro-Llama-3-8B','Hermes-2-Pro-Mistral-7B','Hermes-3-Llama-3.1-70B','Hermes-3-Llama-3.1-8B','Nous-Hermes-Llama2-13b','bridgetower-large-itm-mlm-itc','deepseek-coder-6.7b-instruct','llava-1.5-7b-hf','llava-v1.6-mistral-7b-hf','multilingual-e5-large-instruct','neural-chat-7b-v3-3'] AND attributes_string['xAuthUser'] IN ['Accenture (Evaluation)','Antique Candle Co Chat Application','Ardan Labs Team','BAIM IP','Biblica','CV Chat Application Key','CV ManyChat Key','CV-1','CV-2','CV-3','CV-4','CVC Networks','CVC Networks (New)','Cloud Constable','Contango','Cultura','ETEN','Grange (Evaluation)','Headstarter','IMB-1','IMB-10','IMB-2','IMB-3','IMB-4','IMB-5','IMB-6','IMB-7','IMB-8','IMB-9','Intel Hackathons','Intel Liftoff Team (for demos)','LDM/ EDOC','Monaco Evaluation','PG Team (demo)','PG Team Chat Interface','PrimeAI-AlphaAI','Purdue (Research)','Python Client Test Key','Quantek','SEP-demo','Simwerx','Staging Translation Deployment','TranslateAPI','Uptime Alerts Key','Valnet','Valnet (testing)','Venturely/Intel-liftoff-Pilot','WithSecurity (evaluation)','ace-eval','agustin-eval','ahmed-j-eval','alec-goldis-key','austin-eval','bruno-bosshard-eval','bryan-eval','chipp-ai','chitra-eval','data4good-students','dl-itdc','dl-itdc-dl','dlai-admin','dlai-students','faisal-eval','gaetan-eval','globalpath','ho-so-eval','jacob-test','manya-rathi-pg','marcelcastrobr-eval','mesut-oezdil-eval','mukul-eval','mulaikui-eval','opea-github-key','pankaja-eval','ramesh-eval','rohith-cm-eval','sheikh-eval','srinivas-eval','vikash-eval','yattish-eval'] AND resources_string['k8s.cluster.name'] = 'pg-production' GROUP BY attributes_string['parsed_cf_ipcountry'] ORDER BY 'Total' DESC LIMIT 10
```

tenant: `loving-guinea`
query:
```sql
SELECT toStartOfInterval(timestamp, INTERVAL 840 SECOND) AS ts, toFloat64(count()) as value from signoz_traces.distributed_signoz_index_v2 where (timestamp >= '1731237480000000000' AND timestamp <= '1731496200000000000') AND serviceName = 'conversation-service' AND parentSpanID = '' AND stringTagMap['http.url'] ILIKE '%filter/v2%' AND resourceTagsMap['deployment.environment'] = 'prod' group by ts order by value DESC
```

```sql
SELECT toStartOfInterval(timestamp, INTERVAL 840 SECOND) AS ts, toFloat64(count()) as value from signoz_traces.distributed_signoz_index_v2 where (timestamp >= '1731237480000000000' AND timestamp <= '1731496200000000000') AND serviceName = 'chat-service' AND parentSpanID = '' AND stringTagMap['http.url'] = 'http://api.zaapi.co/api/chat/backend/messages' AND resourceTagsMap['deployment.environment'] = 'prod' group by ts order by value DESC
```

```sql
SELECT toStartOfInterval(timestamp, INTERVAL 840 SECOND) AS ts, toFloat64(count()) as value from signoz_traces.distributed_signoz_index_v2 where (timestamp >= '1731237480000000000' AND timestamp <= '1731496200000000000') AND serviceName = 'conversation-service' AND parentSpanID = '' AND resourceTagsMap['deployment.environment'] = 'prod' AND stringTagMap['http.url'] ILIKE '%filter-stats/v2%' group by ts order by value DESC
```

```sql
SELECT toStartOfInterval(timestamp, INTERVAL 840 SECOND) AS ts, toFloat64(count()) as value from signoz_traces.distributed_signoz_index_v2 where (timestamp >= '1731237480000000000' AND timestamp <= '1731496200000000000') AND serviceName = 'chat-service' AND stringTagMap['http.url'] ILIKE '%webhook/messages/facebook%' AND resourceTagsMap['deployment.environment'] = 'prod' group by ts order by value DESC
```

tenant: `wzbl-jiit`
query:
```sql
SELECT DISTINCT stringTagMap['server.opts.cedanaurl'] FROM signoz_traces.distributed_signoz_index_v2 WHERE stringTagMap['server.opts.cedanaurl'] IS NOT NULL AND stringTagMap['server.opts.cedanaurl'] != '';
```

tenant: `fiscalnote`
query:
```sql
SELECT toStartOfInterval(fromUnixTimestamp64Nano(timestamp), INTERVAL 1980 SECOND) AS ts, attributes_string['request_context.test_name'] as `request_context.test_name`, avg(attributes_number['extra_info.latency']) as value from signoz_logs.distributed_logs_v2 where (timestamp >= 1730716649000000000 AND timestamp <= 1731321449000000000) AND (ts_bucket_start >= 1730714849 AND ts_bucket_start <= 1731321449) AND `attribute_string_component` = 'omnisearch_service' AND lower(body) LIKE lower('%COMPLETED run%') AND attributes_string['request_context.source'] = '["Postman"]' AND mapContains(attributes_string, 'request_context.source') AND `attribute_string_env` = 'prod' AND mapContains(attributes_string, 'request_context.test_name') AND mapContains(attributes_number, 'extra_info.latency') group by `request_context.test_name`,ts order by value DESC
```


### 3. attempt to group by a high cardinality column

tenant: `major-weasel`
query:
```sql
select traceID, count(*) from signoz_traces.distributed_signoz_spans group by traceID;
```

### 4. attempt to parse the json body or json attributes (predominantly in logs)

tenant: `ufau-vhkq-v2`
query:
```sql
With resources_string['service.name'] as serviceName, resources_string['deployment.environment'] as environment, attributes_string['errorMessage'] as errorMessage, attributes_string['requestBody'] as requestString, simpleJSONExtractString(attributes_string['requestBody'],'user') as userId, JSONExtractUInt(attributes_string['requestBody'],'body','__REQUEST_SIZE') as requestSize, JSONExtractString(attributes_string['requestBody'],'body','email') as email, JSONExtractUInt(attributes_string['responseBody'],'statusCode') as responseStatus, JSONExtractString(attributes_string['responseBody'],'body','message') as responseMessage select --count(*) cnt, * --email,toStartOfInterval(fromUnixTimestamp64Nano(timestamp), INTERVAL 1 MINUTE) AS interval from signoz_logs.distributed_logs_v2 where (timestamp between 1731564060000000000 AND 1731565860000000000) and serviceName='external' and environment='PROD' --and requestString has 'triggerCampaign' --and notEmpty(email) --group by email,interval --having cnt>20
```

```sql
WITH `resources_string`['service.name'] AS `serviceName`, `resources_string`['deployment.environment'] AS `environment`, `attributes_string`['errorMessage'] AS `errorMessage`, `attributes_string`['requestBody'] AS `requestString`, simpleJSONExtractString(`attributes_string`['requestBody'], 'user') AS `userId`, JSONExtractUInt(`attributes_string`['requestBody'], 'body', '__REQUEST_SIZE') AS `requestSize`, JSONExtractString(`attributes_string`['requestBody'], 'body', 'email') AS `email`, JSONExtractUInt(`attributes_string`['responseBody'], 'statusCode') AS `responseStatus`, JSONExtractString(`attributes_string`['responseBody'], 'body', 'message') AS `responseMessage` SELECT `logs_v2`.`ts_bucket_start`, `logs_v2`.`resource_fingerprint`, `logs_v2`.`timestamp`, `logs_v2`.`observed_timestamp`, `logs_v2`.`id`, `logs_v2`.`trace_id`, `logs_v2`.`span_id`, `logs_v2`.`trace_flags`, `logs_v2`.`severity_text`, `logs_v2`.`severity_number`, `logs_v2`.`body`, `logs_v2`.`attributes_string`, `logs_v2`.`attributes_number`, `logs_v2`.`attributes_bool`, `logs_v2`.`resources_string`, `logs_v2`.`scope_name`, `logs_v2`.`scope_version`, `logs_v2`.`scope_string`, `logs_v2`.`resource_string_deployment$$environment`, `logs_v2`.`resource_string_deployment$$environment_exists`, `logs_v2`.`resource_string_service$$name`, `logs_v2`.`resource_string_service$$name_exists` FROM `signoz_logs`.`logs_v2` WHERE ((`timestamp` >= 1731564060000000000) AND (`timestamp` <= 1731565860000000000)) AND (`serviceName` = 'external') AND (`environment` = 'PROD')
```

```sql
With simpleJSONExtractString(attributes_string['requestBody'],'user') as userId, JSONExtractString(attributes_string['requestBody'],'body','email') as email select email,count(*) totalCount from signoz_logs.distributed_logs_v2 where (timestamp between 1729083729000000000 AND 1731675729000000000) and resources_string['service.name']='external' and resources_string['deployment.environment']='PROD' and userId='c376781b-aabd-426c-9200-b35fcb62457e' and notEmpty(email) group by email having totalCount>10
```

tenant: `factual-coyote`
query:
```sql
SELECT concat( regexpExtract(attributes_string['parsed_request_url'], '^(.*)\\.predictionguard\\.com/(.*)$', 1), ' -> ', regexpExtract(attributes_string['parsed_request_url'], '^(.*)\\.predictionguard\\.com/(.*)$', 2) ) AS "Endpoint", attributes_string['xAuthUser'] AS "API User", count() AS "Total" FROM signoz_logs.distributed_logs_v2 WHERE (timestamp BETWEEN 1731418467000000000 AND 1731504867000000000) AND attributes_string['parsed_user_agent'] NOT IN ['Prediction Guard UptimeRobot', 'Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)', 'k6/0.53.0 (https://k6.io/)', ''] AND attributes_string['xModel'] IN ['Hermes-2-Pro-Llama-3-8B','Hermes-2-Pro-Mistral-7B','Hermes-3-Llama-3.1-70B','Hermes-3-Llama-3.1-8B','Nous-Hermes-Llama2-13b','bridgetower-large-itm-mlm-itc','deepseek-coder-6.7b-instruct','llava-1.5-7b-hf','llava-v1.6-mistral-7b-hf','multilingual-e5-large-instruct','neural-chat-7b-v3-3'] AND attributes_string['xAuthUser'] IN ['Accenture (Evaluation)','Antique Candle Co Chat Application','Ardan Labs Team','BAIM IP','Biblica','CV Chat Application Key','CV ManyChat Key','CV-1','CV-2','CV-3','CV-4','CVC Networks','CVC Networks (New)','Cloud Constable','Contango','Cultura','ETEN','Grange (Evaluation)','Headstarter','IMB-1','IMB-10','IMB-2','IMB-3','IMB-4','IMB-5','IMB-6','IMB-7','IMB-8','IMB-9','Intel Hackathons','Intel Liftoff Team (for demos)','LDM/ EDOC','Monaco Evaluation','PG Team (demo)','PG Team Chat Interface','PrimeAI-AlphaAI','Purdue (Research)','Python Client Test Key','Quantek','SEP-demo','Simwerx','Staging Translation Deployment','TranslateAPI','Uptime Alerts Key','Valnet','Valnet (testing)','Venturely/Intel-liftoff-Pilot','WithSecurity (evaluation)','ace-eval','agustin-eval','ahmed-j-eval','alec-goldis-key','austin-eval','bruno-bosshard-eval','bryan-eval','chipp-ai','chitra-eval','data4good-students','dl-itdc','dl-itdc-dl','dlai-admin','dlai-students','faisal-eval','gaetan-eval','globalpath','ho-so-eval','jacob-test','manya-rathi-pg','marcelcastrobr-eval','mesut-oezdil-eval','mukul-eval','mulaikui-eval','opea-github-key','pankaja-eval','ramesh-eval','rohith-cm-eval','sheikh-eval','srinivas-eval','vikash-eval','yattish-eval'] AND resources_string['k8s.cluster.name'] = 'pg-production' GROUP BY attributes_string['parsed_request_url'], attributes_string['xAuthUser'] ORDER BY 'Total' DESC
```

tenant: `primer`
query:
```sql
SELECT toStartOfHour(parseDateTime64BestEffort(regexpExtract(body, 'finished_at="(.+?)"'))) AS ts, -- toString(toStartOfHour(parseDateTime64BestEffort(regexpExtract(body, 'finished_at="(.+?)"')))) AS h, -- regexpExtract(body, 'match_rate=(\d+)') as mr, max(regexpExtract(body, 'match_rate=(\d+)')::UInt8) AS value FROM signoz_logs.distributed_logs_v2 WHERE severity_number = 9 AND resources_string['k8s.cluster.name'] = 'production' AND body LIKE '%Match rate evaluated%' AND regexpExtract(body, 'hour=(\d+)') = toString(1.000000) AND regexpExtract(body, 'destination=(\w+)') = 'google' -- GROUP BY ts, h, mr; GROUP BY ts ORDER BY ts ASC
```


### 5. attempt to count the distinct items on spanID, traceID, span name, etc... (unclear reason why)

tenant: `major-weasel`

query:
```sql
select serviceName, count(distinct(spanID)) from signoz_traces.distributed_signoz_index_v2 group by serviceName;
```

### 6. end up reading all data because all or none resource attributes are selected

tenant: `mosaic`
query:
```sql
SELECT toFloat64(count(*)) as value from signoz_logs.distributed_logs_v2 where (timestamp >= 1729107086000000000 AND timestamp <= 1731699086000000000) AND (ts_bucket_start >= 1729105286 AND ts_bucket_start <= 1731699086) AND `attribute_string_MESSAGE` ILIKE '%"message":"Failed to feed filament%' AND lower(body) LIKE lower('%liberty job finished%') AND `attribute_string_MESSAGE` NOT ILIKE '%"error":null%' AND `attribute_string_MESSAGE` NOT ILIKE '%Error while buffering%' AND (resource_fingerprint GLOBAL IN (SELECT fingerprint FROM signoz_logs.distributed_logs_v2_resource WHERE (seen_at_ts_bucket_start >= 1729105286) AND (seen_at_ts_bucket_start <= 1731699086) AND simpleJSONExtractString(labels, 'host.name') IN ['5SXS-EL','IY13-ELA','558J-ELA','END5-ELA','V7JO-EL','0BYN-ELA','4OFA-EL','UDFV-ELA','FOP7-ELA','KO0C-EL','2JQM-ELA','DFHX-ELA','ET9Q-ELA','MDHG-EL','TUFZ-EL','DXSE-EL','DVMT-ELA','443O-EL','2OBS-ELA','0AWW-ELA','N94F-ELA','R8V3-EL','N0I4-EL','J6NG-EL','ORMC-EL','LIUI-EL','QD1S-EL','UNS3-ELA','V76U-ELA','7GZO-EL','XSFM-ELA','HBI3-ELA','I3LX-ELA','HU7P-ELA','3V9W-EL','DHST-EL','3JOT-EL','HBNM-EL','7PRX-ELA','RDGU-ELA','ZQIG-EL','J46P-EL','0OM8-ELA','Q25A-EL','G2LK-ELA','U4IN-ELA','7MWB-ELA','TEST-ELA','PRSO-ELA','KKP8-EL','PXLJ-ELA','6TYD-EL','9X5O-ELA','C6UZ-ELA','GLDH-EL','ME21-ELA','MG4K-EL','78NI-ELA','5EJJ-EL','LVN7-ELA','IGT0-EL','S12H-ELA','2S0L-ELA','IJVJ-EL','JJQ0-ELA','UM1A-ELA','BCJB-EL','ER8M-ELA','VM3A-ELA','O28M-EL','IJZP-EL','OAX6-ELA','8KUJ-ELA','2T1F-EL','OR44-EL','N500-ELA','I6GF-ELA','LR9Z-ELA','03EY-EL','7LT9-ELA','GSHS-EL','7L5V-ELA','H1VB-ELA','4P96-EL','QV22-EL','Z7N9-ELA','Z9CL-ELA','FOWX-EL','HUCT-EL','K4Y0-ELA','P1SD-ELA','O28M-DEBUG-EL','LMLX-EL','YMQ7-EL','A9ZZ-ELA','T6TJ-EL','8UV0-ELA','77PU-ELA','XC8T-EL','805X-EL','99BI-EL','D0EW-ELA','JA3M-ELA','HFRS-ELA','1KG2-ELA','61TW-EL','U87C-ELA','YODJ-ELA','ZPKP-EL','4TNH-ELA','5ZDQ-EL','2XLI-EL','8QN8-ELA','OSDW-ELA','80T1-EL','4E2X-EL','7IEY-ELA','VUVI-ELA','EDCX-EL','9Q5R-ELA','RBXT-ELA','U1QI-ELA','S6VH-ELA','C7BN-EL','YZZW-ELA','V3ID-ELA','5F1J-EL','7W7G-EL','Y53R-EL','9214-EL','LGFN-EL','T197-EL','8KDK-ELA','DILG-EL','DCN8-EL','3YNM-ELA','MFWZ-EL','QDIG-EL','0FSJ-EL','4R7Z-EL','P5DW-EL','3NFX-EL','PA0A-ELA','AP6F-EL','EANR-EL','CAGN-EL','CREE-EL','HSZE-EL','6STZ-EL','2BI6-EL','DXSN-EL','PPPB-EL','0VRS-EL','OS8D-EL','WRA3-EL','C2GE-EL','IYXS-EL','A2JM-EL','62PR-EL','QWF2-EL','PKU6-ELA','B1AS-EL','I3CI-ELA','4KGP-EL','AD8Y-ELA','LD5H-EL','KBLP-EL','KFJI-EL','ONV4-EL','TID4-EL','QK5H-EL','W2JE-ELA','ZFQR-ELA','EAH6-EL','ZB4A-EL','ZQAJ-EL','MIKE-ELA','9138-EL','S70T-ELA','ZIZH-EL','G2FE-EL','1ILP-ELA','9V27-ELA','70NZ-ELA','542S-ELA','XOFE-EL','TW0E-EL','WY76-EL','DQS4-EL','KO0C-ML-EL','NJ3G-EL','J1W0-EL','XISJ-EL','V610-ELA','H6MW-ELA','4F6I-EL','KRQ7-ELA','KU0U-EL','J1FS-ELA','21TX-EL','DWNS-EL','OSWD-ELA','ZEDP-EL','TTMB-ELA','8HOZ-EL','EDA1-EL','Y8ND-EL','AQ2P-EL','ZNO7-EL','SULY-EL','B5JH-ELA','LD45-EL','W5N6-EL','6403-EL','S9L8-EL','0LKP-EL','CPFU-EL','V5FF-EL','XMF9-EL','W8YJ-EL','XTU3-EL','0CTS-EL','O3E7-ELA','XFJ4-ELA','Z4VP-ELA','PJCE-EL','KU26-EL','JLEY-EL','T5Z9-EL','IIWZ-EL','W0H1-EL','ILTK-EL','1ZP0-ELA','FTHG-ELA','1795-ELA','AG7U-ELA','A9UP-ELA','OIHA-EL','ZF51-EL','QR4C-EL','057E-ELA','R1WN-EL','3A1K-EL','MIKE-EL','0R6J-EL','L73J-EL','QUJE-EL','Y53C-EL','DHDZ-EL','VLCU-ELA','YYP8-ELA','T54Y-ELA','M21C-ELA','WQRL-ELA','DV2K-EL','EM56-EL','CR6S-EL','G1E2-EL','8EO2-EL','R3NX-EL','A3ZQ-EL','TDJP-EL','5SQ0-EL','DUFE-EL','GYRO-EL','NSCP-EL','NUX7-ELA','1GSU-ELA','GE9G-ELA','8HCP-ELA','49FS-ELA','JTHL-ELA','FQD4-EL','HBIO-EL','WWKN-EL','CZMD-EL','22NZ-EL','K8P3-EL','PWTE-EL','ML5F-EL','OLMP-EL','2P01-EL','G5IN-EL','V5R2-ELA','HMRW-ELA','51OW-ELA','S0PA-ELA','BXB3-EL','S340-ELA','TIB0-ELA','2RJ0-ELA'] AND (labels like '%"host.name":"5SXS-EL"%' OR labels like '%"host.name":"IY13-ELA"%' OR labels like '%"host.name":"558J-ELA"%' OR labels like '%"host.name":"END5-ELA"%' OR labels like '%"host.name":"V7JO-EL"%' OR labels like '%"host.name":"0BYN-ELA"%' OR labels like '%"host.name":"4OFA-EL"%' OR labels like '%"host.name":"UDFV-ELA"%' OR labels like '%"host.name":"FOP7-ELA"%' OR labels like '%"host.name":"KO0C-EL"%' OR labels like '%"host.name":"2JQM-ELA"%' OR labels like '%"host.name":"DFHX-ELA"%' OR labels like '%"host.name":"ET9Q-ELA"%' OR labels like '%"host.name":"MDHG-EL"%' OR labels like '%"host.name":"TUFZ-EL"%' OR labels like '%"host.name":"DXSE-EL"%' OR labels like '%"host.name":"DVMT-ELA"%' OR labels like '%"host.name":"443O-EL"%' OR labels like '%"host.name":"2OBS-ELA"%' OR labels like '%"host.name":"0AWW-ELA"%' OR labels like '%"host.name":"N94F-ELA"%' OR labels like '%"host.name":"R8V3-EL"%' OR labels like '%"host.name":"N0I4-EL"%' OR labels like '%"host.name":"J6NG-EL"%' OR labels like '%"host.name":"ORMC-EL"%' OR labels like '%"host.name":"LIUI-EL"%' OR labels like '%"host.name":"QD1S-EL"%' OR labels like '%"host.name":"UNS3-ELA"%' OR labels like '%"host.name":"V76U-ELA"%' OR labels like '%"host.name":"7GZO-EL"%' OR labels like '%"host.name":"XSFM-ELA"%' OR labels like '%"host.name":"HBI3-ELA"%' OR labels like '%"host.name":"I3LX-ELA"%' OR labels like '%"host.name":"HU7P-ELA"%' OR labels like '%"host.name":"3V9W-EL"%' OR labels like '%"host.name":"DHST-EL"%' OR labels like '%"host.name":"3JOT-EL"%' OR labels like '%"host.name":"HBNM-EL"%' OR labels like '%"host.name":"7PRX-ELA"%' OR labels like '%"host.name":"RDGU-ELA"%' OR labels like '%"host.name":"ZQIG-EL"%' OR labels like '%"host.name":"J46P-EL"%' OR labels like '%"host.name":"0OM8-ELA"%' OR labels like '%"host.name":"Q25A-EL"%' OR labels like '%"host.name":"G2LK-ELA"%' OR labels like '%"host.name":"U4IN-ELA"%' OR labels like '%"host.name":"7MWB-ELA"%' OR labels like '%"host.name":"TEST-ELA"%' OR labels like '%"host.name":"PRSO-ELA"%' OR labels like '%"host.name":"KKP8-EL"%' OR labels like '%"host.name":"PXLJ-ELA"%' OR labels like '%"host.name":"6TYD-EL"%' OR labels like '%"host.name":"9X5O-ELA"%' OR labels like '%"host.name":"C6UZ-ELA"%' OR labels like '%"host.name":"GLDH-EL"%' OR labels like '%"host.name":"ME21-ELA"%' OR labels like '%"host.name":"MG4K-EL"%' OR labels like '%"host.name":"78NI-ELA"%' OR labels like '%"host.name":"5EJJ-EL"%' OR labels like '%"host.name":"LVN7-ELA"%' OR labels like '%"host.name":"IGT0-EL"%' OR labels like '%"host.name":"S12H-ELA"%' OR labels like '%"host.name":"2S0L-ELA"%' OR labels like '%"host.name":"IJVJ-EL"%' OR labels like '%"host.name":"JJQ0-ELA"%' OR labels like '%"host.name":"UM1A-ELA"%' OR labels like '%"host.name":"BCJB-EL"%' OR labels like '%"host.name":"ER8M-ELA"%' OR labels like '%"host.name":"VM3A-ELA"%' OR labels like '%"host.name":"O28M-EL"%' OR labels like '%"host.name":"IJZP-EL"%' OR labels like '%"host.name":"OAX6-ELA"%' OR labels like '%"host.name":"8KUJ-ELA"%' OR labels like '%"host.name":"2T1F-EL"%' OR labels like '%"host.name":"OR44-EL"%' OR labels like '%"host.name":"N500-ELA"%' OR labels like '%"host.name":"I6GF-ELA"%' OR labels like '%"host.name":"LR9Z-ELA"%' OR labels like '%"host.name":"03EY-EL"%' OR labels like '%"host.name":"7LT9-ELA"%' OR labels like '%"host.name":"GSHS-EL"%' OR labels like '%"host.name":"7L5V-ELA"%' OR labels like '%"host.name":"H1VB-ELA"%' OR labels like '%"host.name":"4P96-EL"%' OR labels like '%"host.name":"QV22-EL"%' OR labels like '%"host.name":"Z7N9-ELA"%' OR labels like '%"host.name":"Z9CL-ELA"%' OR labels like '%"host.name":"FOWX-EL"%' OR labels like '%"host.name":"HUCT-EL"%' OR labels like '%"host.name":"K4Y0-ELA"%' OR labels like '%"host.name":"P1SD-ELA"%' OR labels like '%"host.name":"O28M-DEBUG-EL"%' OR labels like '%"host.name":"LMLX-EL"%' OR labels like '%"host.name":"YMQ7-EL"%' OR labels like '%"host.name":"A9ZZ-ELA"%' OR labels like '%"host.name":"T6TJ-EL"%' OR labels like '%"host.name":"8UV0-ELA"%' OR labels like '%"host.name":"77PU-ELA"%' OR labels like '%"host.name":"XC8T-EL"%' OR labels like '%"host.name":"805X-EL"%' OR labels like '%"host.name":"99BI-EL"%' OR labels like '%"host.name":"D0EW-ELA"%' OR labels like '%"host.name":"JA3M-ELA"%' OR labels like '%"host.name":"HFRS-ELA"%' OR labels like '%"host.name":"1KG2-ELA"%' OR labels like '%"host.name":"61TW-EL"%' OR labels like '%"host.name":"U87C-ELA"%' OR labels like '%"host.name":"YODJ-ELA"%' OR labels like '%"host.name":"ZPKP-EL"%' OR labels like '%"host.name":"4TNH-ELA"%' OR labels like '%"host.name":"5ZDQ-EL"%' OR labels like '%"host.name":"2XLI-EL"%' OR labels like '%"host.name":"8QN8-ELA"%' OR labels like '%"host.name":"OSDW-ELA"%' OR labels like '%"host.name":"80T1-EL"%' OR labels like '%"host.name":"4E2X-EL"%' OR labels like '%"host.name":"7IEY-ELA"%' OR labels like '%"host.name":"VUVI-ELA"%' OR labels like '%"host.name":"EDCX-EL"%' OR labels like '%"host.name":"9Q5R-ELA"%' OR labels like '%"host.name":"RBXT-ELA"%' OR labels like '%"host.name":"U1QI-ELA"%' OR labels like '%"host.name":"S6VH-ELA"%' OR labels like '%"host.name":"C7BN-EL"%' OR labels like '%"host.name":"YZZW-ELA"%' OR labels like '%"host.name":"V3ID-ELA"%' OR labels like '%"host.name":"5F1J-EL"%' OR labels like '%"host.name":"7W7G-EL"%' OR labels like '%"host.name":"Y53R-EL"%' OR labels like '%"host.name":"9214-EL"%' OR labels like '%"host.name":"LGFN-EL"%' OR labels like '%"host.name":"T197-EL"%' OR labels like '%"host.name":"8KDK-ELA"%' OR labels like '%"host.name":"DILG-EL"%' OR labels like '%"host.name":"DCN8-EL"%' OR labels like '%"host.name":"3YNM-ELA"%' OR labels like '%"host.name":"MFWZ-EL"%' OR labels like '%"host.name":"QDIG-EL"%' OR labels like '%"host.name":"0FSJ-EL"%' OR labels like '%"host.name":"4R7Z-EL"%' OR labels like '%"host.name":"P5DW-EL"%' OR labels like '%"host.name":"3NFX-EL"%' OR labels like '%"host.name":"PA0A-ELA"%' OR labels like '%"host.name":"AP6F-EL"%' OR labels like '%"host.name":"EANR-EL"%' OR labels like '%"host.name":"CAGN-EL"%' OR labels like '%"host.name":"CREE-EL"%' OR labels like '%"host.name":"HSZE-EL"%' OR labels like '%"host.name":"6STZ-EL"%' OR labels like '%"host.name":"2BI6-EL"%' OR labels like '%"host.name":"DXSN-EL"%' OR labels like '%"host.name":"PPPB-EL"%' OR labels like '%"host.name":"0VRS-EL"%' OR labels like '%"host.name":"OS8D-EL"%' OR labels like '%"host.name":"WRA3-EL"%' OR labels like '%"host.name":"C2GE-EL"%' OR labels like '%"host.name":"IYXS-EL"%' OR labels like '%"host.name":"A2JM-EL"%' OR labels like '%"host.name":"62PR-EL"%' OR labels like '%"host.name":"QWF2-EL"%' OR labels like '%"host.name":"PKU6-ELA"%' OR labels like '%"host.name":"B1AS-EL"%' OR labels like '%"host.name":"I3CI-ELA"%' OR labels like '%"host.name":"4KGP-EL"%' OR labels like '%"host.name":"AD8Y-ELA"%' OR labels like '%"host.name":"LD5H-EL"%' OR labels like '%"host.name":"KBLP-EL"%' OR labels like '%"host.name":"KFJI-EL"%' OR labels like '%"host.name":"ONV4-EL"%' OR labels like '%"host.name":"TID4-EL"%' OR labels like '%"host.name":"QK5H-EL"%' OR labels like '%"host.name":"W2JE-ELA"%' OR labels like '%"host.name":"ZFQR-ELA"%' OR labels like '%"host.name":"EAH6-EL"%' OR labels like '%"host.name":"ZB4A-EL"%' OR labels like '%"host.name":"ZQAJ-EL"%' OR labels like '%"host.name":"MIKE-ELA"%' OR labels like '%"host.name":"9138-EL"%' OR labels like '%"host.name":"S70T-ELA"%' OR labels like '%"host.name":"ZIZH-EL"%' OR labels like '%"host.name":"G2FE-EL"%' OR labels like '%"host.name":"1ILP-ELA"%' OR labels like '%"host.name":"9V27-ELA"%' OR labels like '%"host.name":"70NZ-ELA"%' OR labels like '%"host.name":"542S-ELA"%' OR labels like '%"host.name":"XOFE-EL"%' OR labels like '%"host.name":"TW0E-EL"%' OR labels like '%"host.name":"WY76-EL"%' OR labels like '%"host.name":"DQS4-EL"%' OR labels like '%"host.name":"KO0C-ML-EL"%' OR labels like '%"host.name":"NJ3G-EL"%' OR labels like '%"host.name":"J1W0-EL"%' OR labels like '%"host.name":"XISJ-EL"%' OR labels like '%"host.name":"V610-ELA"%' OR labels like '%"host.name":"H6MW-ELA"%' OR labels like '%"host.name":"4F6I-EL"%' OR labels like '%"host.name":"KRQ7-ELA"%' OR labels like '%"host.name":"KU0U-EL"%' OR labels like '%"host.name":"J1FS-ELA"%' OR labels like '%"host.name":"21TX-EL"%' OR labels like '%"host.name":"DWNS-EL"%' OR labels like '%"host.name":"OSWD-ELA"%' OR labels like '%"host.name":"ZEDP-EL"%' OR labels like '%"host.name":"TTMB-ELA"%' OR labels like '%"host.name":"8HOZ-EL"%' OR labels like '%"host.name":"EDA1-EL"%' OR labels like '%"host.name":"Y8ND-EL"%' OR labels like '%"host.name":"AQ2P-EL"%' OR labels like '%"host.name":"ZNO7-EL"%' OR labels like '%"host.name":"SULY-EL"%' OR labels like '%"host.name":"B5JH-ELA"%' OR labels like '%"host.name":"LD45-EL"%' OR labels like '%"host.name":"W5N6-EL"%' OR labels like '%"host.name":"6403-EL"%' OR labels like '%"host.name":"S9L8-EL"%' OR labels like '%"host.name":"0LKP-EL"%' OR labels like '%"host.name":"CPFU-EL"%' OR labels like '%"host.name":"V5FF-EL"%' OR labels like '%"host.name":"XMF9-EL"%' OR labels like '%"host.name":"W8YJ-EL"%' OR labels like '%"host.name":"XTU3-EL"%' OR labels like '%"host.name":"0CTS-EL"%' OR labels like '%"host.name":"O3E7-ELA"%' OR labels like '%"host.name":"XFJ4-ELA"%' OR labels like '%"host.name":"Z4VP-ELA"%' OR labels like '%"host.name":"PJCE-EL"%' OR labels like '%"host.name":"KU26-EL"%' OR labels like '%"host.name":"JLEY-EL"%' OR labels like '%"host.name":"T5Z9-EL"%' OR labels like '%"host.name":"IIWZ-EL"%' OR labels like '%"host.name":"W0H1-EL"%' OR labels like '%"host.name":"ILTK-EL"%' OR labels like '%"host.name":"1ZP0-ELA"%' OR labels like '%"host.name":"FTHG-ELA"%' OR labels like '%"host.name":"1795-ELA"%' OR labels like '%"host.name":"AG7U-ELA"%' OR labels like '%"host.name":"A9UP-ELA"%' OR labels like '%"host.name":"OIHA-EL"%' OR labels like '%"host.name":"ZF51-EL"%' OR labels like '%"host.name":"QR4C-EL"%' OR labels like '%"host.name":"057E-ELA"%' OR labels like '%"host.name":"R1WN-EL"%' OR labels like '%"host.name":"3A1K-EL"%' OR labels like '%"host.name":"MIKE-EL"%' OR labels like '%"host.name":"0R6J-EL"%' OR labels like '%"host.name":"L73J-EL"%' OR labels like '%"host.name":"QUJE-EL"%' OR labels like '%"host.name":"Y53C-EL"%' OR labels like '%"host.name":"DHDZ-EL"%' OR labels like '%"host.name":"VLCU-ELA"%' OR labels like '%"host.name":"YYP8-ELA"%' OR labels like '%"host.name":"T54Y-ELA"%' OR labels like '%"host.name":"M21C-ELA"%' OR labels like '%"host.name":"WQRL-ELA"%' OR labels like '%"host.name":"DV2K-EL"%' OR labels like '%"host.name":"EM56-EL"%' OR labels like '%"host.name":"CR6S-EL"%' OR labels like '%"host.name":"G1E2-EL"%' OR labels like '%"host.name":"8EO2-EL"%' OR labels like '%"host.name":"R3NX-EL"%' OR labels like '%"host.name":"A3ZQ-EL"%' OR labels like '%"host.name":"TDJP-EL"%' OR labels like '%"host.name":"5SQ0-EL"%' OR labels like '%"host.name":"DUFE-EL"%' OR labels like '%"host.name":"GYRO-EL"%' OR labels like '%"host.name":"NSCP-EL"%' OR labels like '%"host.name":"NUX7-ELA"%' OR labels like '%"host.name":"1GSU-ELA"%' OR labels like '%"host.name":"GE9G-ELA"%' OR labels like '%"host.name":"8HCP-ELA"%' OR labels like '%"host.name":"49FS-ELA"%' OR labels like '%"host.name":"JTHL-ELA"%' OR labels like '%"host.name":"FQD4-EL"%' OR labels like '%"host.name":"HBIO-EL"%' OR labels like '%"host.name":"WWKN-EL"%' OR labels like '%"host.name":"CZMD-EL"%' OR labels like '%"host.name":"22NZ-EL"%' OR labels like '%"host.name":"K8P3-EL"%' OR labels like '%"host.name":"PWTE-EL"%' OR labels like '%"host.name":"ML5F-EL"%' OR labels like '%"host.name":"OLMP-EL"%' OR labels like '%"host.name":"2P01-EL"%' OR labels like '%"host.name":"G5IN-EL"%' OR labels like '%"host.name":"V5R2-ELA"%' OR labels like '%"host.name":"HMRW-ELA"%' OR labels like '%"host.name":"51OW-ELA"%' OR labels like '%"host.name":"S0PA-ELA"%' OR labels like '%"host.name":"BXB3-EL"%' OR labels like '%"host.name":"S340-ELA"%' OR labels like '%"host.name":"TIB0-ELA"%' OR labels like '%"host.name":"2RJ0-ELA"%'))) order by value DESC
```

```sql
SELECT toStartOfInterval(fromUnixTimestamp64Nano(timestamp), INTERVAL 8640 SECOND) AS ts, severity_text as `severity_text`, toFloat64(count(*)) as value from signoz_logs.distributed_logs_v2 where (timestamp >= 1729113599000000000 AND timestamp <= 1731705599000000000) AND (ts_bucket_start >= 1729111799 AND ts_bucket_start <= 1731705599) AND `attribute_string_MESSAGE` ILIKE '%Failed to store print: Gantry went offline%' group by `severity_text`,ts order by value DESC
```


tenant: `zhwh-evle`
query:
```sql
SELECT toStartOfInterval(fromUnixTimestamp64Nano(timestamp), INTERVAL 17280 SECOND) AS ts, severity_text as `severity_text`, toFloat64(count(*)) as value from signoz_logs.distributed_logs_v2 where (timestamp >= 1726270719000000000 AND timestamp <= 1731454719000000000) AND (ts_bucket_start >= 1726268919 AND ts_bucket_start <= 1731454719) AND lower(body) LIKE lower('%Order status response: %') group by `severity_text`,ts order by value DESC
```

```sql
SELECT toStartOfInterval(fromUnixTimestamp64Nano(timestamp), INTERVAL 1980 SECOND) AS ts, severity_text as `severity_text`, toFloat64(count(*)) as value from signoz_logs.distributed_logs_v2 where (timestamp >= 1731189068000000000 AND timestamp <= 1731793868000000000) AND (ts_bucket_start >= 1731187268 AND ts_bucket_start <= 1731793868) AND lower(body) LIKE lower('%Sending messages to OpenAI:%') group by `severity_text`,ts order by value DESC
```

tenant: `dagf-ncx7`

```sql
SELECT toStartOfInterval(fromUnixTimestamp64Nano(timestamp), INTERVAL 1980 SECOND) AS ts, `attribute_number_http$$response$$status_code` as `http.response.status_code`, toFloat64(count(*)) as value from signoz_logs.distributed_logs_v2 where (timestamp >= 1731017208000000000 AND timestamp <= 1731622008000000000) AND (ts_bucket_start >= 1731015408 AND ts_bucket_start <= 1731622008) AND attributes_string['path'] = '/api/v3/io/companies/5170124' AND mapContains(attributes_string, 'path') AND `attribute_number_http$$response$$status_code_exists`=true AND (resource_fingerprint GLOBAL IN (SELECT fingerprint FROM signoz_logs.distributed_logs_v2_resource WHERE (seen_at_ts_bucket_start >= 1731015408) AND (seen_at_ts_bucket_start <= 1731622008) AND simpleJSONExtractString(labels, 'deployment.environment') IN 'production' AND (labels like '%"deployment.environment":"production"%'))) group by `http.response.status_code`,ts order by value DESC
```

```sql
SELECT toStartOfInterval(fromUnixTimestamp64Nano(timestamp), INTERVAL 8640 SECOND) AS ts, `attribute_number_http$$response$$status_code` as `http.response.status_code`, toFloat64(count(*)) as value from signoz_logs.distributed_logs_v2 where (timestamp >= 1729029818000000000 AND timestamp <= 1731621818000000000) AND (ts_bucket_start >= 1729028018 AND ts_bucket_start <= 1731621818) AND attributes_string['path'] = '/api/v3/io/companies/5170124' AND mapContains(attributes_string, 'path') AND `attribute_number_http$$response$$status_code_exists`=true AND (resource_fingerprint GLOBAL IN (SELECT fingerprint FROM signoz_logs.distributed_logs_v2_resource WHERE (seen_at_ts_bucket_start >= 1729028018) AND (seen_at_ts_bucket_start <= 1731621818) AND simpleJSONExtractString(labels, 'deployment.environment') IN 'production' AND (labels like '%"deployment.environment":"production"%'))) group by `http.response.status_code`,ts order by value DESC
```

tenant: `ngxf-whwg`
query:
```sql
SELECT toStartOfInterval(fromUnixTimestamp64Nano(timestamp), INTERVAL 17280 SECOND) AS ts, severity_text as `severity_text`, toFloat64(count(*)) as value from signoz_logs.distributed_logs_v2 where (timestamp >= 1726329504000000000 AND timestamp <= 1731513504000000000) AND (ts_bucket_start >= 1726327704 AND ts_bucket_start <= 1731513504) AND lower(body) LIKE lower('%Please create an opportunity in SFDC and add the account to SS0 - Qualifying. %') group by `severity_text`,ts order by value DESC
```

```sql
SELECT toStartOfInterval(fromUnixTimestamp64Nano(timestamp), INTERVAL 12060 SECOND) AS ts, severity_text as `severity_text`, toFloat64(count(*)) as value from signoz_logs.distributed_logs_v2 where (timestamp >= 1727926989000000000 AND timestamp <= 1731555789000000000) AND (ts_bucket_start >= 1727925189 AND ts_bucket_start <= 1731555789) AND lower(body) LIKE lower('%wt must be a string%') group by `severity_text`,ts order by value DESC
```

tenant: `major-weasel`
query:
```sql
SELECT subQuery.serviceName, subQuery.name, count() AS span_count, subQuery.durationNano, subQuery.traceID AS traceID FROM signoz_traces.distributed_signoz_index_v2 INNER JOIN ( SELECT * FROM (SELECT traceID, durationNano, serviceName, name FROM signoz_traces.signoz_index_v2 WHERE parentSpanID = '' AND (timestamp >= '1730259948000000000' AND timestamp <= '1731469548000000000') ORDER BY durationNano DESC LIMIT 1 BY traceID LIMIT 200) AS inner_subquery ) AS subQuery ON signoz_traces.distributed_signoz_index_v2.traceID = subQuery.traceID WHERE (timestamp >= '1730259948000000000' AND timestamp <= '1731469548000000000') GROUP BY subQuery.traceID, subQuery.durationNano, subQuery.name, subQuery.serviceName ORDER BY subQuery.durationNano desc LIMIT 1 BY subQuery.traceID;
```

tenant: `cgys-xhc8`
query:
```sql
SELECT toFloat64(count(*)) as value from signoz_logs.distributed_logs_v2 where (timestamp >= 1729022850000000000 AND timestamp <= 1731614850000000000) AND (ts_bucket_start >= 1729021050 AND ts_bucket_start <= 1731614850) AND lower(body) LIKE lower('%songstats Queue Status Job Response %') order by value DESC
```

tenant: `primer`
query:
```sql
WITH dates AS ( -- Generate all the dates in the last 43 days SELECT toStartOfDay(now() - INTERVAL number DAY) AS date FROM system.numbers WHERE number < 60 ), rolling_8_day_window AS ( SELECT d.date AS ts, count(DISTINCT JSONExtractString(labels, 'organization')) AS value FROM dates d, signoz_metrics.distributed_time_series_v2 r WHERE metric_name = 'primer_platform_build_duration_gauge' AND JSONExtractString(labels, 'deployment_environment') IN ('production') AND lower(JSONExtractString(labels, 'organization')) NOT LIKE '%primer%' AND JSONExtractString(labels, 'organization') NOT LIKE '%Bubbly 2.0%' AND JSONExtractString(labels, 'organization') NOT LIKE '%Automation Production%' AND toStartOfDay(toDateTime(r.timestamp_ms / 1000)) BETWEEN d.date - INTERVAL 8 DAY AND d.date GROUP BY d.date ORDER BY d.date ASC ) SELECT ts, value FROM rolling_8_day_window ORDER BY ts ASC;
```

```sql
SELECT `metric_name`, `timestamp_ms`, `labels` FROM `signoz_metrics`.`time_series_v2`
```

### 7. slow because other queries are running and consuming resources (or other reasons but not the query itself)

tenant: `fiscalnote`
query:
```sql
SELECT rabbitmq_queue_name, ts, max(per_series_value) as value FROM (SELECT fingerprint, any(rabbitmq_queue_name) as rabbitmq_queue_name, toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), INTERVAL 60 SECOND) as ts, max(value) as per_series_value FROM signoz_metrics.distributed_samples_v4 INNER JOIN (SELECT DISTINCT JSONExtractString(labels, 'rabbitmq_queue_name') as rabbitmq_queue_name, fingerprint FROM signoz_metrics.time_series_v4 WHERE metric_name = 'rabbitmq_message_current' AND temporality = 'Cumulative' AND unix_milli >= 1731326400000 AND unix_milli < 1731326880000 AND JSONExtractString(labels, 'state') = 'ready' AND JSONExtractString(labels, 'env') = 'prod' AND JSONExtractString(labels, 'rabbitmq_queue_name') = 'inbox_notifications') as filtered_time_series USING fingerprint WHERE metric_name = 'rabbitmq_message_current' AND unix_milli >= 1731326580000 AND unix_milli < 1731326880000 GROUP BY fingerprint, ts ORDER BY fingerprint, ts) WHERE isNaN(per_series_value) = 0 GROUP BY rabbitmq_queue_name, ts ORDER BY rabbitmq_queue_name ASC, ts ASC
```

```sql
SELECT load_balancer_name, ts, min(per_series_value) as value FROM (SELECT fingerprint, any(load_balancer_name) as load_balancer_name, toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), INTERVAL 60 SECOND) as ts, min(value) as per_series_value FROM signoz_metrics.distributed_samples_v4 INNER JOIN (SELECT DISTINCT JSONExtractString(labels, 'load_balancer_name') as load_balancer_name, fingerprint FROM signoz_metrics.time_series_v4 WHERE metric_name = 'aws_elb_un_healthy_host_count_minimum' AND temporality = 'Unspecified' AND unix_milli >= 1731326400000 AND unix_milli < 1731326880000 AND like(JSONExtractString(labels, 'service_name'), '%fn-837-cloudwatch%') AND like(JSONExtractString(labels, 'load_balancer_name'), '%fn-linkable-items-prod-lb%')) as filtered_time_series USING fingerprint WHERE metric_name = 'aws_elb_un_healthy_host_count_minimum' AND unix_milli >= 1731326580000 AND unix_milli < 1731326880000 GROUP BY fingerprint, ts ORDER BY fingerprint, ts) WHERE isNaN(per_series_value) = 0 GROUP BY load_balancer_name, ts ORDER BY load_balancer_name ASC, ts ASC
```

tenant: `fiscalnote`
query:
```sql
SELECT DISTINCT name, datatype from signoz_logs.distributed_logs_attribute_keys group by name, datatype
```