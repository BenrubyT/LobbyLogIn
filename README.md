# LobbyApp

LobbyApp is a web application designed for managing customer sign-ins and visits. It provides an admin interface for managing customer records and a sign-in page for customers.

## Features

- Admin authentication and session management
- Customer sign-in and visit tracking
- Import and export customer data in CSV format
- Dynamic admin interface for managing customer records
- Photo capture functionality for customers

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/BenrubyT/LobbyLogIn
   ```

2. Navigate to the project directory:
   ```
   cd LobbyApp
   ```

3. Install the dependencies:
   ```
   npm install
   ```

## Usage

1. Start the server:
   ```
   node app.js
   ```

2. Access the application:
   - Admin panel: [http://localhost:49155/admin.html](http://localhost:49155/admin.html)
   - Customer sign-in: [http://localhost:49155/signin.html](http://localhost:49155/signin.html)

## API Endpoints

- `POST /api/admin/login`: Authenticate admin users.
- `POST /api/admin/logout`: Log out the admin user.
- `GET /api/customers`: Retrieve all customer records.
- `POST /api/customers`: Add or update a customer record.
- `DELETE /api/customers/:id`: Delete a customer record.
- `POST /api/customers/import`: Import customer data from a CSV file.
- `GET /api/customers/export`: Export customer data to a CSV file.

## Contributing

Contributions are welcome! Please submit a pull request or open an issue for any enhancements or bug fixes.

