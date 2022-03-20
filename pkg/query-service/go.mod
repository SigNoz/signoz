module go.signoz.io/query-service

go 1.14

require (
	github.com/ClickHouse/clickhouse-go/v2 v2.0.12
	github.com/Microsoft/go-winio v0.5.1 // indirect
	github.com/armon/go-metrics v0.3.10 // indirect
	github.com/containerd/containerd v1.4.12 // indirect
	github.com/dhui/dktest v0.3.4 // indirect
	github.com/docker/docker v20.10.12+incompatible // indirect
	github.com/go-kit/log v0.2.0
	github.com/golang-migrate/migrate/v4 v4.14.1
	github.com/google/uuid v1.3.0
	github.com/gorilla/handlers v1.5.1
	github.com/gorilla/mux v1.8.0
	github.com/gosimple/slug v1.10.0
	github.com/hashicorp/go-msgpack v1.1.5 // indirect
	github.com/hashicorp/go-uuid v1.0.2 // indirect
	github.com/hashicorp/memberlist v0.3.1 // indirect
	github.com/jmoiron/sqlx v1.3.4
	github.com/json-iterator/go v1.1.12
	github.com/lib/pq v1.10.0 // indirect
	github.com/mattn/go-sqlite3 v1.14.8
	github.com/mitchellh/go-testing-interface v1.14.1 // indirect
	github.com/moby/term v0.0.0-20210619224110-3f7ff695adc6 // indirect
	github.com/oklog/oklog v0.3.2
	github.com/oklog/run v1.1.0 // indirect
	github.com/opencontainers/image-spec v1.0.2 // indirect
	github.com/pkg/errors v0.9.1
	github.com/prometheus/client_golang v1.12.1
	github.com/prometheus/common v0.32.1
	github.com/prometheus/prometheus v0.0.0-00010101000000-000000000000
	github.com/prometheus/tsdb v0.10.0
	github.com/rs/cors v1.7.0
	github.com/segmentio/backo-go v1.0.0 // indirect
	github.com/smartystreets/goconvey v1.6.4
	github.com/soheilhy/cmux v0.1.4
	github.com/xtgo/uuid v0.0.0-20140804021211-a0b114877d4c // indirect
	go.uber.org/zap v1.16.0
	golang.org/x/lint v0.0.0-20210508222113-6edffad5e616 // indirect
	google.golang.org/genproto v0.0.0-20211013025323-ce878158c4d4 // indirect
	google.golang.org/grpc v1.41.0 // indirect
	google.golang.org/grpc/examples v0.0.0-20210803221256-6ba56c814be7 // indirect
	gopkg.in/check.v1 v1.0.0-20201130134442-10cb98267c6c // indirect
	gopkg.in/segmentio/analytics-go.v3 v3.1.0
	gotest.tools/v3 v3.1.0 // indirect
	k8s.io/apimachinery v0.23.5

)

replace github.com/prometheus/prometheus => github.com/SigNoz/prometheus v1.9.70
