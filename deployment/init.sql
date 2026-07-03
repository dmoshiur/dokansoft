-- Initialization Script for PostgreSQL Database
-- Database: lovely_erp

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(20) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'CUSTOMER', -- ADMIN, STAFF, CUSTOMER
    permissions JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    due_amount DECIMAL(15,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    brand VARCHAR(100),
    company_name VARCHAR(100),
    price DECIMAL(15,2) NOT NULL,
    cost_price DECIMAL(15,2) NOT NULL,
    stock INT DEFAULT 0,
    min_stock_alert INT DEFAULT 10,
    unit VARCHAR(20),
    sku VARCHAR(50) UNIQUE,
    image_url TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- PURCHASE, PAYMENT, ADJUSTMENT
    amount DECIMAL(15,2) NOT NULL,
    description TEXT,
    running_balance DECIMAL(15,2) NOT NULL,
    date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pbx_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_name VARCHAR(100) NOT NULL,
    pbx_number VARCHAR(50) NOT NULL,
    api_base_url VARCHAR(255),
    api_username VARCHAR(100),
    api_password VARCHAR(255),
    api_key VARCHAR(255),
    api_secret VARCHAR(255),
    webhook_url VARCHAR(255),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pbx_extensions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    extension_number VARCHAR(20) UNIQUE NOT NULL,
    employee_name VARCHAR(100),
    role VARCHAR(50),
    status VARCHAR(20) DEFAULT 'ACTIVE', -- ACTIVE, DISABLED
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pbx_ivr (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    audio_url TEXT,
    is_active BOOLEAN DEFAULT false,
    default_operator_extension VARCHAR(20),
    key_mapping JSONB DEFAULT '{}', -- e.g., {"1": "Due Information", "2": "HalKhata"}
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS call_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    phone VARCHAR(20) NOT NULL,
    direction VARCHAR(20) NOT NULL, -- INBOUND, OUTBOUND
    status VARCHAR(50) NOT NULL, -- QUEUED, RINGING, IN_PROGRESS, COMPLETED, NO_ANSWER, BUSY, FAILED
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    duration INT DEFAULT 0,
    extension VARCHAR(20),
    recording_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
-- Admin User Seeding
INSERT INTO users (email, phone, password_hash, role, permissions) 
VALUES ('admin@lovelyenterprise.com', '+8801700000000', '$2b$10$adminhashedpassword', 'ADMIN', '["all"]')
ON CONFLICT DO NOTHING;
