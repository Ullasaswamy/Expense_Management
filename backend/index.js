const express = require('express');
const cors = require('cors');
const db = require('./db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();


const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'Ankiom_Secret_Key_2026';

app.set('trust proxy', 1);

const corsOptions = {
    origin: process.env.FRONTEND_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));


app.use(express.json());

// Health Check for Production
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'healthy', timestamp: new Date() });
});

/* ================================
   AUTH MIDDLEWARE
================================ */

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: 'Access denied. Please login.' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid or expired session. Please login again.' });
        req.user = user;
        next();
    });
};

/* ================================
   AUTH ROUTES
================================ */

app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    try {
        const result = await db.query('SELECT * FROM users WHERE username = $1', [username]);

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        const user = result.rows[0];
        const validPassword = await bcrypt.compare(password, user.password);

        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });

        res.json({
            token,
            user: { id: user.id, username: user.username }
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

/* ================================
   SETTINGS (PROTECTED)
================================ */

app.get('/api/settings', authenticateToken, async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM settings');
        const settings = {};

        result.rows.forEach(row => {
            settings[row.key] = parseFloat(row.value);
        });

        res.json(settings);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

app.post('/api/settings', authenticateToken, async (req, res) => {
    const { tea_price, water_price } = req.body;

    if (tea_price == null || water_price == null)
        return res.status(400).json({ error: 'Missing values' });

    try {
        await db.query('UPDATE settings SET value=$1 WHERE key=$2', [tea_price, 'tea_price']);
        await db.query('UPDATE settings SET value=$1 WHERE key=$2', [water_price, 'water_price']);

        res.json({ message: 'Settings updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

/* ================================
   EXPENSES (PROTECTED)
================================ */

app.get('/api/expenses', authenticateToken, async (req, res) => {
    try {
        let {
            sortBy = 'date',
            order = 'DESC',
            page = 1,
            limit = 5,
            startDate,
            endDate,
            minTea,
            maxTea,
            minWater,
            maxWater
        } = req.query;

        page = Number(page);
        limit = Number(limit);
        const offset = (page - 1) * limit;

        const allowedSort = ['date', 'tea_cups', 'water_cans', 'total_amount', 'created_at'];
        if (!allowedSort.includes(sortBy)) sortBy = 'date';
        order = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

        let where = [];
        let params = [];

        if (startDate) {
            params.push(startDate);
            where.push(`date >= $${params.length}`);
        }
        if (endDate) {
            params.push(endDate);
            where.push(`date <= $${params.length}`);
        }
        if (minTea) {
            params.push(minTea);
            where.push(`tea_cups >= $${params.length}`);
        }
        if (maxTea) {
            params.push(maxTea);
            where.push(`tea_cups <= $${params.length}`);
        }
        if (minWater) {
            params.push(minWater);
            where.push(`water_cans >= $${params.length}`);
        }
        if (maxWater) {
            params.push(maxWater);
            where.push(`water_cans <= $${params.length}`);
        }

        const whereSQL = where.length ? `WHERE ${where.join(' AND ')}` : '';

        const result = await db.query(
            `SELECT id,date,to_char(time,'HH24:MI') as time,
             tea_cups,water_cans,tea_price,water_price,total_amount,notes,created_at
             FROM expenses
             ${whereSQL}
             ORDER BY ${sortBy} ${order}
             LIMIT $${params.length + 1}
             OFFSET $${params.length + 2}`,
            [...params, limit, offset]
        );

        const count = await db.query(
            `SELECT COUNT(*) FROM expenses ${whereSQL}`,
            params
        );

        res.json({
            data: result.rows,
            pagination: {
                total: Number(count.rows[0].count),
                page,
                limit
            }
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

/* ================================
   DASHBOARD STATS (PROTECTED)
================================ */

app.get('/api/stats', authenticateToken, async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
            .toISOString().split('T')[0];

        const todayStats = await db.query(
            `SELECT SUM(tea_cups) tea,
                    SUM(water_cans) water,
                    SUM(total_amount) total,
                    SUM(tea_cups * tea_price) tea_amount,
                    SUM(water_cans * water_price) water_amount
             FROM expenses WHERE date=$1`,
            [today]
        );

        const monthStats = await db.query(
            `SELECT SUM(tea_cups) tea,
                    SUM(water_cans) water,
                    SUM(total_amount) total,
                    SUM(tea_cups * tea_price) tea_amount,
                    SUM(water_cans * water_price) water_amount
             FROM expenses WHERE date >= $1`,
            [firstDay]
        );

        res.json({
            today: {
                tea: Number(todayStats.rows[0].tea || 0),
                water: Number(todayStats.rows[0].water || 0),
                amount: Number(todayStats.rows[0].total || 0),
                tea_amount: Number(todayStats.rows[0].tea_amount || 0),
                water_amount: Number(todayStats.rows[0].water_amount || 0)
            },
            month: {
                tea: Number(monthStats.rows[0].tea || 0),
                water: Number(monthStats.rows[0].water || 0),
                amount: Number(monthStats.rows[0].total || 0),
                tea_amount: Number(monthStats.rows[0].tea_amount || 0),
                water_amount: Number(monthStats.rows[0].water_amount || 0)
            }
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

/* ================================
   ADD EXPENSE (PROTECTED)
================================ */

app.post('/api/expenses', authenticateToken, async (req, res) => {
    let { date, time, tea_cups, water_cans, tea_price, water_price, notes } = req.body;

    if (!date || tea_cups == null || water_cans == null || tea_price == null || water_price == null)
        return res.status(400).json({ error: 'Missing required fields' });

    tea_cups = Number(tea_cups);
    water_cans = Number(water_cans);
    tea_price = Number(tea_price);
    water_price = Number(water_price);

    if (tea_cups === 0 && water_cans === 0)
        return res.status(400).json({ error: 'Enter tea or water count' });

    if (tea_cups < 0 || water_cans < 0 || tea_price < 0 || water_price < 0)
        return res.status(400).json({ error: 'Negative values not allowed' });

    const total = (tea_cups * tea_price) + (water_cans * water_price);

    try {
        const result = await db.query(
            `INSERT INTO expenses
            (date,time,tea_cups,water_cans,tea_price,water_price,total_amount,notes)
            VALUES ($1,COALESCE($2::time,CURRENT_TIME),$3,$4,$5,$6,$7,$8)
            RETURNING *`,
            [date, time, tea_cups, water_cans, tea_price, water_price, total, notes]
        );

        res.status(201).json(result.rows[0]);

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

/* ================================
   UPDATE EXPENSE (PROTECTED)
================================ */

app.put('/api/expenses/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    let { date, time, tea_cups, water_cans, tea_price, water_price, notes } = req.body;

    const total = (tea_cups * tea_price) + (water_cans * water_price);

    try {
        const result = await db.query(
            `UPDATE expenses SET
            date=$1,time=$2,tea_cups=$3,water_cans=$4,
            tea_price=$5,water_price=$6,total_amount=$7,notes=$8
            WHERE id=$9 RETURNING *`,
            [date, time, tea_cups, water_cans, tea_price, water_price, total, notes, id]
        );

        if (!result.rows.length)
            return res.status(404).json({ error: 'Expense not found' });

        res.json(result.rows[0]);

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

/* ================================
   DELETE (PROTECTED)
================================ */

app.delete('/api/expenses/:id', authenticateToken, async (req, res) => {
    try {
        const result = await db.query(
            'DELETE FROM expenses WHERE id=$1 RETURNING *',
            [req.params.id]
        );

        if (!result.rows.length)
            return res.status(404).json({ error: 'Not found' });

        res.json({ message: 'Deleted successfully' });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

/* ================================
   START SERVER
================================ */

app.listen(PORT, () =>
    console.log(`✅ Server running on port ${PORT}`)
);
