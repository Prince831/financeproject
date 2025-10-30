# Finance Reconciliation Portal

A comprehensive web application for financial transaction reconciliation built with React (frontend) and Laravel (backend).

## Features

- **File Upload & Processing**: Upload CSV files containing transaction data for reconciliation
- **Automated Reconciliation**: Intelligent matching of transactions between different sources
- **Discrepancy Detection**: Identify and highlight mismatched or missing transactions
- **Real-time Processing**: Live progress tracking during reconciliation operations
- **Results Visualization**: Interactive charts and tables for reconciliation results
- **History Tracking**: Maintain records of all reconciliation operations
- **Export Capabilities**: Generate and download reconciliation reports

## Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for build tooling
- **Tailwind CSS** for styling
- **React Router** for navigation
- **Chart.js** for data visualization
- **Axios** for API communication

### Backend
- **Laravel 11** (PHP framework)
- **MySQL** database
- **RESTful API** design
- **File processing** with validation
- **Database migrations** for schema management

## Prerequisites

- **Node.js** (v18 or higher)
- **PHP** (v8.2 or higher)
- **Composer** (PHP dependency manager)
- **MySQL** database
- **Git**

## Installation & Setup

### 1. Clone the Repository
```bash
git clone https://gitlab.npontutechnologies.com/ishmaila/finance_reconciliation.git
cd finance_reconciliation
```

### 2. Backend Setup
```bash
cd backend

# Install PHP dependencies
composer install

# Copy environment file and configure
cp .env.example .env

# Generate application key
php artisan key:generate

# Configure database in .env file
# DB_CONNECTION=mysql
# DB_HOST=127.0.0.1
# DB_PORT=3306
# DB_DATABASE=finance_reconciliation
# DB_USERNAME=your_username
# DB_PASSWORD=your_password

# Run database migrations
php artisan migrate
```

### 3. Frontend Setup
```bash
# From project root directory
npm install
```

### 4. Environment Configuration

#### Backend (.env)
```env
APP_NAME="Finance Reconciliation"
APP_ENV=local
APP_KEY=base64:your-generated-key
APP_DEBUG=true
APP_URL=http://localhost:8000

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=finance_reconciliation
DB_USERNAME=your_db_user
DB_PASSWORD=your_db_password

# File upload settings
FILESYSTEM_DISK=local
MAX_FILE_SIZE=10240
```

#### Frontend Environment (if needed)
Create a `.env.local` file in the root directory:
```env
VITE_API_BASE_URL=http://localhost:8000/api
```

## Running the Application

### Development Mode

1. **Start Backend Server:**
```bash
cd backend
php artisan serve
```
Backend will be available at: `http://localhost:8000`

2. **Start Frontend Development Server:**
```bash
# From project root
npm run dev
```
Frontend will be available at: `http://localhost:5173`

### Production Build

1. **Build Frontend:**
```bash
npm run build
```

2. **Serve Backend:**
```bash
cd backend
php artisan serve --host=0.0.0.0 --port=8000
```

## Usage

1. **Access the Application**: Open `http://localhost:5173` in your browser
2. **Upload Files**: Use the file upload interface to select CSV files containing transaction data
3. **Configure Reconciliation**: Set reconciliation parameters and rules
4. **Process Data**: Start the reconciliation process and monitor progress
5. **Review Results**: Analyze discrepancies and generate reports
6. **Export Reports**: Download reconciliation reports in various formats

## API Documentation

The backend provides RESTful APIs for:
- File upload and processing
- Reconciliation operations
- Report generation
- Data retrieval

Base API URL: `http://localhost:8000/api`

## Database Schema

### Key Tables
- **transactions**: Stores transaction data
- **reconciliation_reports**: Stores reconciliation results
- **users**: User management (if authentication is added)

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Merge Request

## License

This project is proprietary software developed for internal use.

## Support

For technical support or questions, please contact the development team.

