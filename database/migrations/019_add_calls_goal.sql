-- Migration 019: Add calls_goal to goals table
-- Run in Supabase Dashboard > SQL Editor

ALTER TABLE goals ADD COLUMN IF NOT EXISTS calls_goal INTEGER DEFAULT 0;
