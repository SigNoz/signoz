package alertmanagertypes

import (
	"reflect"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
)

var ErrCodeAlertmanagerReceiverFileReference = errors.MustNewCode("alertmanager_receiver_file_reference")

// ValidateFileReferences rejects a receiver that points at a file on the host
// running SigNoz.
//
// Notifier configs can carry a secret indirectly instead of inline, e.g.
// basic_auth.password_file, authorization.credentials_file, tls_config.ca_file,
// opsgenie api_key_file or the files list of an http header. Alertmanager reads
// those paths from the local filesystem when the notification is sent, which is
// what you want for a config file an operator owns.
//
// Receivers that arrive over the API are user input, so they must not be able to
// name a path. Everything a receiver needs is accepted inline.
func (receiver *Receiver) ValidateFileReferences() error {
	if receiver == nil {
		return nil
	}

	return walkFileReferences(reflect.ValueOf(receiver), "")
}

func walkFileReferences(value reflect.Value, path string) error {
	switch value.Kind() {
	case reflect.Pointer, reflect.Interface:
		if value.IsNil() {
			return nil
		}

		return walkFileReferences(value.Elem(), path)
	case reflect.Slice, reflect.Array:
		for i := 0; i < value.Len(); i++ {
			if err := walkFileReferences(value.Index(i), path); err != nil {
				return err
			}
		}
	case reflect.Map:
		iterator := value.MapRange()
		for iterator.Next() {
			if err := walkFileReferences(iterator.Value(), path); err != nil {
				return err
			}
		}
	case reflect.Struct:
		structType := value.Type()
		for i := 0; i < structType.NumField(); i++ {
			field := structType.Field(i)
			if !field.IsExported() {
				continue
			}

			name := serializedFieldName(field)
			fieldPath := name
			if path != "" && name != "" {
				fieldPath = path + "." + name
			}

			if isFileReference(name) && isSet(value.Field(i)) {
				return errors.Newf(
					errors.TypeInvalidInput,
					ErrCodeAlertmanagerReceiverFileReference,
					"%q is not supported in a channel, it would read a file from the SigNoz host, provide the value itself instead",
					fieldPath,
				)
			}

			if err := walkFileReferences(value.Field(i), fieldPath); err != nil {
				return err
			}
		}
	}

	return nil
}

// serializedFieldName returns the name the field is (un)marshalled under,
// preferring the yaml tag over the json tag. Fields that are not serialized at
// all cannot be set by a caller and return an empty name.
func serializedFieldName(field reflect.StructField) string {
	for _, key := range []string{"yaml", "json"} {
		tag, ok := field.Tag.Lookup(key)
		if !ok {
			continue
		}

		name, _, _ := strings.Cut(tag, ",")
		if name == "-" {
			return ""
		}

		if name != "" {
			return name
		}
	}

	if field.Anonymous {
		return ""
	}

	return field.Name
}

// isFileReference reports whether a field name denotes a path that alertmanager
// reads at notify time. Upstream names those fields consistently, either with a
// _file suffix or, for http header values, files.
func isFileReference(name string) bool {
	return strings.HasSuffix(name, "_file") || name == "files"
}

func isSet(value reflect.Value) bool {
	switch value.Kind() {
	case reflect.String, reflect.Slice, reflect.Array, reflect.Map:
		return value.Len() > 0
	default:
		return !value.IsZero()
	}
}
