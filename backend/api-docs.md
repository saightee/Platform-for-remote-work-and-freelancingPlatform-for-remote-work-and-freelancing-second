# API Documentation for Authentication

## Base URL
`http://localhost:3000`

## Endpoints

### 1. Register a User
- **Endpoint**: `POST /auth/register`
- **Description**: Registers a new user with email, password, and username.
- **Request Body**:
  ```json
  {
    "email": "test@example.com",
    "password": "password",
    "username": "test"
  }

- **Response (Success - 201)**:
  ```json
  {
    "message": "User registered",
    "userId": 1
  }
  
- **Response (Error - 400, if email already exists):**:
  ```json
  {
    "statusCode": 400,
    "message": "Email already exists",
    "error": "Bad Request"
  }


### 2. Login a User
- **Endpoint**: `POST /auth/login`
- **Description**: Logs in a user with email and password, returns a JWT token.
- **Request Body**:
  ```json
  {
    "email": "test@example.com",
    "password": "password"
  }

- **Response (Success - 201)**:
  ```json
  {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
  
- **Response (Error - 401, if credentials are invalid):**:
  ```json
  {
    "statusCode": 401,
    "message": "Invalid credentials",
    "error": "Unauthorized"
  }  

### 3. Logout a User
- **Endpoint**: `POST /auth/logout`
- **Description**: Logs out a user by blacklisting the JWT token.
- **Headers**: Authorization: Bearer <token>
- **Request Body**: None

- **Response (Success - 201)**:
  ```json
  {
    "message": "Logout successful"
  }
  
- **Response (Error - 401, if token is invalid or already blacklisted):**:
  ```json
  {
    "statusCode": 401,
    "message": "Token already invalidated",
    "error": "Unauthorized"
  }    

- **Response (Error - 401, if token is missing or malformed):**:
  ```json
  {
    "statusCode": 401,
    "message": "Invalid token",
    "error": "Unauthorized"
  }      