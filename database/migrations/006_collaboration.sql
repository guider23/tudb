-- 006_collaboration.sql
-- Add collaboration features: shared queries, comments, and workspaces

-- Query shares table
CREATE TABLE IF NOT EXISTS query_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query_id UUID NOT NULL REFERENCES saved_queries(id) ON DELETE CASCADE,
    shared_by TEXT NOT NULL,
    share_token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    permissions TEXT NOT NULL DEFAULT 'view', -- 'view' or 'edit'
    expires_at TIMESTAMP,
    view_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Query comments table
CREATE TABLE IF NOT EXISTS query_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query_id UUID NOT NULL REFERENCES saved_queries(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    user_name TEXT NOT NULL,
    comment_text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Workspaces table
CREATE TABLE IF NOT EXISTS workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    owner_id TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Workspace members table
CREATE TABLE IF NOT EXISTS workspace_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'member', -- 'owner', 'admin', 'member', 'viewer'
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(workspace_id, user_id)
);

-- Workspace queries (links queries to workspaces)
CREATE TABLE IF NOT EXISTS workspace_queries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    query_id UUID NOT NULL REFERENCES saved_queries(id) ON DELETE CASCADE,
    added_by TEXT NOT NULL,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(workspace_id, query_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_query_shares_token ON query_shares(share_token);
CREATE INDEX IF NOT EXISTS idx_query_shares_query ON query_shares(query_id);
CREATE INDEX IF NOT EXISTS idx_query_comments_query ON query_comments(query_id);
CREATE INDEX IF NOT EXISTS idx_query_comments_user ON query_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_workspaces_owner ON workspaces(owner_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace ON workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_queries_workspace ON workspace_queries(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_queries_query ON workspace_queries(query_id);
