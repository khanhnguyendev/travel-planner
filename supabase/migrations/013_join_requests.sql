-- Add 'requested' status to invite_status enum for join requests
ALTER TYPE invite_status ADD VALUE IF NOT EXISTS 'requested';
