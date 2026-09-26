CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS projects_repo_name_trgm ON projects USING gin ("repoName" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS projects_owner_trgm ON projects USING gin (owner gin_trgm_ops);
CREATE INDEX IF NOT EXISTS project_analysis_summary_trgm ON project_analysis USING gin ("aiSummary" gin_trgm_ops);
