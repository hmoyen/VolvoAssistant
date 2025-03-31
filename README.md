# Node.js Backend for VolvoAssistant

This repository contains a Node.js backend built with Express.js and PostgreSQL. It provides APIs for user registration and login with password hashing (using bcrypt) and JWT-based authentication. The backend connects to a Neon PostgreSQL database.

## Features

- User registration with password hashing
- User login with JWT token generation
- Secure database connectivity (SSL enabled for Neon)
- RESTful API endpoints for user management

## Prerequisites

- [Node.js](https://nodejs.org/) (v14 or later recommended)
- [npm](https://www.npmjs.com/) (comes with Node.js)
- A Neon PostgreSQL database (or any PostgreSQL instance)
- Basic knowledge of JavaScript and REST APIs

## Installation

1. **Clone the repository:**

   ```bash
   git clone git@github.com:hmoyen/VolvoAssistant.git
   cd VolvoAssistant
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Create a `.env` file in the project root and add your environment variables:**

   ```ini
   PORT=5000
   PGUSER=your_postgres_user
   PGHOST=your_postgres_host
   PGDATABASE=your_postgres_database
   PGPASSWORD=your_postgres_password
   JWT_SECRET=your_jwt_secret
   ```

   - Replace the values with your actual database credentials and a secure secret for JWT.
   - **Note:** Do not commit your `.env` file to version control.

## Database Setup

This project uses PostgreSQL for storing user data. If you haven't already set up your database, you can create the required `users` table with the following SQL command:

```sql
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  password TEXT NOT NULL,
  role VARCHAR(50) NOT NULL
);
```

You can run this command using any PostgreSQL client (e.g., `psql`, pgAdmin, or the Neon dashboard).

## Running the Application

Start the server by running:

```bash
node server.js
```

You should see output similar to:

```
Server running on port 5000
Connected to the database
```

## API Endpoints

### User Registration

- **Endpoint:** `POST /api/users/register`
- **Description:** Registers a new user with a hashed password.
- **Request Body:**

  ```json
  {
    "name": "John Doe",
    "email": "johndoe@example.com",
    "password": "securepassword123",
    "role": "customer"
  }
  ```

- **Success Response:**
  - **Status:** 201 Created
  - **Body:**

    ```json
    {
      "message": "User registered successfully",
      "user": {
        "id": 1,
        "name": "John Doe",
        "email": "johndoe@example.com",
        "password": "$2b$10$...",
        "role": "customer"
      }
    }
    ```

### User Login

- **Endpoint:** `POST /api/users/login`
- **Description:** Logs in a user and returns a JWT token.
- **Request Body:**

  ```json
  {
    "email": "johndoe@example.com",
    "password": "securepassword123"
  }
  ```

- **Success Response:**
  - **Status:** 200 OK
  - **Body:**

    ```json
    {
      "message": "Login successful",
      "token": "your_jwt_token_here"
    }
    ```

## Testing the API

### Using Postman

1. **Registration:**
   - Method: `POST`
   - URL: `http://localhost:5000/api/users/register`
   - Body (raw JSON):

     ```json
     {
       "name": "John Doe",
       "email": "johndoe@example.com",
       "password": "securepassword123",
       "role": "customer"
     }
     ```

2. **Login:**
   - Method: `POST`
   - URL: `http://localhost:5000/api/users/login`
   - Body (raw JSON):

     ```json
     {
       "email": "johndoe@example.com",
       "password": "securepassword123"
     }
     ```

### Using cURL

- **Register:**

  ```bash
  curl -X POST http://localhost:5000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{"name": "John Doe", "email": "johndoe@example.com", "password": "securepassword123", "role": "customer"}'
  ```

- **Login:**

  ```bash
  curl -X POST http://localhost:5000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"email": "johndoe@example.com", "password": "securepassword123"}'
  ```

## Contributing

Contributions are welcome! Please fork this repository and open a pull request with your improvements.

## License

This project is licensed under the MIT License.

