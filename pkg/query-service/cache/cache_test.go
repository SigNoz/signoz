package cache

import "testing"

func TestNewCacheUnKnownProvider(t *testing.T) {
	c := NewCache(&Options{
		Name:     "test",
		Provider: "unknown",
	})

	if c != nil {
		t.Fatalf("expected nil, got %v", c)
	}
}

func TestNewCacheInMemory(t *testing.T) {
	c := NewCache(&Options{
		Name:     "test",
		Provider: "inmemory",
	})

	if c == nil {
		t.Fatalf("expected non-nil, got nil")
	}
}

func TestNewCacheRedis(t *testing.T) {
	c := NewCache(&Options{
		Name:     "test",
		Provider: "redis",
	})

	if c == nil {
		t.Fatalf("expected non-nil, got nil")
	}
}

func TestLoadFromYAMLCacheConfig(t *testing.T) {
	_, err := LoadFromYAMLCacheConfig([]byte(`
provider: inmemory
`))
	if err != nil {
		t.Fatalf("unexpected error: %s", err)
	}
}

func TestLoadFromYAMLCacheConfigFile(t *testing.T) {
	_, err := LoadFromYAMLCacheConfigFile("testdata/cache.yaml")
	if err != nil {
		t.Fatalf("unexpected error: %s", err)
	}
}
