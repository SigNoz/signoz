package usage

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"io"
	"time"

	"go.opencensus.io/metric/metricdata"
	"go.opencensus.io/tag"
	"go.opentelemetry.io/collector/pdata/pcommon"
)

const (
	TenantKey                 = "tenant"
	ExporterIDKey             = "exporterId"
	DefaultCollectionInterval = 1 * time.Hour
	UsageTableName            = "usage"
)

var (
	TagTenantKey, _     = tag.NewKey(TenantKey)
	TagExporterIdKey, _ = tag.NewKey(ExporterIDKey)
)

type Metric struct {
	Size  int64
	Count int64
}

type UsageDB struct {
	CollectorID string    `ch:"collector_id" json:"collectorId"`
	ExporterID  string    `ch:"exporter_id" json:"exporterId"`
	TimeStamp   time.Time `ch:"timestamp" json:"timestamp"`
	Tenant      string    `ch:"tenant" json:"tenant"`
	Data        string    `ch:"data" json:"data"`
}

func Encrypt(key, text []byte) ([]byte, error) {
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, err
	}
	b := base64.StdEncoding.EncodeToString(text)
	ciphertext := make([]byte, aes.BlockSize+len(b))
	iv := ciphertext[:aes.BlockSize]
	if _, err := io.ReadFull(rand.Reader, iv); err != nil {
		return nil, err
	}
	cfb := cipher.NewCFBEncrypter(block, iv)
	cfb.XORKeyStream(ciphertext[aes.BlockSize:], []byte(b))
	return ciphertext, nil
}

func AddMetric(metrics map[string]Metric, tenant string, count int64, size int64) {
	if entry, ok := metrics[tenant]; ok {
		entry.Count += count
		entry.Size += size
		metrics[tenant] = entry
	} else {
		metrics[tenant] = Metric{
			Size:  size,
			Count: count,
		}
	}
}

func GetTenantNameFromResource(resource pcommon.Resource) string {
	tenant, found := resource.Attributes().Get("tenant")
	if !found {
		return "default"
	}
	return tenant.AsString()
}

func GetIndexOfLabel(labelKeys []metricdata.LabelKey, key string) int {
	for i, label := range labelKeys {
		if label.Key == key {
			return i
		}
	}
	return -1
}
