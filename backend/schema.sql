-- Recreate expenses table with specific fields for tea and water
DROP TABLE IF EXISTS expenses;
DROP TABLE IF EXISTS settings;

CREATE TABLE IF NOT EXISTS settings (
    key VARCHAR(50) PRIMARY KEY,
    value DECIMAL(10, 2) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Initialize default prices
INSERT INTO settings (key, value) VALUES ('tea_price', 10.00) ON CONFLICT (key) DO NOTHING;
INSERT INTO settings (key, value) VALUES ('water_price', 35.00) ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS expenses (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    time TIME NOT NULL DEFAULT CURRENT_TIME,
    tea_cups INTEGER NOT NULL DEFAULT 0,
    water_cans INTEGER NOT NULL DEFAULT 0,
    tea_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
    water_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster queries on date
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
