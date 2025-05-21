package filetemplatestore

import (
	"context"
	"html/template"
	"os"
	"path/filepath"
	"slices"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types/emailtypes"
)

const (
	emailTemplateExt = ".html.gotmpl"
)

type store struct {
	fs map[emailtypes.TemplateName]*template.Template
}

func NewStore(baseDir string, templates []emailtypes.TemplateName) (emailtypes.TemplateStore, error) {
	fs := make(map[emailtypes.TemplateName]*template.Template)
	fis, err := os.ReadDir(filepath.Clean(baseDir))
	if err != nil {
		return nil, err
	}

	supportedTemplates := templates
	foundTemplates := make(map[emailtypes.TemplateName]bool)

	for _, fi := range fis {
		if fi.IsDir() || filepath.Ext(fi.Name()) != emailTemplateExt {
			continue
		}

		templateName, err := parseTemplateName(fi.Name())
		if err != nil {
			continue
		}

		if !slices.Contains(supportedTemplates, templateName) {
			continue
		}

		t, err := parseTemplateFile(filepath.Join(baseDir, fi.Name()), templateName)
		if err != nil {
			return nil, err
		}

		fs[templateName] = t
		foundTemplates[templateName] = true
	}

	if err := checkMissingTemplates(supportedTemplates, foundTemplates); err != nil {
		return nil, err
	}

	return &store{fs: fs}, nil

}

func (repository *store) Get(ctx context.Context, name emailtypes.TemplateName) (*template.Template, error) {
	template, ok := repository.fs[name]
	if !ok {
		// This path should never be reached as we have already checked for the existence of the template
		// in the factory
		return nil, errors.Newf(errors.TypeNotFound, errors.CodeNotFound, "cannot find template with name %q", name.StringValue())
	}

	return template.Clone()
}

func parseTemplateName(fileName string) (emailtypes.TemplateName, error) {
	name := strings.TrimSuffix(fileName, emailTemplateExt)
	return emailtypes.NewTemplateName(name)
}

func parseTemplateFile(filePath string, templateName emailtypes.TemplateName) (*template.Template, error) {
	contents, err := os.ReadFile(filepath.Clean(filePath))
	if err != nil {
		return nil, err
	}

	return template.New(templateName.StringValue()).Parse(string(contents))
}

func checkMissingTemplates(supportedTemplates []emailtypes.TemplateName, foundTemplates map[emailtypes.TemplateName]bool) error {
	var missingTemplates []string
	for _, template := range supportedTemplates {
		if !foundTemplates[template] {
			missingTemplates = append(missingTemplates, template.StringValue())
		}
	}

	if len(missingTemplates) > 0 {
		return errors.Newf(errors.TypeNotFound, errors.CodeNotFound, "missing email templates: %s", strings.Join(missingTemplates, ", "))
	}

	return nil
}
