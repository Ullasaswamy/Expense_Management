# Office Tea & Water Expenses Manager

A simple full-stack application to track daily office expenses for tea, water, and other items.

## Features
- Add daily expense entries (Date, Item Type, Quantity, Amount, Notes).
- Dashboard cards showing "Today's Total" and "This Month's Total".
- Paginated and sortable table view of all expenses.
- Edit and delete existing entries.
- Modern UI built with React and Tailwind CSS.
- REST API with Node.js, Express, and PostgreSQL.

## Prerequisites
- Node.js (v14 or later)
- PostgreSQL

## Setup Instructions

### 1. Database Setup
1. Create a PostgreSQL database named `office_expenses`.
2. Run the SQL schema provided in `backend/schema.sql` to create the `expenses` table.

### 2. Backend Setup
1. Navigate to the `backend` folder:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file based on `.env.example` and update your database credentials:
   ```env
   PORT=5000
   DB_USER=your_postgres_user
   DB_PASSWORD=your_postgres_password
   DB_HOST=localhost
   DB_NAME=office_expenses
   DB_PORT=5432
   ```
4. Start the server:
   ```bash
   npm run dev
   ```

### 3. Frontend Setup
1. Navigate to the `frontend` folder:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
4. Open your browser and navigate to `http://localhost:5173`.

## Project Structure
- `backend/`: Node.js + Express API.
- `frontend/`: React + Vite + Tailwind CSS UI.
- `schema.sql`: Database table definition.
# Expense_Management
