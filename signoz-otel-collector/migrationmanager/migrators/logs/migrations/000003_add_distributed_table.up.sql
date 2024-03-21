CREATE TABLE IF NOT EXISTS signoz_logs.distributed_logs  ON CLUSTER {{.SIGNOZ_CLUSTER}} AS signoz_logs.logs
ENGINE = Distributed("{{.SIGNOZ_CLUSTER}}", "signoz_logs", logs, cityHash64(id));

CREATE TABLE IF NOT EXISTS signoz_logs.distributed_logs_atrribute_keys  ON CLUSTER {{.SIGNOZ_CLUSTER}} AS signoz_logs.logs_atrribute_keys
ENGINE = Distributed("{{.SIGNOZ_CLUSTER}}", "signoz_logs", logs_atrribute_keys, cityHash64(datatype));

CREATE TABLE IF NOT EXISTS signoz_logs.distributed_logs_resource_keys  ON CLUSTER {{.SIGNOZ_CLUSTER}} AS signoz_logs.logs_resource_keys
ENGINE = Distributed("{{.SIGNOZ_CLUSTER}}", "signoz_logs", logs_resource_keys, cityHash64(datatype));
