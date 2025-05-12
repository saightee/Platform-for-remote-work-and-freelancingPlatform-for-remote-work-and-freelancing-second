# API Documentation for Authentication

## Base URL
`http://localhost:3000`

## Endpoints

### 1. Register a User
- **Endpoint**: `POST api/auth/register`
- **Description**: Initiates user registration with email, password, and username. Returns a temporary token for role selection.
- **Request Body**:
  ```json
  {
    "email": "test@example.com",
    "password": "password",
    "username": "test"
  }

- **Response (Success - 302): Redirects to /api/auth/select-role with a tempToken in the query**:
  http://localhost:3000/api/auth/select-role?tempToken=<tempToken>
  
- **Response (Error - 400, if email already exists):**:
  ```json
  {
    "statusCode": 400,
    "message": "Email already exists",
    "error": "Bad Request"
  }


### 2. Login a User
- **Endpoint**: `POST api/auth/login`
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
- **Endpoint**: `POST api/auth/logout`
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

### 4. Google OAuth - Initiate Authentication
- **Endpoint**: `GET /api/auth/google`
- **Description**: Initiates the Google OAuth authentication process.
- **Request Parameters**: None
- **Response**: Redirects the user to Google's authentication page.

### 5. Google OAuth - Callback (handled by backend)
- **Endpoint**: `GET /api/auth/google/callback`
- **Description**: Handles the callback from Google after authentication. Redirects the user to a role selection page with a temporary token.
- **Query Parameters**: code: Authorization code from Google (handled automatically).
- **Response: Redirects to /api/auth/select-role with a tempToken in the query:**:
  http://localhost:3000/api/auth/select-role?tempToken=<tempToken>

- **Error Response (500, if authentication fails):**:
  ```json
  {
  "message": "Authentication failed",
  "error": "<error message>"
  }

### 6. Select Role After Registration or OAuth
- **Endpoint**: `POST /api/auth/select-role`
- **Description**: Completes the registration process (manual or OAuth) by allowing the user to select their role (employer or jobseeker) and provide additional data.
- **Request Body:**: 
  //For employer
  ```json
  {
  "tempToken": "<tempToken>",
  "role": "employer",
  "company_name": "Test Company",
  "company_info": "A great company",
  "referral_link": "https://example.com/ref/test"
  }
  //For jobseeker
  ```json
  {
  "tempToken": "<tempToken>",
  "role": "jobseeker",
  "skills": ["JavaScript", "TypeScript"],
  "experience": "2 years",
  "portfolio": "https://portfolio.com",
  "video_intro": "https://video.com"
  }


- **Response (Success - 200):**: 
  ```json
  {
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }

- **Response (Error - 400, if tempToken is invalid or expired):**: 
  ```json
  {
  "statusCode": 400,
  "message": "Invalid or expired OAuth token",
  "error": "Bad Request"
  }

- **Response (Error - 500, if role selection fails):**: 
  ```json
  {
  "message": "Role selection failed",
  "error": "<error message>"
  }