-- Supabase Database Schema for Spotlist Checker
-- Run this SQL in your Supabase SQL Editor to create the required tables

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- Analyses Table
-- Stores analysis results with metrics and spotlist data
-- ============================================================================
CREATE TABLE IF NOT EXISTS analyses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id TEXT NOT NULL,
    file_name TEXT NOT NULL,
    metrics JSONB NOT NULL DEFAULT '{}',
    spotlist_data JSONB DEFAULT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster session-based queries
CREATE INDEX IF NOT EXISTS idx_analyses_session_id ON analyses(session_id);
CREATE INDEX IF NOT EXISTS idx_analyses_created_at ON analyses(created_at DESC);

-- ============================================================================
-- Configurations Table
-- Stores user/session configurations
-- ============================================================================
CREATE TABLE IF NOT EXISTS configurations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id TEXT UNIQUE NOT NULL,
    config JSONB NOT NULL DEFAULT '{}',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster session lookups
CREATE INDEX IF NOT EXISTS idx_configurations_session_id ON configurations(session_id);

-- ============================================================================
-- Row Level Security (Optional but Recommended)
-- Uncomment if you want to enforce session-based access at the database level
-- ============================================================================

-- ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE configurations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own analyses
-- CREATE POLICY "Users can view own analyses" ON analyses
--     FOR SELECT USING (true);  -- Allow all reads (session_id checked in app)

-- CREATE POLICY "Users can insert own analyses" ON analyses
--     FOR INSERT WITH CHECK (true);

-- CREATE POLICY "Users can delete own analyses" ON analyses
--     FOR DELETE USING (true);  -- Session check done in app

-- ============================================================================
-- Sample Queries (for testing)
-- ============================================================================

-- Insert a test analysis:
-- INSERT INTO analyses (session_id, file_name, metrics, metadata)
-- VALUES (
--     'test-session-123',
--     'test_spotlist.csv',
--     '{"total_spots": 100, "double_spots": 5, "total_cost": 1000.50}',
--     '{"report_type": "spotlist", "date_range": "2024-01-01 to 2024-01-31"}'
-- );

-- Get analyses for a session:
-- SELECT id, file_name, metrics, created_at 
-- FROM analyses 
-- WHERE session_id = 'test-session-123' 
-- ORDER BY created_at DESC 
-- LIMIT 10;

-- Delete an analysis:
-- DELETE FROM analyses WHERE id = 'uuid-here' AND session_id = 'test-session-123';
