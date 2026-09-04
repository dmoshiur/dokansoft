-- Migration 002: Notification & Payment Gateway Modules
-- These tables document the gateway module schema. The running application
-- persists this data in its configured database (MongoDB in the default
-- runtime), while this SQL mirrors the structure for PostgreSQL deployments.

CREATE TABLE IF NOT EXISTS gateway_configs (
    id VARCHAR(80) PRIMARY KEY,
    config_type VARCHAR(40) NOT NULL, -- sms_net_bd, email_gateway, voice_gateway, bkash_personal
    enabled BOOLEAN NOT NULL DEFAULT false,
    config JSONB NOT NULL DEFAULT '{}',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sms_logs (
    id VARCHAR(80) PRIMARY KEY,
    to_number VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING, SENT, DELIVERED, FAILED, DISABLED
    request_id VARCHAR(120),
    charge NUMERIC(12,2) DEFAULT 0,
    schedule VARCHAR(32),
    error TEXT,
    raw_payload JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    synced_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS notification_queue (
    id VARCHAR(80) PRIMARY KEY,
    type VARCHAR(20) NOT NULL, -- email, sms, voice
    payload JSONB NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    attempts INT DEFAULT 0,
    max_attempts INT DEFAULT 5,
    last_error TEXT,
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    finished_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS job_queue (
    id VARCHAR(80) PRIMARY KEY,
    type VARCHAR(30) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    attempts INT DEFAULT 0,
    max_attempts INT DEFAULT 5,
    last_error TEXT,
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    finished_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS bkash_incoming_sms (
    id VARCHAR(80) PRIMARY KEY,
    raw_message TEXT NOT NULL,
    amount NUMERIC(15,2),
    trx_id VARCHAR(60),
    sender_number VARCHAR(20),
    reference VARCHAR(80),
    received_at TIMESTAMP WITH TIME ZONE,
    matched BOOLEAN DEFAULT false,
    matched_order_id VARCHAR(80),
    matched_by VARCHAR(10), -- auto, manual
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (trx_id)
);

CREATE TABLE IF NOT EXISTS bkash_unmatched_sms (
    id VARCHAR(80) PRIMARY KEY,
    raw_message TEXT NOT NULL,
    amount NUMERIC(15,2),
    trx_id VARCHAR(60),
    sender_number VARCHAR(20),
    reference VARCHAR(80),
    status VARCHAR(30) DEFAULT 'UNMATCHED',
    matched_order_id VARCHAR(80),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sms_logs_status ON sms_logs(status);
CREATE INDEX IF NOT EXISTS idx_notification_queue_status ON notification_queue(status);
CREATE INDEX IF NOT EXISTS idx_job_queue_status ON job_queue(status);
CREATE INDEX IF NOT EXISTS idx_bkash_incoming_trx ON bkash_incoming_sms(trx_id);
