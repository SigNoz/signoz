package agentConf

import (
	"context"
	"database/sql"
	"fmt"
	"math/rand"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"go.signoz.io/signoz/pkg/query-service/agentConf/sqlite"
	"go.signoz.io/signoz/pkg/query-service/auth"
	"go.signoz.io/signoz/pkg/query-service/model"
	"go.uber.org/zap"
)

func init() {
	rand.Seed(2000)
}

// Repo handles DDL and DML ops on ingestion rules
type Repo struct {
	db *sqlx.DB
}

func (r *Repo) initDB(engine string) error {
	switch engine {
	case "sqlite3", "sqlite":
		return sqlite.InitDB(r.db)
	default:
		return fmt.Errorf("unsupported db")
	}
}

func (r *Repo) GetConfigHistory(ctx context.Context, typ ElementTypeDef) ([]ConfigVersion, error) {
	var c []ConfigVersion
	err := r.db.SelectContext(ctx, &c, `SELECT 
		id, 
		version, 
		element_type, 
		created_by,
		created_at, 
		active, 
		is_valid, 
		disabled, 
		deploy_status, 
		deploy_result 
		FROM agent_config_versions 
		WHERE element_type = $1
		ORDER BY created_at desc, version desc
		limit 10`, typ)

	return c, err
}

func (r *Repo) GetConfigVersion(ctx context.Context, typ ElementTypeDef, v int) (*ConfigVersion, error) {
	var c ConfigVersion
	err := r.db.GetContext(ctx, &c, `SELECT 
		id, 
		version, 
		element_type, 
		created_by, 
		active, 
		is_valid, 
		disabled, 
		deploy_status, 
		deploy_result,
		last_hash,
		last_config
		FROM agent_config_versions 
		WHERE element_type = $1 
		AND version = $2`, typ, v)

	return &c, err

}

func (r *Repo) GetLatestVersion(ctx context.Context, typ ElementTypeDef) (*ConfigVersion, error) {
	var c ConfigVersion
	err := r.db.GetContext(ctx, &c, `SELECT 
		id, 
		version, 
		element_type, 
		COALESCE(created_by,0) as created_by, 
		active, 
		is_valid, 
		disabled, 
		deploy_status, 
		deploy_result 
		FROM agent_config_versions 
		WHERE element_type = $1 
		AND version = ( 
			SELECT MAX(version) 
			FROM agent_config_versions 
			WHERE element_type=$2)`, typ, typ)

	return &c, err
}

func (r *Repo) insertConfig(ctx context.Context, c *ConfigVersion, elements []string) (fnerr error) {

	if string(c.ElementType) == "" {
		return fmt.Errorf("element type is required for creating agent config version")
	}

	if len(elements) == 0 {
		zap.S().Errorf("insert config called with no elements", c.ElementType)
		return fmt.Errorf("config must have atleast one element")
	}

	if c.Version != 0 {
		zap.S().Errorf("invalid version assignment while inserting agent config", c.Version, c.ElementType)
		return fmt.Errorf("user defined versions are not supported in the agent config")
	}

	configVersion, err := r.GetLatestVersion(ctx, c.ElementType)
	if err != nil {
		if err != sql.ErrNoRows {
			zap.S().Errorf("failed to fetch latest config version", err)
			return fmt.Errorf("failed to fetch latest config version")
		}
	}

	c.Version = updateVersion(configVersion.Version)

	defer func() {
		if fnerr != nil {
			// remove all the damage (invalid rows from db)
			r.db.Exec("DELETE FROM agent_config_versions WHERE id = $1", c.ID)
			r.db.Exec("DELETE FROM agent_config_elements WHERE version_id=$1", c.ID)
		}
	}()

	// get user info from context
	jwt, err := auth.ExtractJwtFromContext(ctx)
	if err != nil {
		return fmt.Errorf("failed to extract jwt from context", err)
	}

	claims, err := auth.ParseJWT(jwt)
	if err != nil {
		return fmt.Errorf("failed get claims from jwt", err)
	}

	// insert config
	configQuery := `INSERT INTO agent_config_versions(	
		id, 
		version,
		created_by, 
		element_type, 
		active, 
		is_valid, 
		disabled,
		deploy_status, 
		deploy_result) 
	VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`

	_, err = r.db.ExecContext(ctx,
		configQuery,
		c.ID,
		c.Version,
		claims["email"],
		c.ElementType,
		false,
		false,
		false,
		c.DeployStatus,
		c.DeployResult)

	if err != nil {
		zap.S().Errorf("error in inserting config version: ", zap.Error(err))
		return fmt.Errorf("failed to insert ingestion rule")
	}

	elementsQuery := `INSERT INTO agent_config_elements(	
		id, 
		version_id, 
		element_type, 
		element_id) 
	VALUES ($1, $2, $3, $4)`

	for _, e := range elements {

		_, err = r.db.ExecContext(ctx,
			elementsQuery,
			uuid.NewString(),
			c.ID,
			c.ElementType,
			e)
		if err != nil {
			return err
		}
	}

	return nil
}

func (r *Repo) updateDeployStatus(ctx context.Context,
	elementType ElementTypeDef,
	version int,
	status string,
	result string,
	lastHash string,
	lastconf string) error {

	updateQuery := `UPDATE agent_config_versions
	set deploy_status = $1, 
	deploy_result = $2,
	last_hash = COALESCE($3, last_hash),
	last_config = $4
	WHERE version=$5
	AND element_type = $6`

	_, err := r.db.ExecContext(ctx, updateQuery, status, result, lastHash, lastconf, version, string(elementType))
	if err != nil {
		zap.S().Errorf("failed to get ingestion rule from db", err)
		return model.BadRequestStr("failed to get ingestion rule from db")
	}

	return nil
}

func (r *Repo) updateDeployStatusByHash(ctx context.Context, confighash string, status string, result string) error {

	updateQuery := `UPDATE agent_config_versions
	set deploy_status = $1, 
	deploy_result = $2
	WHERE last_hash=$4`

	_, err := r.db.ExecContext(ctx, updateQuery, status, result, confighash)
	if err != nil {
		zap.S().Errorf("failed to get ingestion rule from db", err)
		return model.BadRequestStr("failed to get ingestion rule from db")
	}

	return nil
}
