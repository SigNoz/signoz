module github.com/SigNoz/signoz-otel-collector

go 1.21

require (
	github.com/ClickHouse/ch-go v0.58.2
	github.com/ClickHouse/clickhouse-go/v2 v2.15.0
	github.com/IBM/sarama v1.41.2
	github.com/Shopify/sarama v1.38.1
	github.com/apache/thrift v0.19.0
	github.com/aws/aws-sdk-go v1.45.26
	github.com/cenkalti/backoff/v4 v4.2.1
	github.com/gogo/protobuf v1.3.2
	github.com/golang-migrate/migrate/v4 v4.15.1
	github.com/golang/groupcache v0.0.0-20210331224755-41bb18bfe9da
	github.com/golang/snappy v0.0.4
	github.com/google/uuid v1.6.0
	github.com/gorilla/mux v1.8.0
	github.com/gorilla/websocket v1.5.0
	github.com/hashicorp/golang-lru v1.0.2
	github.com/knadh/koanf v1.5.0
	github.com/oklog/ulid v1.3.1
	github.com/open-telemetry/opamp-go v0.5.0
	github.com/open-telemetry/opentelemetry-collector-contrib/exporter/awss3exporter v0.88.0
	github.com/open-telemetry/opentelemetry-collector-contrib/exporter/carbonexporter v0.88.0
	github.com/open-telemetry/opentelemetry-collector-contrib/exporter/fileexporter v0.88.0
	github.com/open-telemetry/opentelemetry-collector-contrib/exporter/jaegerexporter v0.85.0
	github.com/open-telemetry/opentelemetry-collector-contrib/exporter/jaegerthrifthttpexporter v0.85.0
	github.com/open-telemetry/opentelemetry-collector-contrib/exporter/kafkaexporter v0.88.0
	github.com/open-telemetry/opentelemetry-collector-contrib/exporter/loadbalancingexporter v0.88.0
	github.com/open-telemetry/opentelemetry-collector-contrib/exporter/opencensusexporter v0.88.0
	github.com/open-telemetry/opentelemetry-collector-contrib/exporter/parquetexporter v0.87.0
	github.com/open-telemetry/opentelemetry-collector-contrib/exporter/prometheusexporter v0.88.0
	github.com/open-telemetry/opentelemetry-collector-contrib/exporter/prometheusremotewriteexporter v0.88.0
	github.com/open-telemetry/opentelemetry-collector-contrib/exporter/pulsarexporter v0.88.0
	github.com/open-telemetry/opentelemetry-collector-contrib/exporter/zipkinexporter v0.88.0
	github.com/open-telemetry/opentelemetry-collector-contrib/extension/basicauthextension v0.88.0
	github.com/open-telemetry/opentelemetry-collector-contrib/extension/bearertokenauthextension v0.88.0
	github.com/open-telemetry/opentelemetry-collector-contrib/extension/healthcheckextension v0.88.0
	github.com/open-telemetry/opentelemetry-collector-contrib/extension/httpforwarder v0.88.0
	github.com/open-telemetry/opentelemetry-collector-contrib/extension/jaegerremotesampling v0.88.0
	github.com/open-telemetry/opentelemetry-collector-contrib/extension/oauth2clientauthextension v0.88.0
	github.com/open-telemetry/opentelemetry-collector-contrib/extension/observer/dockerobserver v0.88.0
	github.com/open-telemetry/opentelemetry-collector-contrib/extension/observer/ecsobserver v0.88.0
	github.com/open-telemetry/opentelemetry-collector-contrib/extension/observer/ecstaskobserver v0.88.0
	github.com/open-telemetry/opentelemetry-collector-contrib/extension/observer/hostobserver v0.88.0
	github.com/open-telemetry/opentelemetry-collector-contrib/extension/observer/k8sobserver v0.88.0
	github.com/open-telemetry/opentelemetry-collector-contrib/extension/oidcauthextension v0.88.0
	github.com/open-telemetry/opentelemetry-collector-contrib/extension/pprofextension v0.88.0
	github.com/open-telemetry/opentelemetry-collector-contrib/extension/storage v0.88.0
	github.com/open-telemetry/opentelemetry-collector-contrib/pkg/pdatatest v0.88.0
	github.com/open-telemetry/opentelemetry-collector-contrib/pkg/resourcetotelemetry v0.88.0
	github.com/open-telemetry/opentelemetry-collector-contrib/pkg/stanza v0.88.0
	github.com/open-telemetry/opentelemetry-collector-contrib/processor/attributesprocessor v0.88.0
	github.com/open-telemetry/opentelemetry-collector-contrib/processor/cumulativetodeltaprocessor v0.88.0
	github.com/open-telemetry/opentelemetry-collector-contrib/processor/deltatorateprocessor v0.88.0
	github.com/open-telemetry/opentelemetry-collector-contrib/processor/filterprocessor v0.88.0
	github.com/open-telemetry/opentelemetry-collector-contrib/processor/groupbyattrsprocessor v0.88.0
	github.com/open-telemetry/opentelemetry-collector-contrib/processor/groupbytraceprocessor v0.88.0
	github.com/open-telemetry/opentelemetry-collector-contrib/processor/k8sattributesprocessor v0.88.0
	github.com/open-telemetry/opentelemetry-collector-contrib/processor/logstransformprocessor v0.88.0
	github.com/open-telemetry/opentelemetry-collector-contrib/processor/metricsgenerationprocessor v0.88.0
	github.com/open-telemetry/opentelemetry-collector-contrib/processor/metricstransformprocessor v0.88.0
	github.com/open-telemetry/opentelemetry-collector-contrib/processor/probabilisticsamplerprocessor v0.88.0
	github.com/open-telemetry/opentelemetry-collector-contrib/processor/redactionprocessor v0.88.0
	github.com/open-telemetry/opentelemetry-collector-contrib/processor/resourcedetectionprocessor v0.88.0
	github.com/open-telemetry/opentelemetry-collector-contrib/processor/resourceprocessor v0.88.0
	github.com/open-telemetry/opentelemetry-collector-contrib/processor/routingprocessor v0.88.0
	github.com/open-telemetry/opentelemetry-collector-contrib/processor/schemaprocessor v0.88.0
	github.com/open-telemetry/opentelemetry-collector-contrib/processor/servicegraphprocessor v0.88.0
	github.com/open-telemetry/opentelemetry-collector-contrib/processor/spanmetricsprocessor v0.88.0
	github.com/open-telemetry/opentelemetry-collector-contrib/processor/spanprocessor v0.88.0
	github.com/open-telemetry/opentelemetry-collector-contrib/processor/tailsamplingprocessor v0.88.0
	github.com/open-telemetry/opentelemetry-collector-contrib/processor/transformprocessor v0.88.0
	github.com/open-telemetry/opentelemetry-collector-contrib/receiver/apachereceiver v0.88.0
	github.com/open-telemetry/opentelemetry-collector-contrib/receiver/awscloudwatchmetricsreceiver v0.88.0
	github.com/open-telemetry/opentelemetry-collector-contrib/receiver/awscloudwatchreceiver v0.88.0
	github.com/open-telemetry/opentelemetry-collector-contrib/receiver/awscontainerinsightreceiver v0.88.0
	github.com/open-telemetry/opentelemetry-collector-contrib/receiver/awsecscontainermetricsreceiver v0.88.0
	github.com/open-telemetry/opentelemetry-collector-contrib/receiver/awsfirehosereceiver v0.88.0
	github.com/open-telemetry/opentelemetry-collector-contrib/receiver/awsxrayreceiver v0.88.0
	github.com/open-telemetry/opentelemetry-collector-contrib/receiver/azureblobreceiver v0.88.0
	github.com/open-telemetry/opentelemetry-collector-contrib/receiver/azureeventhubreceiver v0.88.0
	github.com/open-telemetry/opentelemetry-collector-contrib/receiver/azuremonitorreceiver v0.88.0
	github.com/open-telemetry/opentelemetry-collector-contrib/receiver/carbonreceiver v0.88.0
	github.com/open-telemetry/opentelemetry-collector-contrib/receiver/collectdreceiver v0.88.0
	github.com/open-telemetry/opentelemetry-collector-contrib/receiver/couchdbreceiver v0.88.0
	github.com/open-telemetry/opentelemetry-collector-contrib/receiver/dockerstatsreceiver v0.88.0
	github.com/open-telemetry/opentelemetry-collector-contrib/receiver/dotnetdiagnosticsreceiver v0.76.3
	github.com/open-telemetry/opentelemetry-collector-contrib/receiver/elasticsearchreceiver v0.88.0
	github.com/open-telemetry/opentelemetry-collector-contrib/receiver/filelogreceiver v0.88.0
	github.com/open-telemetry/opentelemetry-collector-contrib/receiver/fluentforwardreceiver v0.88.0
	github.com/open-telemetry/opentelemetry-collector-contrib/receiver/hostmetricsreceiver v0.88.0
	github.com/open-telemetry/opentelemetry-collector-contrib/receiver/httpcheckreceiver v0.88.0
	github.com/open-telemetry/opentelemetry-collector-contrib/receiver/jaegerreceiver v0.88.0
	github.com/open-telemetry/opentelemetry-collector-contrib/receiver/jmxreceiver v0.88.0
	github.com/open-telemetry/opentelemetry-collector-contrib/receiver/journaldreceiver v0.88.0
	github.com/open-telemetry/opentelemetry-collector-contrib/receiver/k8sclusterreceiver v0.88.0
	github.com/open-telemetry/opentelemetry-collector-contrib/receiver/k8seventsreceiver v0.88.0
	github.com/open-telemetry/opentelemetry-collector-contrib/receiver/k8sobjectsreceiver v0.88.0
	github.com/open-telemetry/opentelemetry-collector-contrib/receiver/kafkametricsreceiver v0.88.0
	github.com/open-telemetry/opentelemetry-collector-contrib/receiver/kafkareceiver v0.88.0
	github.com/open-telemetry/opentelemetry-collector-contrib/receiver/kubeletstatsreceiver v0.88.0
	github.com/open-telemetry/opentelemetry-collector-contrib/receiver/memcachedreceiver v0.88.0
	github.com/open-telemetry/opentelemetry-collector-contrib/receiver/mongodbatlasreceiver v0.88.0
	github.com/open-telemetry/opentelemetry-collector-contrib/receiver/mongodbreceiver v0.88.0
	github.com/open-telemetry/opentelemetry-collector-contrib/receiver/mysqlreceiver v0.88.0
	github.com/open-telemetry/opentelemetry-collector-contrib/receiver/nginxreceiver v0.88.0
	github.com/open-telemetry/opentelemetry-collector-contrib/receiver/opencensusreceiver v0.88.0
	github.com/open-telemetry/opentelemetry-collector-contrib/receiver/oracledbreceiver v0.88.0
	github.com/open-telemetry/opentelemetry-collector-contrib/receiver/otlpjsonfilereceiver v0.88.0
	github.com/open-telemetry/opentelemetry-collector-contrib/receiver/podmanreceiver v0.88.0
	github.com/open-telemetry/opentelemetry-collector-contrib/receiver/postgresqlreceiver v0.88.0
	github.com/open-telemetry/opentelemetry-collector-contrib/receiver/prometheusexecreceiver v0.82.0
	github.com/open-telemetry/opentelemetry-collector-contrib/receiver/prometheusreceiver v0.88.0
	github.com/open-telemetry/opentelemetry-collector-contrib/receiver/pulsarreceiver v0.88.0
	github.com/open-telemetry/opentelemetry-collector-contrib/receiver/rabbitmqreceiver v0.88.0
	github.com/open-telemetry/opentelemetry-collector-contrib/receiver/receivercreator v0.88.0
	github.com/open-telemetry/opentelemetry-collector-contrib/receiver/redisreceiver v0.88.0
	github.com/open-telemetry/opentelemetry-collector-contrib/receiver/simpleprometheusreceiver v0.88.0
	github.com/open-telemetry/opentelemetry-collector-contrib/receiver/skywalkingreceiver v0.88.0
	github.com/open-telemetry/opentelemetry-collector-contrib/receiver/sqlqueryreceiver v0.88.0
	github.com/open-telemetry/opentelemetry-collector-contrib/receiver/sqlserverreceiver v0.88.0
	github.com/open-telemetry/opentelemetry-collector-contrib/receiver/statsdreceiver v0.88.0
	github.com/open-telemetry/opentelemetry-collector-contrib/receiver/syslogreceiver v0.88.0
	github.com/open-telemetry/opentelemetry-collector-contrib/receiver/tcplogreceiver v0.88.0
	github.com/open-telemetry/opentelemetry-collector-contrib/receiver/udplogreceiver v0.88.0
	github.com/open-telemetry/opentelemetry-collector-contrib/receiver/zipkinreceiver v0.88.0
	github.com/open-telemetry/opentelemetry-collector-contrib/receiver/zookeeperreceiver v0.88.0
	github.com/pkg/errors v0.9.1
	github.com/prometheus/client_golang v1.17.0
	github.com/prometheus/common v0.44.0
	github.com/prometheus/prometheus v0.47.2
	github.com/segmentio/ksuid v1.0.4
	github.com/sirupsen/logrus v1.9.3
	github.com/spf13/pflag v1.0.5
	github.com/spf13/viper v1.16.0
	github.com/stretchr/testify v1.8.4
	github.com/tilinna/clock v1.1.0
	github.com/vjeantet/grok v1.0.1
	github.com/xdg-go/scram v1.1.2
	go.opencensus.io v0.24.0
	go.opentelemetry.io/collector v0.88.0
	go.opentelemetry.io/collector/component v0.88.0
	go.opentelemetry.io/collector/config/configgrpc v0.88.0
	go.opentelemetry.io/collector/config/confighttp v0.88.0
	go.opentelemetry.io/collector/config/configopaque v0.88.0
	go.opentelemetry.io/collector/config/configtelemetry v0.88.0
	go.opentelemetry.io/collector/config/configtls v0.88.0
	go.opentelemetry.io/collector/confmap v0.88.0
	go.opentelemetry.io/collector/consumer v0.88.0
	go.opentelemetry.io/collector/exporter v0.88.0
	go.opentelemetry.io/collector/exporter/loggingexporter v0.88.0
	go.opentelemetry.io/collector/exporter/otlpexporter v0.88.0
	go.opentelemetry.io/collector/exporter/otlphttpexporter v0.88.0
	go.opentelemetry.io/collector/extension v0.88.0
	go.opentelemetry.io/collector/extension/ballastextension v0.88.0
	go.opentelemetry.io/collector/extension/zpagesextension v0.88.0
	go.opentelemetry.io/collector/featuregate v1.0.0-rcv0017
	go.opentelemetry.io/collector/otelcol v0.88.0
	go.opentelemetry.io/collector/pdata v1.0.0-rcv0017
	go.opentelemetry.io/collector/processor v0.88.0
	go.opentelemetry.io/collector/processor/batchprocessor v0.88.0
	go.opentelemetry.io/collector/processor/memorylimiterprocessor v0.88.0
	go.opentelemetry.io/collector/receiver v0.88.0
	go.opentelemetry.io/collector/receiver/otlpreceiver v0.88.0
	go.opentelemetry.io/collector/semconv v0.88.0
	go.opentelemetry.io/otel/trace v1.22.0
	go.uber.org/atomic v1.11.0
	go.uber.org/multierr v1.11.0
	go.uber.org/zap v1.26.0
	golang.org/x/text v0.14.0
	google.golang.org/grpc v1.59.0
	google.golang.org/protobuf v1.31.0
	gopkg.in/yaml.v2 v2.4.0
)

require (
	cloud.google.com/go/compute v1.23.0 // indirect
	cloud.google.com/go/compute/metadata v0.2.4-0.20230617002413-005d2dfb6b68 // indirect
	github.com/99designs/go-keychain v0.0.0-20191008050251-8e49817e8af4 // indirect
	github.com/99designs/keyring v1.2.2 // indirect
	github.com/AthenZ/athenz v1.10.39 // indirect
	github.com/Azure/azure-amqp-common-go/v4 v4.2.0 // indirect
	github.com/Azure/azure-event-hubs-go/v3 v3.6.1 // indirect
	github.com/Azure/azure-sdk-for-go v68.0.0+incompatible // indirect
	github.com/Azure/azure-sdk-for-go/sdk/azcore v1.7.0 // indirect
	github.com/Azure/azure-sdk-for-go/sdk/azidentity v1.3.0 // indirect
	github.com/Azure/azure-sdk-for-go/sdk/internal v1.3.0 // indirect
	github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/monitor/armmonitor v0.8.0 // indirect
	github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/resources/armresources v1.0.0 // indirect
	github.com/Azure/azure-sdk-for-go/sdk/storage/azblob v1.2.0 // indirect
	github.com/Azure/go-amqp v1.0.2 // indirect
	github.com/Azure/go-autorest v14.2.0+incompatible // indirect
	github.com/Azure/go-autorest/autorest v0.11.29 // indirect
	github.com/Azure/go-autorest/autorest/adal v0.9.23 // indirect
	github.com/Azure/go-autorest/autorest/date v0.3.0 // indirect
	github.com/Azure/go-autorest/autorest/to v0.4.0 // indirect
	github.com/Azure/go-autorest/autorest/validation v0.3.1 // indirect
	github.com/Azure/go-autorest/logger v0.2.1 // indirect
	github.com/Azure/go-autorest/tracing v0.6.0 // indirect
	github.com/AzureAD/microsoft-authentication-library-for-go v1.0.0 // indirect
	github.com/DataDog/zstd v1.5.0 // indirect
	github.com/GehirnInc/crypt v0.0.0-20200316065508-bb7000b8a962 // indirect
	github.com/GoogleCloudPlatform/opentelemetry-operations-go/detectors/gcp v1.20.0 // indirect
	github.com/JohnCGriffin/overflow v0.0.0-20211019200055-46fa312c352c // indirect
	github.com/Microsoft/go-winio v0.6.1 // indirect
	github.com/SAP/go-hdb v1.3.10 // indirect
	github.com/Showmax/go-fqdn v1.0.0 // indirect
	github.com/alecthomas/participle/v2 v2.1.0 // indirect
	github.com/alecthomas/units v0.0.0-20211218093645-b94a6e3cc137 // indirect
	github.com/apache/arrow/go/v12 v12.0.1 // indirect
	github.com/apache/pulsar-client-go v0.8.1 // indirect
	github.com/apache/pulsar-client-go/oauth2 v0.0.0-20220120090717-25e59572242e // indirect
	github.com/ardielle/ardielle-go v1.5.2 // indirect
	github.com/armon/go-metrics v0.4.1 // indirect
	github.com/aws/aws-sdk-go-v2 v1.21.2 // indirect
	github.com/aws/aws-sdk-go-v2/aws/protocol/eventstream v1.4.10 // indirect
	github.com/aws/aws-sdk-go-v2/credentials v1.13.43 // indirect
	github.com/aws/aws-sdk-go-v2/feature/s3/manager v1.11.59 // indirect
	github.com/aws/aws-sdk-go-v2/internal/configsources v1.1.43 // indirect
	github.com/aws/aws-sdk-go-v2/internal/endpoints/v2 v2.4.37 // indirect
	github.com/aws/aws-sdk-go-v2/internal/v4a v1.0.23 // indirect
	github.com/aws/aws-sdk-go-v2/service/internal/accept-encoding v1.9.11 // indirect
	github.com/aws/aws-sdk-go-v2/service/internal/checksum v1.1.26 // indirect
	github.com/aws/aws-sdk-go-v2/service/internal/presigned-url v1.9.37 // indirect
	github.com/aws/aws-sdk-go-v2/service/internal/s3shared v1.14.0 // indirect
	github.com/aws/aws-sdk-go-v2/service/s3 v1.31.0 // indirect
	github.com/aws/smithy-go v1.15.0 // indirect
	github.com/blang/semver v3.5.1+incompatible // indirect
	github.com/census-instrumentation/opencensus-proto v0.4.1 // indirect
	github.com/checkpoint-restore/go-criu/v5 v5.3.0 // indirect
	github.com/cilium/ebpf v0.7.0 // indirect
	github.com/cncf/xds/go v0.0.0-20230607035331-e9ce68804cb4 // indirect
	github.com/containerd/console v1.0.3 // indirect
	github.com/containerd/ttrpc v1.1.0 // indirect
	github.com/coreos/go-oidc v2.2.1+incompatible // indirect
	github.com/coreos/go-systemd/v22 v22.5.0 // indirect
	github.com/cyphar/filepath-securejoin v0.2.4 // indirect
	github.com/danieljoos/wincred v1.1.2 // indirect
	github.com/denisenkom/go-mssqldb v0.12.2 // indirect
	github.com/dennwc/varint v1.0.0 // indirect
	github.com/devigned/tab v0.1.1 // indirect
	github.com/digitalocean/godo v1.99.0 // indirect
	github.com/docker/distribution v2.8.2+incompatible // indirect
	github.com/docker/go-units v0.5.0 // indirect
	github.com/dvsekhvalnov/jose2go v1.6.0 // indirect
	github.com/emicklei/go-restful/v3 v3.10.2 // indirect
	github.com/envoyproxy/go-control-plane v0.11.1 // indirect
	github.com/envoyproxy/protoc-gen-validate v1.0.2 // indirect
	github.com/euank/go-kmsg-parser v2.0.0+incompatible // indirect
	github.com/fatih/color v1.15.0 // indirect
	github.com/form3tech-oss/jwt-go v3.2.5+incompatible // indirect
	github.com/gabriel-vasile/mimetype v1.4.2 // indirect
	github.com/go-faster/city v1.0.1 // indirect
	github.com/go-faster/errors v0.7.1 // indirect
	github.com/go-openapi/jsonpointer v0.20.0 // indirect
	github.com/go-openapi/jsonreference v0.20.2 // indirect
	github.com/go-openapi/swag v0.22.4 // indirect
	github.com/go-redis/redis/v7 v7.4.1 // indirect
	github.com/go-resty/resty/v2 v2.7.0 // indirect
	github.com/go-sql-driver/mysql v1.7.1 // indirect
	github.com/go-zookeeper/zk v1.0.3 // indirect
	github.com/gobwas/glob v0.2.3 // indirect
	github.com/goccy/go-json v0.10.0 // indirect
	github.com/godbus/dbus v0.0.0-20190726142602-4481cbc300e2 // indirect
	github.com/godbus/dbus/v5 v5.0.6 // indirect
	github.com/golang-jwt/jwt v3.2.2+incompatible // indirect
	github.com/golang-jwt/jwt/v4 v4.5.0 // indirect
	github.com/golang-sql/civil v0.0.0-20190719163853-cb61b32ac6fe // indirect
	github.com/golang-sql/sqlexp v0.1.0 // indirect
	github.com/google/cadvisor v0.47.3 // indirect
	github.com/google/flatbuffers v23.1.21+incompatible // indirect
	github.com/google/gnostic-models v0.6.8 // indirect
	github.com/google/go-cmp v0.6.0 // indirect
	github.com/google/go-querystring v1.1.0 // indirect
	github.com/google/gofuzz v1.2.0 // indirect
	github.com/google/s2a-go v0.1.7 // indirect
	github.com/googleapis/enterprise-certificate-proxy v0.3.1 // indirect
	github.com/googleapis/gax-go/v2 v2.12.0 // indirect
	github.com/gophercloud/gophercloud v1.5.0 // indirect
	github.com/grafana/regexp v0.0.0-20221122212121-6b5c0a4cb7fd // indirect
	github.com/grobie/gomemcache v0.0.0-20180201122607-1f779c573665 // indirect
	github.com/gsterjov/go-libsecret v0.0.0-20161001094733-a6f4afe4910c // indirect
	github.com/hashicorp/consul/api v1.25.1 // indirect
	github.com/hashicorp/cronexpr v1.1.2 // indirect
	github.com/hashicorp/go-cleanhttp v0.5.2 // indirect
	github.com/hashicorp/go-hclog v1.5.0 // indirect
	github.com/hashicorp/go-immutable-radix v1.3.1 // indirect
	github.com/hashicorp/go-retryablehttp v0.7.4 // indirect
	github.com/hashicorp/go-rootcerts v1.0.2 // indirect
	github.com/hashicorp/go-version v1.6.0 // indirect
	github.com/hashicorp/nomad/api v0.0.0-20230718173136-3a687930bd3e // indirect
	github.com/hashicorp/serf v0.10.1 // indirect
	github.com/hetznercloud/hcloud-go/v2 v2.0.0 // indirect
	github.com/iancoleman/strcase v0.3.0 // indirect
	github.com/imdario/mergo v0.3.16 // indirect
	github.com/ionos-cloud/sdk-go/v6 v6.1.8 // indirect
	github.com/josharian/intern v1.0.0 // indirect
	github.com/jpillora/backoff v1.0.0 // indirect
	github.com/karrick/godirwalk v1.17.0 // indirect
	github.com/kballard/go-shellquote v0.0.0-20180428030007-95032a82bc51 // indirect
	github.com/klauspost/asmfmt v1.3.2 // indirect
	github.com/klauspost/cpuid/v2 v2.2.3 // indirect
	github.com/knadh/koanf/v2 v2.0.1 // indirect
	github.com/kolo/xmlrpc v0.0.0-20220921171641-a4b6fa1dd06b // indirect
	github.com/kylelemons/godebug v1.1.0 // indirect
	github.com/lightstep/go-expohisto v1.0.0 // indirect
	github.com/linkedin/goavro/v2 v2.9.8 // indirect
	github.com/linode/linodego v1.19.0 // indirect
	github.com/mailru/easyjson v0.7.7 // indirect
	github.com/mattn/go-colorable v0.1.13 // indirect
	github.com/mattn/go-isatty v0.0.19 // indirect
	github.com/miekg/dns v1.1.55 // indirect
	github.com/minio/asm2plan9s v0.0.0-20200509001527-cdd76441f9d8 // indirect
	github.com/minio/c2goasm v0.0.0-20190812172519-36a3d3bbc4f3 // indirect
	github.com/mistifyio/go-zfs v2.1.2-0.20190413222219-f784269be439+incompatible // indirect
	github.com/mitchellh/go-homedir v1.1.0 // indirect
	github.com/mitchellh/hashstructure/v2 v2.0.2 // indirect
	github.com/moby/sys/mountinfo v0.6.2 // indirect
	github.com/mongodb-forks/digest v1.0.5 // indirect
	github.com/montanaflynn/stats v0.7.0 // indirect
	github.com/mrunalp/fileutils v0.5.1 // indirect
	github.com/mtibben/percent v0.2.1 // indirect
	github.com/munnerz/goautoneg v0.0.0-20191010083416-a7dc8b61c822 // indirect
	github.com/mwitkow/go-conntrack v0.0.0-20190716064945-2f068394615f // indirect
	github.com/nginxinc/nginx-prometheus-exporter v0.8.1-0.20201110005315-f5a5f8086c19 // indirect
	github.com/open-telemetry/opentelemetry-collector-contrib/extension/observer v0.88.0 // indirect
	github.com/open-telemetry/opentelemetry-collector-contrib/internal/aws/awsutil v0.88.0 // indirect
	github.com/open-telemetry/opentelemetry-collector-contrib/internal/aws/containerinsight v0.88.0 // indirect
	github.com/open-telemetry/opentelemetry-collector-contrib/internal/aws/ecsutil v0.88.0 // indirect
	github.com/open-telemetry/opentelemetry-collector-contrib/internal/aws/k8s v0.88.0 // indirect
	github.com/open-telemetry/opentelemetry-collector-contrib/internal/aws/metrics v0.88.0 // indirect
	github.com/open-telemetry/opentelemetry-collector-contrib/internal/aws/proxy v0.88.0 // indirect
	github.com/open-telemetry/opentelemetry-collector-contrib/internal/aws/xray v0.88.0 // indirect
	github.com/open-telemetry/opentelemetry-collector-contrib/internal/common v0.88.0 // indirect
	github.com/open-telemetry/opentelemetry-collector-contrib/internal/docker v0.88.0 // indirect
	github.com/open-telemetry/opentelemetry-collector-contrib/internal/k8sconfig v0.88.0 // indirect
	github.com/open-telemetry/opentelemetry-collector-contrib/internal/kafka v0.88.0 // indirect
	github.com/open-telemetry/opentelemetry-collector-contrib/internal/kubelet v0.88.0 // indirect
	github.com/open-telemetry/opentelemetry-collector-contrib/internal/metadataproviders v0.88.0 // indirect
	github.com/open-telemetry/opentelemetry-collector-contrib/internal/sharedcomponent v0.88.0 // indirect
	github.com/open-telemetry/opentelemetry-collector-contrib/pkg/batchpersignal v0.88.0 // indirect
	github.com/open-telemetry/opentelemetry-collector-contrib/pkg/experimentalmetricmetadata v0.88.0 // indirect
	github.com/open-telemetry/opentelemetry-collector-contrib/pkg/ottl v0.88.0 // indirect
	github.com/open-telemetry/opentelemetry-collector-contrib/pkg/translator/opencensus v0.88.0 // indirect
	github.com/open-telemetry/opentelemetry-collector-contrib/pkg/translator/prometheusremotewrite v0.88.0 // indirect
	github.com/open-telemetry/opentelemetry-collector-contrib/pkg/winperfcounters v0.88.0 // indirect
	github.com/opencontainers/go-digest v1.0.0 // indirect
	github.com/opencontainers/image-spec v1.1.0-rc5 // indirect
	github.com/opencontainers/runc v1.1.12 // indirect
	github.com/opencontainers/runtime-spec v1.0.3-0.20220909204839-494a5a6aca78 // indirect
	github.com/opencontainers/selinux v1.10.0 // indirect
	github.com/openshift/api v3.9.0+incompatible // indirect
	github.com/openshift/client-go v0.0.0-20210521082421-73d9475a9142 // indirect
	github.com/ovh/go-ovh v1.4.1 // indirect
	github.com/philhofer/fwd v1.1.2 // indirect
	github.com/pierrec/lz4 v2.6.1+incompatible // indirect
	github.com/pkg/browser v0.0.0-20210911075715-681adbf594b8 // indirect
	github.com/pquerna/cachecontrol v0.1.0 // indirect
	github.com/prometheus/common/sigv4 v0.1.0 // indirect
	github.com/relvacode/iso8601 v1.3.0 // indirect
	github.com/scaleway/scaleway-sdk-go v1.0.0-beta.20 // indirect
	github.com/seccomp/libseccomp-golang v0.9.2-0.20220502022130-f33da4d89646 // indirect
	github.com/segmentio/asm v1.2.0 // indirect
	github.com/sijms/go-ora/v2 v2.7.19 // indirect
	github.com/snowflakedb/gosnowflake v1.6.25 // indirect
	github.com/soheilhy/cmux v0.1.5 // indirect
	github.com/spaolacci/murmur3 v1.1.0 // indirect
	github.com/syndtr/gocapability v0.0.0-20200815063812-42c35b437635 // indirect
	github.com/tg123/go-htpasswd v1.2.1 // indirect
	github.com/tidwall/gjson v1.10.2 // indirect
	github.com/tidwall/match v1.1.1 // indirect
	github.com/tidwall/pretty v1.2.0 // indirect
	github.com/tidwall/tinylru v1.1.0 // indirect
	github.com/tidwall/wal v1.1.7 // indirect
	github.com/tinylib/msgp v1.1.8 // indirect
	github.com/vishvananda/netlink v1.1.1-0.20201029203352-d40f9887b852 // indirect
	github.com/vishvananda/netns v0.0.0-20200728191858-db3c7e526aae // indirect
	github.com/vultr/govultr/v2 v2.17.2 // indirect
	github.com/youmark/pkcs8 v0.0.0-20181117223130-1be2e3e5546d // indirect
	github.com/zeebo/xxh3 v1.0.2 // indirect
	go.etcd.io/bbolt v1.3.7 // indirect
	go.mongodb.org/atlas v0.34.0 // indirect
	go.mongodb.org/mongo-driver v1.12.1 // indirect
	go.opentelemetry.io/collector/config/configauth v0.88.0 // indirect
	go.opentelemetry.io/collector/config/configcompression v0.88.0 // indirect
	go.opentelemetry.io/collector/config/confignet v0.88.0 // indirect
	go.opentelemetry.io/collector/config/internal v0.88.0 // indirect
	go.opentelemetry.io/collector/connector v0.88.0 // indirect
	go.opentelemetry.io/collector/extension/auth v0.88.0 // indirect
	go.opentelemetry.io/collector/service v0.88.0 // indirect
	go.opentelemetry.io/otel/exporters/otlp/otlpmetric v0.42.0 // indirect
	go.opentelemetry.io/otel/exporters/otlp/otlpmetric/otlpmetricgrpc v0.42.0 // indirect
	go.opentelemetry.io/otel/exporters/otlp/otlpmetric/otlpmetrichttp v0.42.0 // indirect
	go.opentelemetry.io/otel/exporters/otlp/otlptrace v1.19.0 // indirect
	go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc v1.19.0 // indirect
	go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp v1.19.0 // indirect
	go.opentelemetry.io/otel/exporters/stdout/stdoutmetric v0.42.0 // indirect
	go.opentelemetry.io/otel/exporters/stdout/stdouttrace v1.19.0 // indirect
	go.opentelemetry.io/otel/schema v0.0.7 // indirect
	go.opentelemetry.io/proto/otlp v1.0.0 // indirect
	golang.org/x/exp v0.0.0-20230713183714-613f0c0eb8a1 // indirect
	golang.org/x/mod v0.13.0 // indirect
	golang.org/x/oauth2 v0.13.0 // indirect
	golang.org/x/term v0.15.0 // indirect
	golang.org/x/time v0.3.0 // indirect
	golang.org/x/tools v0.14.0 // indirect
	golang.org/x/xerrors v0.0.0-20220907171357-04be3eba64a2 // indirect
	google.golang.org/api v0.147.0 // indirect
	google.golang.org/appengine v1.6.7 // indirect
	google.golang.org/genproto v0.0.0-20231002182017-d307bd883b97 // indirect
	gopkg.in/inf.v0 v0.9.1 // indirect
	gopkg.in/natefinch/lumberjack.v2 v2.2.1 // indirect
	gopkg.in/square/go-jose.v2 v2.5.1 // indirect
	k8s.io/api v0.28.2 // indirect
	k8s.io/apimachinery v0.28.2 // indirect
	k8s.io/client-go v0.28.2 // indirect
	k8s.io/klog v1.0.0 // indirect
	k8s.io/klog/v2 v2.100.1 // indirect
	k8s.io/kube-openapi v0.0.0-20230717233707-2695361300d9 // indirect
	k8s.io/kubelet v0.28.2 // indirect
	k8s.io/utils v0.0.0-20230711102312-30195339c3c7 // indirect
	sigs.k8s.io/controller-runtime v0.16.2 // indirect
	sigs.k8s.io/json v0.0.0-20221116044647-bc3834ca7abd // indirect
	sigs.k8s.io/structured-merge-diff/v4 v4.3.0 // indirect
	sigs.k8s.io/yaml v1.3.0 // indirect
	skywalking.apache.org/repo/goapi v0.0.0-20220121092418-9c455d0dda3f // indirect
)

require (
	contrib.go.opencensus.io/exporter/prometheus v0.4.2 // indirect
	github.com/andybalholm/brotli v1.0.6 // indirect
	github.com/antonmedv/expr v1.15.3 // indirect
	github.com/beorn7/perks v1.0.1 // indirect
	github.com/bmatcuk/doublestar/v4 v4.6.0 // indirect
	github.com/cespare/xxhash/v2 v2.2.0 // indirect
	github.com/davecgh/go-spew v1.1.2-0.20180830191138-d8f796af33cc // indirect
	github.com/docker/docker v24.0.7+incompatible // indirect
	github.com/docker/go-connections v0.4.1-0.20210727194412-58542c764a11 // indirect
	github.com/eapache/go-resiliency v1.4.0 // indirect
	github.com/eapache/go-xerial-snappy v0.0.0-20230731223053-c322873962e3 // indirect
	github.com/eapache/queue v1.1.0 // indirect
	github.com/felixge/httpsnoop v1.0.3 // indirect
	github.com/fsnotify/fsnotify v1.6.0 // indirect
	github.com/go-kit/log v0.2.1 // indirect
	github.com/go-logfmt/logfmt v0.6.0 // indirect
	github.com/go-logr/logr v1.4.1 // indirect
	github.com/go-logr/stdr v1.2.2 // indirect
	github.com/go-ole/go-ole v1.2.6 // indirect
	github.com/gogo/googleapis v1.4.1 // indirect
	github.com/golang/protobuf v1.5.3 // indirect
	github.com/grpc-ecosystem/grpc-gateway/v2 v2.18.0 // indirect
	github.com/hashicorp/errwrap v1.1.0 // indirect
	github.com/hashicorp/go-multierror v1.1.1 // indirect
	github.com/hashicorp/go-uuid v1.0.3 // indirect
	github.com/hashicorp/hcl v1.0.0 // indirect
	github.com/inconshreveable/mousetrap v1.1.0 // indirect
	github.com/influxdata/go-syslog/v3 v3.0.1-0.20210608084020-ac565dc76ba6 // indirect
	github.com/jaegertracing/jaeger v1.48.0
	github.com/jcmturner/aescts/v2 v2.0.0 // indirect
	github.com/jcmturner/dnsutils/v2 v2.0.0 // indirect
	github.com/jcmturner/gofork v1.7.6 // indirect
	github.com/jcmturner/gokrb5/v8 v8.4.4 // indirect
	github.com/jcmturner/rpc/v2 v2.0.3 // indirect
	github.com/jmespath/go-jmespath v0.4.0 // indirect
	github.com/json-iterator/go v1.1.12 // indirect
	github.com/klauspost/compress v1.17.5 // indirect
	github.com/leodido/ragel-machinery v0.0.0-20181214104525-299bdde78165 // indirect
	github.com/leoluk/perflib_exporter v0.2.1 // indirect
	github.com/lib/pq v1.10.9 // indirect
	github.com/lufia/plan9stats v0.0.0-20211012122336-39d0f177ccd0 // indirect
	github.com/magiconair/properties v1.8.7 // indirect
	github.com/matttproud/golang_protobuf_extensions v1.0.4 // indirect
	github.com/mitchellh/copystructure v1.2.0 // indirect
	github.com/mitchellh/mapstructure v1.5.1-0.20220423185008-bf980b35cac4 // indirect
	github.com/mitchellh/reflectwalk v1.0.2 // indirect
	github.com/modern-go/concurrent v0.0.0-20180306012644-bacd9c7ef1dd // indirect
	github.com/modern-go/reflect2 v1.0.2 // indirect
	github.com/mostynb/go-grpc-compression v1.2.2 // indirect
	github.com/oklog/ulid/v2 v2.0.2 // indirect
	github.com/open-telemetry/opentelemetry-collector-contrib/internal/coreinternal v0.88.0 // indirect
	github.com/open-telemetry/opentelemetry-collector-contrib/internal/filter v0.88.0 // indirect
	github.com/open-telemetry/opentelemetry-collector-contrib/pkg/pdatautil v0.88.0 // indirect
	github.com/open-telemetry/opentelemetry-collector-contrib/pkg/translator/jaeger v0.88.0
	github.com/open-telemetry/opentelemetry-collector-contrib/pkg/translator/prometheus v0.88.0 // indirect
	github.com/open-telemetry/opentelemetry-collector-contrib/pkg/translator/zipkin v0.88.0
	github.com/opentracing/opentracing-go v1.2.0 // indirect
	github.com/openzipkin/zipkin-go v0.4.2
	github.com/paulmach/orb v0.10.0 // indirect
	github.com/pelletier/go-toml v1.9.5 // indirect
	github.com/pelletier/go-toml/v2 v2.0.8 // indirect
	github.com/pierrec/lz4/v4 v4.1.21 // indirect
	github.com/pmezard/go-difflib v1.0.1-0.20181226105442-5d4384ee4fb2 // indirect
	github.com/power-devops/perfstat v0.0.0-20210106213030-5aafc221ea8c // indirect
	github.com/prometheus/client_model v0.5.0 // indirect
	github.com/prometheus/procfs v0.11.1 // indirect
	github.com/prometheus/statsd_exporter v0.22.7 // indirect
	github.com/rcrowley/go-metrics v0.0.0-20201227073835-cf1acfcdf475 // indirect
	github.com/rs/cors v1.10.1 // indirect
	github.com/shirou/gopsutil/v3 v3.23.9 // indirect
	github.com/shoenig/go-m1cpu v0.1.6 // indirect
	github.com/shopspring/decimal v1.3.1 // indirect
	github.com/spf13/afero v1.9.5 // indirect
	github.com/spf13/cast v1.5.1 // indirect
	github.com/spf13/cobra v1.7.0 // indirect
	github.com/spf13/jwalterweatherman v1.1.0 // indirect
	github.com/stretchr/objx v0.5.0 // indirect
	github.com/subosito/gotenv v1.4.2 // indirect
	github.com/tklauser/go-sysconf v0.3.12 // indirect
	github.com/tklauser/numcpus v0.6.1 // indirect
	github.com/uber/jaeger-client-go v2.30.0+incompatible // indirect
	github.com/uber/jaeger-lib v2.4.1+incompatible // indirect
	github.com/xdg-go/pbkdf2 v1.0.0 // indirect
	github.com/xdg-go/stringprep v1.0.4 // indirect
	github.com/yusufpapurcu/wmi v1.2.3 // indirect
	github.com/zeebo/assert v1.3.1
	go.opentelemetry.io/contrib/instrumentation/google.golang.org/grpc/otelgrpc v0.45.0 // indirect
	go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp v0.45.0 // indirect
	go.opentelemetry.io/contrib/propagators/b3 v1.20.0 // indirect
	go.opentelemetry.io/contrib/zpages v0.45.0 // indirect
	go.opentelemetry.io/otel v1.22.0 // indirect
	go.opentelemetry.io/otel/bridge/opencensus v0.42.0 // indirect
	go.opentelemetry.io/otel/exporters/prometheus v0.42.0 // indirect
	go.opentelemetry.io/otel/metric v1.22.0 // indirect
	go.opentelemetry.io/otel/sdk v1.22.0 // indirect
	go.opentelemetry.io/otel/sdk/metric v1.19.0 // indirect
	golang.org/x/crypto v0.17.0 // indirect
	golang.org/x/net v0.19.0 // indirect
	golang.org/x/sync v0.6.0 // indirect
	golang.org/x/sys v0.16.0 // indirect
	gonum.org/v1/gonum v0.14.0 // indirect
	google.golang.org/genproto/googleapis/api v0.0.0-20231002182017-d307bd883b97 // indirect
	google.golang.org/genproto/googleapis/rpc v0.0.0-20231012201019-e917dd12ba7a // indirect
	gopkg.in/ini.v1 v1.67.0 // indirect
	gopkg.in/yaml.v3 v3.0.1 // indirect
)

replace (
	github.com/ClickHouse/ch-go v0.58.2 => github.com/SigNoz/ch-go v0.61.2-dd
	github.com/ClickHouse/clickhouse-go/v2 v2.15.0 => github.com/SigNoz/clickhouse-go/v2 v2.15.2
	github.com/golang-migrate/migrate/v4 => github.com/SigNoz/golang-migrate/v4 v4.16.4
	github.com/vjeantet/grok => github.com/signoz/grok v1.0.3

	// using 0.23.0 as there is an issue with 0.24.0 stats that results in
	// an error
	// panic: interface conversion: interface {} is nil, not func(*tag.Map, []stats.Measurement, map[string]interface {})

	go.opencensus.io => go.opencensus.io v0.23.0
)

// see https://github.com/open-telemetry/opentelemetry-collector-contrib/issues/4433
exclude github.com/StackExchange/wmi v1.2.0
