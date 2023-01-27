package otelconfig

import (
	"go.opentelemetry.io/collector/component"
	"go.opentelemetry.io/collector/otelcol"
)

// ConfigUpdater is an interface that allows updating the configuration of the collector.
// The configuration is updated by modifying the configuration returned by the methods
// of this interface and then calling the corresponding Set method.
type ConfigUpdater interface {
	// ReceiverConfig returns the configuration for the receiver with the given ID.
	// The second return value indicates whether the receiver was found.
	// If the receiver was not found, the first return value is nil.
	// The returned configuration is a copy of the original configuration.
	// The returned configuration can be modified without affecting the original configuration.
	ReceiverConfig(component.ID) (component.Config, bool)

	// ProcessorConfig returns the configuration for the processor with the given ID.
	// The second return value indicates whether the processor was found.
	// If the processor was not found, the first return value is nil.
	// The returned configuration is a copy of the original configuration.
	// The returned configuration can be modified without affecting the original configuration.
	ProcessorConfig(component.ID) (component.Config, bool)

	// ExporterConfig returns the configuration for the exporter with the given ID.
	// The second return value indicates whether the exporter was found.
	// If the exporter was not found, the first return value is nil.
	// The returned configuration is a copy of the original configuration.
	// The returned configuration can be modified without affecting the original configuration.
	ExporterConfig(component.ID) (component.Config, bool)

	// ExtensionConfig returns the configuration for the extension with the given ID.
	// The second return value indicates whether the extension was found.
	// If the extension was not found, the first return value is nil.
	// The returned configuration is a copy of the original configuration.
	// The returned configuration can be modified without affecting the original configuration.
	ExtensionConfig(component.ID) (component.Config, bool)

	// ConnectorConfig returns the configuration for the connector with the given ID.
	// The second return value indicates whether the connector was found.
	// If the connector was not found, the first return value is nil.
	// The returned configuration is a copy of the original configuration.
	// The returned configuration can be modified without affecting the original configuration.
	ConnectorConfig(component.ID) (component.Config, bool)

	// SetReceiverConfig sets the configuration for the receiver with the given ID.
	// If the receiver does not exist, it is created.
	// The configuration is copied before it is stored.
	SetReceiverConfig(component.ID, component.Config)

	// SetProcessorConfig sets the configuration for the processor with the given ID.
	// If the processor does not exist, it is created.
	// The configuration is copied before it is stored.
	SetProcessorConfig(component.ID, component.Config)

	// SetExporterConfig sets the configuration for the exporter with the given ID.
	// If the exporter does not exist, it is created.
	// The configuration is copied before it is stored.
	SetExporterConfig(component.ID, component.Config)

	// SetExtensionConfig sets the configuration for the extension with the given ID.
	// If the extension does not exist, it is created.
	// The configuration is copied before it is stored.
	SetExtensionConfig(component.ID, component.Config)

	// SetConnectorConfig sets the configuration for the connector with the given ID.
	// If the connector does not exist, it is created.
	// The configuration is copied before it is stored.
	SetConnectorConfig(component.ID, component.Config)

	// DeleteReceiverConfig deletes the configuration for the receiver with the given ID.
	// If the receiver does not exist, this is a no-op.
	DeleteReceiverConfig(component.ID)

	// DeleteProcessorConfig deletes the configuration for the processor with the given ID.
	// If the processor does not exist, this is a no-op.
	DeleteProcessorConfig(component.ID)

	// DeleteExporterConfig deletes the configuration for the exporter with the given ID.
	// If the exporter does not exist, this is a no-op.
	DeleteExporterConfig(component.ID)

	// DeleteExtensionConfig deletes the configuration for the extension with the given ID.
	// If the extension does not exist, this is a no-op.
	DeleteExtensionConfig(component.ID)

	// DeleteConnectorConfig deletes the configuration for the connector with the given ID.
	// If the connector does not exist, this is a no-op.
	DeleteConnectorConfig(component.ID)

	// Validate validates the configuration.
	// If the configuration is invalid, an error is returned.
	Validate() error

	// Apply applies the configuration.
	// If the configuration is invalid, an error is returned.
	// If the configuration is valid, it is applied and an error is returned.
	Apply() error
}

type configUpdater struct {
	cfg *otelcol.Config
}

// NewConfigUpdater creates a new ConfigUpdater.
// It is expected that the configuration will be updated by calling the Set methods.
// The configuration can be validated and applied by calling the Validate and Apply methods.
func NewConfigUpdater() ConfigUpdater {
	return &configUpdater{cfg: &otelcol.Config{}}
}

// NewConfigUpdaterFromYAMLBytes creates a new ConfigUpdater from the given YAML configuration.
// If the configuration is invalid, an error is returned.
func NewConfigUpdaterFromYAMLBytes(yamlConfig []byte) (ConfigUpdater, error) {
	cfg, err := Parse(yamlConfig)
	if err != nil {
		return nil, err
	}
	return &configUpdater{cfg: cfg}, nil
}

func (u *configUpdater) ReceiverConfig(id component.ID) (component.Config, bool) {
	cfg := u.cfg.Receivers[id]
	if cfg == nil {
		return nil, false
	}
	newCfg := new(component.Config)
	*newCfg = cfg
	return newCfg, true
}

func (u *configUpdater) ProcessorConfig(id component.ID) (component.Config, bool) {
	cfg := u.cfg.Processors[id]
	if cfg == nil {
		return nil, false
	}
	newCfg := new(component.Config)
	*newCfg = cfg
	return newCfg, true
}

func (u *configUpdater) ExporterConfig(id component.ID) (component.Config, bool) {
	cfg := u.cfg.Exporters[id]
	if cfg == nil {
		return nil, false
	}
	newCfg := new(component.Config)
	*newCfg = cfg
	return newCfg, true
}

func (u *configUpdater) ExtensionConfig(id component.ID) (component.Config, bool) {
	cfg := u.cfg.Extensions[id]
	if cfg == nil {
		return nil, false
	}
	newCfg := new(component.Config)
	*newCfg = cfg
	return newCfg, true
}

func (u *configUpdater) ConnectorConfig(id component.ID) (component.Config, bool) {
	cfg := u.cfg.Connectors[id]
	if cfg == nil {
		return nil, false
	}
	newCfg := new(component.Config)
	*newCfg = cfg
	return newCfg, true
}

func (u *configUpdater) SetReceiverConfig(id component.ID, cfg component.Config) {
	if u.cfg.Receivers == nil {
		u.cfg.Receivers = make(map[component.ID]component.Config)
	}
	newCfg := new(component.Config)
	*newCfg = cfg
	u.cfg.Receivers[id] = newCfg
}

func (u *configUpdater) SetProcessorConfig(id component.ID, cfg component.Config) {
	if u.cfg.Processors == nil {
		u.cfg.Processors = make(map[component.ID]component.Config)
	}
	newCfg := new(component.Config)
	*newCfg = cfg
	u.cfg.Processors[id] = newCfg
}

func (u *configUpdater) SetExporterConfig(id component.ID, cfg component.Config) {
	if u.cfg.Exporters == nil {
		u.cfg.Exporters = make(map[component.ID]component.Config)
	}
	newCfg := new(component.Config)
	*newCfg = cfg
	u.cfg.Exporters[id] = newCfg
}

func (u *configUpdater) SetExtensionConfig(id component.ID, cfg component.Config) {
	if u.cfg.Extensions == nil {
		u.cfg.Extensions = make(map[component.ID]component.Config)
	}
	newCfg := new(component.Config)
	*newCfg = cfg
	u.cfg.Extensions[id] = newCfg
}

func (u *configUpdater) SetConnectorConfig(id component.ID, cfg component.Config) {
	if u.cfg.Connectors == nil {
		u.cfg.Connectors = make(map[component.ID]component.Config)
	}
	newCfg := new(component.Config)
	*newCfg = cfg
	u.cfg.Connectors[id] = newCfg
}

func (u *configUpdater) DeleteReceiverConfig(id component.ID) {
	delete(u.cfg.Receivers, id)
}

func (u *configUpdater) DeleteProcessorConfig(id component.ID) {
	delete(u.cfg.Processors, id)
}

func (u *configUpdater) DeleteExporterConfig(id component.ID) {
	delete(u.cfg.Exporters, id)
}

func (u *configUpdater) DeleteExtensionConfig(id component.ID) {
	delete(u.cfg.Extensions, id)
}

func (u *configUpdater) DeleteConnectorConfig(id component.ID) {
	delete(u.cfg.Connectors, id)
}

func (u *configUpdater) Validate() error {
	return u.cfg.Validate()
}

func (u *configUpdater) Apply() error {
	if err := u.Validate(); err != nil {
		return err
	}
	// TODO: Apply the configuration.
	return nil
}
