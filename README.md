# WAEC Certificate Verification Portal

A modern verification system built for WAEC record management and public certificate authentication.

## Overview

This project is designed around two primary actors:

- Admin: a WAEC records officer who signs in, registers candidate certificates, updates records, and manages the verification database.
- Verifier: an employer, school admissions officer, or member of the public who can check a certificate without logging in.

This system does not provide student access to the main portal or dashboard.

## Actors

### Admin
- Signs in with a default admin account
- Registers candidate certificate details
- Enters candidate name, exam number, exam year, subjects and grades
- Stores a unique certificate or serial number
- Reviews, updates, and removes records when needed

### Verifier
- No login required
- Enters a certificate number or candidate details
- Gets a result such as: Valid, Not Found, or Mismatch
- Confirms whether a WAEC certificate is authentic or fake/tampered

## Features

### Admin Features
- Default admin account for access
- Candidate certificate upload to the database
- Persistent records for candidate, certificate, and subject result data
- Database-backed verification support
- Record review and deletion management

### Verifier Features
- Public certificate checking without login
- Candidate verification using certificate number and exam data
- Authenticity validation against official WAEC records
- Clear result responses: valid, not found, or mismatch

## Project Structure

```text
Project/
├── Frontend/
│   ├── admin/
│   │   ├── admin.html
│   │   ├── login.html
│   │   ├── register.html
│   │   └── script.js
│   └── page/
│       ├── dashboard.html
│       ├── login.html
│       ├── register.html
│       ├── results.html
│       ├── script.js
│       ├── styles.css
│       ├── support.html
│       ├── verify-certificate.html
│       └── profile.html
├── backend/
│   ├── db.js
│   ├── server.js
│   └── weac.db
├── README.md
└── .gitignore
```

## Tech Stack

- HTML5
- CSS3
- JavaScript
- Express.js
- SQLite3
- CORS

## Default Admin Account

Use the default admin account to log in to the admin portal:

- Admin ID: admin
- Password: admin123

## Prerequisites

Before running the project, make sure you have the following installed:

- Node.js
- npm

## Installation

1. Open a terminal in the project root.
2. Go to the backend directory:

```bash
cd backend
```

3. Install dependencies:

```bash
npm install express cors sqlite3
```

## Running the Project

### Start the backend server

From the backend folder:

```bash
node server.js
```

The backend is expected to run at:

```text
http://localhost:5000
```

### Open the frontend

Open the admin and public verification pages from the Frontend folder in your browser.

Examples:

```text
Frontend/admin/login.html
Frontend/page/verify-certificate.html
```

## API Endpoints

The backend exposes the following key endpoints:

### Authentication
- POST /api/login

### Verification
- POST /api/verify-certificate

### Admin
- GET /api/admin/summary
- GET /api/admin/records
- POST /api/admin/results
- POST /api/admin/delete-record

### Candidate Data
- GET /api/candidate/:candidateNumber
- GET /api/results/:candidateNumber

### Health Check
- GET /api/health

## Verification Workflow

1. The admin logs in and uploads official WAEC records.
2. The verifier opens the public certificate checker without sign in.
3. The verifier enters the certificate or candidate data.
4. The system compares the supplied details against the stored database records.
5. The system returns one of the following:
   - Valid
   - Not Found
   - Mismatch

## Notes

- The admin portal is protected by login.
- The public verifier is intentionally not required to sign in.
- The database is initialized automatically when the backend starts.
- Seed records are included for testing and demonstration.

## License

This project is for educational and demonstration purposes.

## Project Structure

```text
Project/
├── Frontend/
│   ├── admin/
│   │   ├── admin.html
│   │   ├── login.html
│   │   ├── register.html
│   │   └── script.js
│   └── page/
│       ├── dashboard.html
│       ├── login.html
│       ├── register.html
│       ├── results.html
│       ├── script.js
│       ├── styles.css
│       ├── support.html
│       ├── verify-certificate.html
│       └── profile.html
├── backend/
│   ├── db.js
│   ├── server.js
│   └── weac.db
├── README.md
└── .gitignore
```

## Tech Stack

- HTML5
- CSS3
- JavaScript
- Express.js
- SQLite3
- CORS

## Default Admin Account

Use the default admin account to log in to the admin portal:

- Admin ID: admin
- Password: admin123

## Prerequisites

Before running the project, make sure you have the following installed:

- Node.js
- npm

## Installation

1. Open a terminal in the project root.
2. Go to the backend directory:

```bash
cd backend
```

3. Install dependencies:

```bash
npm install express cors sqlite3
```

## Running the Project

### Start the backend server

From the backend folder:

```bash
node server.js
```

The backend is expected to run at:

```text
http://localhost:5000
```

### Open the frontend

Open the HTML files in the Frontend folder using a browser or a local development server.

Example:

```text
Frontend/page/login.html
```

or

```text
Frontend/admin/login.html
```

## API Endpoints

The backend exposes the following key endpoints:

### Authentication
- POST /api/login

### Verification
- POST /api/verify-certificate

### Admin
- GET /api/admin/summary
- GET /api/admin/records
- POST /api/admin/results
- POST /api/admin/delete-record

### Candidate Data
- GET /api/candidate/:candidateNumber
- GET /api/results/:candidateNumber

### Health Check
- GET /api/health

## Verification Workflow

1. A student signs in to the portal.
2. The student enters their candidate number, certificate number, exam year, and result subjects.
3. The system checks the submitted data against the official WAEC data in the SQLite database.
4. The system returns one of the following:
   - Authentic certificate
   - Tampered record
   - Fake or missing certificate

## Notes

- The application uses local browser storage for the student session flow.
- The database is initialized automatically when the backend starts.
- Seed example candidate and certificate records are stored in the SQLite database for testing and demonstration.

## License

This project is for educational and demonstration purposes.
