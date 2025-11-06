# API Documentation

## Base URL
`http://localhost:3000`

## Endpoints

### 1. Register a User
- **Endpoint**: `POST api/auth/register`
- **Description**: reates a new account (role: jobseeker or employer). Sends an email verification link.
Also supports privileged creation of admin / moderator users when a valid secretKey is provided (returns an access token immediately)
- **Headers**: 
  `x-fingerprint (required)` — device/browser fingerprint string.
  `x-forwarded-for (optional)` — client IP (used for geo & anti-fraud).
  `x-real-ip (optional)` — alternative IP header.
  `x-site-brand (optional)` — explicit brand (jobforge, 22resumes, …). If omitted, backend infers brand from Origin/  Referer/Host.
  `x-ref (optional)` — referral code (also accepted in body/query/cookie).
 ` Standard multipart headers if uploading files.`
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "StrongP@ssw0rd",
    "username": "jane",
    "role": "jobseeker",            // "jobseeker" | "employer"
    "country": "US",                // optional; inferred from IP if missing
    "skills": ["<categoryId1>", "<categoryId2>"],  // jobseeker only
    "experience": "3 years",        // jobseeker only
    "resume": "https://.../cv.pdf", // optional; auto-filled if resume_file uploaded
    "linkedin": "https://linkedin.com/in/...",
    "instagram": "https://instagram.com/...",
    "facebook": "https://facebook.com/...",
    "whatsapp": "+12025550123",
    "telegram": "@username",
    "description": "up to 150 words",
    "languages": ["English", "German"],
    "ref": "<referralCode>",        // optional (also accepted via query/header/cookie)
    "secretKey": "<admin-or-moderator-secret>"     // privileged registration only
  }
- **Response (Success - 200)**:
  ```json
    {"message": "Registration is successful. Please confirm your email."}
- **Response (Error - 400, Invalid resume file)**:
  ```json
  {"statusCode": 400, "message": "Only PDF, DOC, and DOCX files are allowed for resume", "error": "Bad Request"}
- **Response (Error - 400, Invalid avatar file)**:
  ```json
  {"statusCode": 400, "message": "Avatar must be an image: JPG, PNG, or WEBP", "error": "Bad Request"}
- **Response (Error - 400, Missing fingerprint)**:
  ```json
  {"statusCode": 400, "message": "Fingerprint is required", "error": "Bad Request"}
- **Response (Error - 400, Weak password)**:
  ```json
  {"statusCode": 400, "message": "Weak password", "error": "Bad Request"}
- **Response (Error - 403, Country blocked)**:
  ```json
  {"statusCode": 403, "message": "Registration is not allowed from your country", "error": "Forbidden"}
- **Response (Error - 400, Email already exists (verified))**:
  ```json
  {"statusCode": 400, "message": "Email already exists", "error": "Bad Request"}
- **Response (Email exists but not verified (resend triggered))**:
  ```json
  {"message": "Account exists but not verified. We sent a new confirmation link."}
- **Response (Avatar required for jobseeker)**:
  ```json
  {"statusCode": 400, "message": "Avatar is required for jobseeker registration", "error": "Bad Request"}
- **Response (Invalid secret key (privileged registration))**:
  ```json
  {"statusCode": 401, "message": "Invalid secret key", "error": "Unauthorized"}
- **Response (Unexpected file field)**:
  ```json
  {"statusCode": 400, "message": "Unexpected file field", "error": "Bad Request"}

### 1.1 Verify Email
- **Endpoint**: `GET api/auth/verify-email`
- **Description**: Verifies a user’s email using a one-time token. On success, redirects to the frontend callback with a JWT for auto-login.
- **Query Parameters:**: `token`: (Required, token from the verification email)
- **Response (Success - 302 Redirect)**: Redirects to `${FRONTEND_URL}/auth/callback?token=<JWT>&verified=true`
  - `token` (string, required): verification token from the email link.

- **Response (Error - 400, if token is invalid or expired)**: Redirect to `${FRONTEND_URL}/auth/callback?error=invalid_token` or JSON:
  ```json
  {
    "statusCode": 400,
    "message": "Invalid or expired verification token",
    "error": "Bad Request"
  }

### 1.2 Resend Verification Email
- **Endpoint**: `POST /api/auth/resend-verification`
- **Description**: Sends a new email to verify the email if the account exists and has not yet been verified.
- **Request Body:**: 
  ```json
  { 
    "email": "user@example.com" 
  }
- **Response (Success - 200)**:
  ```json
  { 
    { "message": "If the account exists and is not verified, we sent a new link." }
  }

- **Response 429 (rate limit)**:
  ```json
  { "statusCode": 429, "message": "Please wait before requesting another verification email", "error": "Too Many Requests" }

### 2. Login a User
- **Endpoint**: `POST api/auth/login`
- **Description**: Logs in a user with email and password, returns a JWT token. Users must have verified their email before logging in.
- **Request Body**:
  ```json
  {
    "email": "test@example.com",
    "password": "password",
    "rememberMe": false // Optional, extends token expiry to 7 days if true
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

- **Response (Error - 401, if email is not verified)**:
  ```json
  {
    "statusCode": 401,
    "message": "Please confirm your email before logging in",
    "error": "Unauthorized"
  }  

- **Response (Error - 401, if user is blocked):**:
  ```json
  {
    "statusCode": 401,
    "message": "User is blocked",
    "error": "Unauthorized"
  }

### 2.1 Forgot Password
- **Endpoint**: `POST api/auth/forgot-password`
- **Description**: Sends a password reset link to the user's email.
- **Request Body**:
  ```json
  {
    "email": "test@example.com"
  }

- **Response (Success - 201)**:
  ```json
  {
    "message": "Password reset link sent"
  }

- **Response (Error - 400, if user not found)**:
  ```json
  {
    "statusCode": 400,
    "message": "User not found",
    "error": "Bad Request"
  }

- **Response (Error - 401, if user is admin or moderator)**:
  ```json
  {
    "statusCode": 401,
    "message": "Password reset is not allowed for admin or moderator roles",
    "error": "Unauthorized"
  }

### 2.2 Reset Password
- **Endpoint**: `POST api/auth/reset-password`
- **Description**: Resets the user's password using a token from the reset email.
- **Request Body**:
  ```json
  {
    "token": "<resetToken>",
    "newPassword": "newpassword123"
  }

- **Response (Success - 201)**:
  ```json
  {
    "message": "Password successfully reset"
  }

- **Response (Error - 400, if token is invalid or expired)**:
  ```json
  {
    "statusCode": 400,
    "message": "Invalid or expired reset token",
    "error": "Bad Request"
  }

- **Response (Error - 401, if user is admin or moderator)**:
  ```json
  {
    "statusCode": 401,
    "message": "Password reset is not allowed for admin or moderator roles",
    "error": "Unauthorized"
  }

### 3. Logout a User
- **Endpoint**: `POST api/auth/logout`
- **Description**: Logs out a user by blacklisting the JWT token in Redis.
- **Headers**: `Authorization: Bearer <token>`
- **Request Body**: None

- **Response (Success - 201)**:
  ```json
  {
    "message": "Logout successful"
  }
  
- **Response (Error - 401, if token is invalid or already blacklisted)**:
  ```json
  {
    "statusCode": 401,
    "message": "Token already invalidated",
    "error": "Unauthorized"
  }    

- **Response (Error - 401, if token is missing or malformed)**:
  ```json
  {
    "statusCode": 401,
    "message": "Invalid token",
    "error": "Unauthorized"
  }

### 4. Google OAuth - Initiate Authentication
- **Endpoint**: `GET /api/auth/google`
- **Description**: Initiates the Google OAuth authentication process.
- **Query Parameters**: `role` (string, required): The role of the user ("employer" or "jobseeker").
- **Example Request**: `/api/auth/google?role=employer`
- **Response**: Redirects the user to Google's authentication page.

### 5. Google OAuth - Callback (handled by backend)
- **Endpoint**: `GET /api/auth/google/callback`
- **Description**: Handles the callback from Google after authentication. Redirects the user to a callback URL with a token and role for further processing.
- **Query Parameters**: 
  `code`: Authorization code from Google (handled automatically).
  `callbackUrl`: (optional): Custom URL to redirect to after authentication.
- **Response:**: Redirects to the specified callbackUrl or default /auth/callback with query parameters: /auth/callback?token=<jwt-token>&role=<employer|jobseeker>
  `token`: JWT token for user authentication.
  `role`: The role of the user ("employer" or "jobseeker").

- **Error Response (500, if authentication fails)**:
  ```json
  {
    "message": "Authentication failed",
    "error": "<error message>"
  }

### 5.1. Google OAuth - Login
- **Endpoint**: `POST /api/auth/google-login`
- **Description**: Completes the login process for a user authenticated via Google OAuth.
- **Request Body**: 
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }

- **Response (Success - 200)**:
  ```json
  {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }

- **Response (Error - 401, if token is invalid)**:
  ```json
  {
    "statusCode": 401,
    "message": "Invalid token",
    "error": "Unauthorized"
  }

### 6. Get Profile
- **Endpoint**: `GET /api/profile/myprofile`
- **Description**: Retrieves the authenticated user's profile based on their role.
- **Headers**: `Authorization: Bearer <token>`
- **Request Body**: None
- **Response (Success - 200)**: 
  //For employer
  ```json
  {
    "id": "<userId>",
    "role": "employer",
    "email": "test@example.com",
    "username": "test",
    "country": "US",
    "company_name": "Test Company",
    "company_info": "A great company",
    "referral_link": "https://example.com/ref/test",
    "timezone": "Europe/Moscow",
    "currency": "USD",
    "expected_salary": 4500.00,
    "average_rating": 4.5,
    "job_search_status": "open_to_offers",
    "avatar": "https://example.com/avatar.jpg",
    "identity_verified": true,
    "reviews": [
      {
        "id": "<reviewId>",
        "reviewer_id": "<userId>",
        "reviewed_id": "<userId>",
        "job_application_id": "<jobApplicationId>",
        "rating": 4,
        "comment": "Great work, very professional!",
        "created_at": "2025-05-13T18:00:00.000Z",
        "updated_at": "2025-05-13T18:00:00.000Z"
      }
    ]
  }
  //For jobseeker
  ```json
  {
    "id": "<userId>",
    "role": "jobseeker",
    "email": "test@example.com",
    "username": "test",
    "country": "US",
    "languages": ["English","German"],
    "skills": [
      {
        "id": "<skillId>",
        "name": "Web Development",
        "parent_id": "<parentSkillId>",
        "created_at": "2025-05-22T18:00:00.000Z",
        "updated_at": "2025-05-22T18:00:00.000Z"
      }
    ],
    "experience": "2 years",
    "linkedin": "https://www.linkedin.com/in/username",
    "instagram": "https://www.instagram.com/username",
    "facebook": "https://www.facebook.com/username",
    "description": "Experienced web developer specializing in React and Node.js",
    "portfolio": "https://portfolio.com",
    "video_intro": "https://video.com",
    "resume": "https://example.com/resume.pdf", // или "/uploads/resumes/filename.pdf
    "timezone": "Europe/Moscow",
    "currency": "USD",
    "average_rating": 4.0,
    "profile_views": 10,
    "avatar": "https://example.com/avatar.jpg",
    "identity_verified": false,
    "reviews": [
      {
        "id": "<reviewId>",
        "reviewer_id": "<userId>",
        "reviewed_id": "<userId>",
        "job_application_id": "<jobApplicationId>",
        "rating": 4,
        "comment": "Great work, very professional!",
        "created_at": "2025-05-22T18:00:00.000Z",
        "updated_at": "2025-05-22T18:00:00.000Z"
      }
    ]
  }
- **Response (Error - 401, if token is invalid or missing)**: 
  ```json
  {
    "statusCode": 401,
    "message": "Invalid token",
    "error": "Unauthorized"
  }

- **Response (Error - 404, if user or profile not found)**: 
  ```json
  {
    "statusCode": 404,
    "message": "User not found",
    "error": "Not Found"
  }

### 6.1. Get Profile by ID
- **Endpoint**: `GET /api/profile/:id`
- **Description**: Retrieves the profile of a specific user (jobseeker or employer) by their ID. Accessible to both authenticated and unauthenticated users. For unauthenticated users, sensitive information like email is omitted. For jobseeker profiles, the view count is incremented.
- **Headers**: `Authorization: Bearer <token>` (Optional)
- **Request Parameters**: `id`: The ID of the user.
- **Response (Success - 200)**: 
  // For employer (unauthenticated)
  ```json
  {
    "id": "<userId>",
    "role": "employer",
    "username": "test",
    "country": "US",
    "company_name": "Test Company",
    "company_info": "A great company",
    "referral_link": "https://example.com/ref/test",
    "timezone": "Europe/Moscow",
    "currency": "USD",
    "average_rating": 4.5,
    "job_search_status": "open_to_offers",
    "avatar": "https://example.com/avatar.jpg",
    "identity_verified": true,
    "reviews": [
      {
        "id": "<reviewId>",
        "reviewer_id": "<userId>",
        "reviewed_id": "<userId>",
        "job_application_id": "<jobApplicationId>",
        "rating": 4,
        "comment": "Great work, very professional!",
        "created_at": "2025-05-13T18:00:00.000Z",
        "updated_at": "2025-05-13T18:00:00.000Z"
      }
    ]
  }
  // For jobseeker (authenticated)
  ```json
  {
    "id": "<userId>",
    "role": "jobseeker",
    "email": "test@example.com",
    "username": "test",
    "country": "US",
    "languages": ["English","German"],
    "skills": [
      {
        "id": "<skillId>",
        "name": "Web Development",
        "parent_id": "<parentSkillId>",
        "created_at": "2025-05-22T18:00:00.000Z",
        "updated_at": "2025-05-22T18:00:00.000Z"
      }
    ],
    "experience": "2 years",
    "linkedin": "https://www.linkedin.com/in/username",
    "instagram": "https://www.instagram.com/username",
    "facebook": "https://www.facebook.com/username",
    "description": "Experienced web developer specializing in React and Node.js",
    "portfolio": "https://portfolio.com",
    "video_intro": "https://video.com",
    "resume": "https://example.com/resume.pdf", // "/uploads/resumes/filename.pdf
    "timezone": "Europe/Moscow",
    "currency": "USD",
    "average_rating": 4.0,
    "profile_views": 10,
    "avatar": "https://example.com/avatar.jpg",
    "identity_verified": false,
    "reviews": [
      {
        "id": "<reviewId>",
        "reviewer_id": "<userId>",
        "reviewed_id": "<userId>",
        "job_application_id": "<jobApplicationId>",
        "rating": 4,
        "comment": "Great work, very professional!",
        "created_at": "2025-05-22T18:00:00.000Z",
        "updated_at": "2025-05-22T18:00:00.000Z"
      }
    ]
  }

- **Response (Error - 404, if user or profile not found)**: 
  ```json
  {
    "statusCode": 404,
    "message": "User not found",
    "error": "Not Found"
  }

- **Response (Error - 401, if user role is not supported)**: 
  ```json
  {
    "statusCode": 401,
    "message": "User role not supported",
    "error": "Unauthorized"
  }

### 7. Update Profile
- **Endpoint**: `PUT /api/profile`
- **Description**: Updates the authenticated user's profile based on their role.
- **Headers**: `Authorization: Bearer <token>` 
- **Request Body**:
  //For employer
  ```json
  {
    "role": "employer",
    "company_name": "Updated Company",
    "company_info": "Updated info",
    "country": "DE",
    "referral_link": "https://example.com/ref/updated",
    "timezone": "America/New_York",
    "currency": "EUR"
  }
  //For jobseeker
  ```json
  {
    "role": "jobseeker",
    "country": "DE",
    "languages": ["English","German"],
    "skillIds": ["<skillId1>", "<skillId2>"],
    "experience": "3 years",
    "linkedin": "https://www.linkedin.com/in/username",
    "instagram": "https://www.instagram.com/username",
    "facebook": "https://www.facebook.com/username",
    "description": "Experienced web developer specializing in React and Node.js",
    "portfolio": "https://newportfolio.com",
    "video_intro": "https://newvideo.com",
    "job_search_status": "actively_looking", // Optional
    "resume": "https://example.com/resume.pdf", // Optional, link to resume (for file use upload-resume)
    "timezone": "America/New_York",
    "currency": "EUR",
    "expected_salary": 4500.00
  }

- **Response (Success - 200): Returns the updated profile (same format as GET /api/profile)**

- **Response (Error - 401, if token is invalid or missing)**:
  ```json
  {
    "statusCode": 401,
    "message": "Invalid token",
    "error": "Unauthorized"
  }

- **Response (Error - 404, if user or profile not found)**:
  ```json
  {
    "statusCode": 404,
    "message": "User not found",
    "error": "Not Found"
  }

- **Response (Error - 401, if role mismatch)**:
  ```json
  {
    "statusCode": 401,
    "message": "User role mismatch",
    "error": "Unauthorized"
  }

### 8. Create Job Post
- **Endpoint**: `POST /api/job-posts`
- **Description**: Creates a new job post for an authenticated employer. Supports multiple categories via category_ids. salary may be null if salary_type = 'negotiable'
- **Headers**: `Authorization: Bearer <token>`
- **Request Body**:
  ```json
  {
    "title": "Software Engineer",
    "description": "We are looking for a skilled software engineer.",
    "location": "Remote",
    "salary": 50000,
    "status": "Active",
    "job_type": "Full-time",
    "salary_type": "per month",
    "excluded_locations": ["India"],
    "category_ids": ["<catId1>", "<catId2>"],   // NEW (multi)
    "category_id": "<catId1>",                   // deprecated (для совместимости)
    "aiBrief": "Build and maintain web apps"
  }
- **Response (Success - 200)**:
  ```json
  {
    "id": "<jobPostId>",
    "title": "Software Engineer",
    "description": "We are looking for a skilled software engineer.",
    "location": "Remote",
    "salary": 50000,
    "status": "Active",
    "job_type": "Full-time",
    "salary_type": "per month",
    "excluded_locations": ["India"],
    "pending_review": true,
    "category_id": "<categoryId>",                 // legacy
    "category": {
      "id": "<categoryId>",
      "name": "Software Development",
      "created_at": "2025-05-15T06:12:00.000Z",
      "updated_at": "2025-05-15T06:12:00.000Z"
    },
    "category_ids": ["<catId1>", "<catId2>"],      // NEW
    "categories": [                                // NEW
      { "id": "<catId1>", "name": "Software Development" },
      { "id": "<catId2>", "name": "DevOps" }
    ],
    "employer_id": "<employerId>",
    "employer": {
      "id": "<employerId>",
      "email": "employer100@example.com",
      "username": "jane_smith100",
      "role": "employer"
    },
    "views": 0,
    "required_skills": ["JavaScript", "TypeScript"],
    "slug": "software-engineer-remote",
    "slug_id": "software-engineer-remote--8df3b0be",
    "created_at": "2025-05-15T06:12:00.000Z",
    "updated_at": "2025-05-15T06:12:00.000Z"
  }
- **Response (Error - 400, if salary is missing and salary_type is not 'negotiable')**:
  ```json
  {
    "statusCode": 400,
    "message": "Salary is required unless salary_type is negotiable",
    "error": "Bad Request"
  }
- **Response (Error - 401, if token is invalid or missing)**:
  ```json
  {
    "statusCode": 401,
    "message": "Invalid token",
    "error": "Unauthorized"
  }
- **Response (Error - 401, if user is not an employer)**:
  ```json
  {
    "statusCode": 401,
    "message": "Only employers can create job posts",
    "error": "Unauthorized"
  }
- **Response (Error - 404, if user not found)**:
  ```json
  {
    "statusCode": 404,
    "message": "User not found",
    "error": "Not Found"
  }

### 9. Update Job Post
- **Endpoint**: `PUT /api/job-posts/:id`
- **Description**: Updates an existing job post for an authenticated employer. Salary is optional if salary_type is 'negotiable'.
- **Headers**: `Authorization: Bearer <token>` 
- **Request Body**::
  ```json
  {
    "title": "Senior Software Engineer",
    "description": "Updated description.",
    "location": "Remote",
    "salary": 60000,
    "status": "Active",
    "job_type": "Full-time",
    "salary_type": "per month",
    "excluded_locations": ["India"],
    "category_ids": ["<catId1>", "<catId2>"],  // NEW
    "category_id": "<catId1>"                  // deprecated
  }
- **Response (Success - 200)**:
  ```json
  {
    "id": "<jobPostId>",
    "title": "Senior Software Engineer",
    "description": "Updated description.",
    "location": "Remote",
    "salary": 60000,
    "status": "Active",
    "job_type": "Full-time",
    "salary_type": "per month",
    "excluded_locations": ["India"],
    "pending_review": false,

    "category_id": "<categoryId>",                  // legacy
    "category": {
      "id": "<categoryId>",
      "name": "Software Development",
      "created_at": "2025-05-15T06:12:00.000Z",
      "updated_at": "2025-05-15T06:12:00.000Z"
    },
    "category_ids": ["<catId1>", "<catId2>"],       // NEW
    "categories": [                                  // NEW
      { "id": "<catId1>", "name": "Software Development" },
      { "id": "<catId2>", "name": "DevOps" }
    ],

    "employer_id": "<employerId>",
    "employer": {
      "id": "<employerId>",
      "email": "employer100@example.com",
      "username": "jane_smith100",
      "role": "employer"
    },
    "views": 0,
    "required_skills": ["JavaScript", "TypeScript"],
    "slug": "senior-software-engineer-remote",
    "slug_id": "senior-software-engineer-remote--8df3b0be",
    "created_at": "2025-05-15T06:12:00.000Z",
    "updated_at": "2025-05-15T06:30:00.000Z"
  }
- **Response (Error - 400, if salary is missing and salary_type is not 'negotiable')**:
  ```json
  {
    "statusCode": 400,
    "message": "Salary is required unless salary_type is negotiable",
    "error": "Bad Request"
  }
- **Response (Error - 401, if token is invalid or missing)**:
  ```json
  {
    "statusCode": 401,
    "message": "Invalid token",
    "error": "Unauthorized"
  }
- **Response (Error - 404, if job post not found or user does not have permission)**:
  ```json
  {
    "statusCode": 404,
    "message": "Job post not found or you do not have permission to update it",
    "error": "Not Found"
  }

### 9.1 Generate Job Description (AI)
- **Endpoint**: `POST /api/job-posts/generate-description`
- **Description**: Generates a job description using AI based on a brief (for employers only). If salary_type is 'negotiable', salary can be omitted and description will show "Negotiable".
- **Headers**: `Authorization: Bearer <token>` (Required for employers)
- **Request Body**::
  ```json
  {
    "aiBrief": "Need Python developer with 3 years experience for web app. Skills: Django, SQL."
  }
- **Response (Success - 200)**::
  ```json
  {
    "description": "<html_formatted_description>"
  }
- **Response (Error - 400, if aiBrief missing)**:
  ```json
  {
    "statusCode": 400,
    "message": "AI brief is required",
    "error": "Bad Request"
  }

- **Response (Error - 500, AI fail)**:
  ```json
  {
    "statusCode": 500,
    "message": "Failed to generate description with AI",
    "error": "Internal Server Error"
  }

### 10. Get Job Post
- **Endpoint**: `GET /api/job-posts/:id`
- **Description**: Retrieves a specific job post by ID. If salary_type is 'negotiable', salary can be null and UI should display "Negotiable".
- **Request Parameters**: `id`: The ID of the job post.
- **Response (Success - 200)**:
  ```json
  {
    "id": "<jobPostId>",
    "title": "Software Engineer",
    "description": "Develop and maintain web applications.",
    "location": "Remote",
    "salary": null,
    "status": "Active",
    "job_type": "Full-time",
    "salary_type": "negotiable",
    "excluded_locations": ["India"],
    "pending_review": false,

    "category_id": "<categoryId>",                 // legacy
    "category": { "id": "<categoryId>", "name": "Development" },
    "category_ids": ["<catId1>", "<catId2>"],      // NEW
    "categories": [                                 // NEW
      { "id": "<catId1>", "name": "Development" },
      { "id": "<catId2>", "name": "Writing" }
    ],

    "employer_id": "<userId>",
    "employer": {
      "id": "<userId>",
      "username": "employer1",
      "email": "employer@example.com",
      "role": "employer"
    },
    "views": 10,
    "slug": "software-engineer-remote",
    "slug_id": "software-engineer-remote--8df3b0be",
    "created_at": "2025-07-08T07:00:00.000Z",
    "updated_at": "2025-07-08T07:00:00.000Z"
  }
- **Response (Error - 404, if job post not found)**:  
  ```json
  {
    "statusCode": 404,
    "message": "Job post not found",
    "error": "Not Found"
  }

### 10.1 Get Job Post by Slug or ID
- **Endpoint**: `GET /api/job-posts/by-slug-or-id/:slugOrId`
- **Description**: Возвращает вакансию по slug_id, slug или по UUID id. Приоритет: slug_id → slug → id.
- **Request Parameters**: `id`: The ID of the job post.
- **Response (Success - 200)**:
  ```json
  {
    "id": "<jobPostId>",
    "title": "Software Engineer",
    "description": "Develop and maintain web applications.",
    "location": "Remote",
    "salary": null,
    "status": "Active",
    "category_id": "<catId1>",                    // legacy
    "category_ids": ["<catId1>", "<catId2>"],     // NEW
    "categories": [
      { "id": "<catId1>", "name": "Development" },
      { "id": "<catId2>", "name": "Writing" }
    ],
    "job_type": "Full-time",
    "salary_type": "negotiable",
    "employer_id": "<userId>",
    "views": 10,
    "pending_review": false,
    "slug": "software-engineer-remote",
    "slug_id": "software-engineer-remote--8df3b0be",
    "created_at": "2025-07-08T07:00:00.000Z",
    "updated_at": "2025-07-08T07:00:00.000Z"
  }
- **Response (Error - 404, if job post not found)**:  
  ```json
  {
    "statusCode": 404,
    "message": "Job post not found",
    "error": "Not Found"
  }

### 11. Get Job Posts by Employer
- **Endpoint**: `GET /api/job-posts/my-posts`
- **Description**: Retrieves all job posts created by the authenticated employer.
- **Headers**: `Authorization: Bearer <token>`
- **Response (Success - 200)**:  
  ```json
  [
    {
      "id": "<jobPostId>",
      "title": "Senior Software Engineer",
      "description": "Updated description.",
      "location": "Remote",
      "salary": 60000,
      "salary_type": "per month",
      "excluded_locations": ["India"],
      "status": "Closed",
      "job_type": "Full-time",
      "pending_review": false,
      "category_id": "<categoryId>",                 // legacy
      "category": {
        "id": "<categoryId>",
        "name": "Software Development",
        "created_at": "2025-05-13T18:00:00.000Z",
        "updated_at": "2025-05-13T18:00:00.000Z"
      },
      "category_ids": ["<catId1>", "<catId2>"],      // NEW
      "categories": [                                 // NEW
        { "id": "<catId1>", "name": "Software Development" },
        { "id": "<catId2>", "name": "DevOps" }
      ],

      "employer_id": "<userId>",
      "employer": {
        "id": "<userId>",
        "email": "test15@example.com",
        "username": "test15",
        "role": "employer"
      },
      "created_at": "2025-05-13T18:00:00.000Z",
      "updated_at": "2025-05-13T18:30:00.000Z"
    }
  ]
- **Response (Error - 401, if token is invalid or missing)**:
  ```json
  {
    "statusCode": 401,
    "message": "Invalid token",
    "error": "Unauthorized"
  }
- **Response (Error - 401, if user is not an employer)**:
  ```json
  {
    "statusCode": 401,
    "message": "Only employers can view their job posts",
    "error": "Unauthorized"
  }
- **Response (Error - 404, if user not found)**:
  ```json
  {
    "statusCode": 404,
    "message": "User not found",
    "error": "Not Found"
  }

### 12. Create Category (Admin)
- **Endpoint**: `POST /api/admin/categories`
- **Description**: Create a new category or subcategory for job posts and jobseeker skills. Admins only.
- **Headers**: `Authorization: Bearer <token>`
- **Request Body**:
  ```json
  {
    "name": "Software Development",
    "parentId": "<parentCategoryId>" // optional
  }
- **Response (Success - 201)**:
  ```json
  {
    "id": "<categoryId>",
    "name": "Software Development",
    "parent_id": "<parentCategoryId>",
    "created_at": "2025-05-13T18:00:00.000Z",
    "updated_at": "2025-05-13T18:00:00.000Z"
  }
- **Response (Error - 400 Bad Request — name missing)**:
  ```json
  {"statusCode": 400, "message": "Category name is required", "error": "Bad Request"}
- **Response (Error - 400 Bad Request — duplicate name)**:
  ```json
  {"statusCode": 400, "message": "Category with this name already exists", "error": "Bad Request"}
- **Response (Error - 400 Bad Request — parent not found)**:
  ```json
  {"statusCode": 400, "message": "Parent category not found", "error": "Bad Request"}
- **Response (Error - 401 Unauthorized — missing/malformed token or invalid token)**:
  ```json
  {"statusCode": 401, "message": "Invalid token", "error": "Unauthorized"}
- **Response (Error - 403 Forbidden — not an admin)**:
  ```json
  {"statusCode": 403, "message": "Forbidden resource", "error": "Forbidden"}

### 13. Get Categories (Admin)
- **Endpoint**: `GET /api/admin/categories`
- **Description**: Retrieve all categories in a hierarchical tree structure. Admins only.
- **Headers**: `Authorization: Bearer <token>`
- **Response (Success - 200)**:
  ```json
  [
    {
      "id": "<categoryId>",
      "name": "Office and Admin",
      "parent_id": null,
      "created_at": "2025-05-13T18:00:00.000Z",
      "updated_at": "2025-05-13T18:00:00.000Z",
      "subcategories": [
        {
          "id": "<subcategoryId>",
          "name": "Virtual Assistant",
          "parent_id": "<categoryId>",
          "created_at": "2025-05-13T18:00:00.000Z",
          "updated_at": "2025-05-13T18:00:00.000Z",
          "subcategories": []
        }
      ]
    }
  ]
- **Response (Error - 401 Unauthorized — missing/malformed token or invalid token)**:
  ```json
  {"statusCode": 401, "message": "Invalid token", "error": "Unauthorized"}
- **Response (Error - 403 Forbidden — not an admin)**:
  ```json
  {"statusCode": 403, "message": "Forbidden resource", "error": "Forbidden"}

### 13.1 Search Categories (Admin)
- **Endpoint**: `GET /api/admin/categories/search`
- **Description**: Search categories by name (partial, case-insensitive). Admins only.
- **Headers**: `Authorization: Bearer <token>`
- **Query Parameters**: `term` (string, required): Search term for category names.
- **Example Request**: `/api/admin/categories/search?term=Web`
- **Response (Success - 200)**:
  ```json
  [
    {
      "id": "<categoryId>",
      "name": "Web Development",
      "parent_id": "<parentCategoryId>",
      "created_at": "2025-05-13T18:00:00.000Z",
      "updated_at": "2025-05-13T18:00:00.000Z"
    }
  ]
- **Response (Error - 400 Bad Request — missing term)**:
  ```json
  {"statusCode": 400, "message": "Search term is required", "error": "Bad Request"}
- **Response (Error - 401 Unauthorized — missing/malformed token or invalid token)**:
  ```json
  {"statusCode": 401, "message": "Invalid token", "error": "Unauthorized"}
- **Response (Error - 403 Forbidden — not an admin)**:
  ```json
  {"statusCode": 403, "message": "Forbidden resource", "error": "Forbidden"}

### 13.2. Get Categories (Public)
- **Endpoint**: `GET /api/categories`
- **Description**: Returns the hierarchical tree of categories. Optionally includes the total number of active, approved job posts per category (including all descendants).
- **Headers**: None
- **Query Parameters (optional)**:
  - `includeCounts` — true|false (default false). When true, each category object includes jobs_count.
  - `onlyTopLevel` — true|false (default false). When true, returns only root categories (useful for the homepage widget).
- **Response (200) — when includeCounts=true**:
  ```json
  [
    {
      "id": "<categoryId>",
      "name": "Office and Admin",
      "parent_id": null,
      "created_at": "2025-05-13T18:00:00.000Z",
      "updated_at": "2025-05-13T18:00:00.000Z",
      "jobs_count": 124,
      "subcategories": [
        {
          "id": "<subcategoryId>",
          "name": "Virtual Assistant",
          "parent_id": "<categoryId>",
          "created_at": "2025-05-13T18:00:00.000Z",
          "updated_at": "2025-05-13T18:00:00.000Z",
          "jobs_count": 37,
          "subcategories": []
        }
      ]
    }
  ]

### 13.3. Search Categories (Public)
- **Endpoint**: `GET /api/categories/search`
- **Description**: Searches categories by name (partial match, case-insensitive), accessible to all users (including unauthenticated).
- **Headers**: `Authorization: Bearer <token>`
- **Query Parameters**: `term` (string, required): Search term for category names.
- **Example Request**: `/api/categories/search?term=Web`
- **Response (Success - 200)**:
  ```json
  [
    {
      "id": "<categoryId>",
      "name": "Web Development",
      "parent_id": "<parentCategoryId>",
      "created_at": "2025-05-13T18:00:00.000Z",
      "updated_at": "2025-05-13T18:00:00.000Z"
    }
  ]
- **Response (Error - 400, if search term is missing)**:
    ```json
  {
    "statusCode": 400,
    "message": "Search term is required",
    "error": "Bad Request"
  }

### 13.4. Delete Category (Admin)
- **Endpoint**: `DELETE /api/admin/categories/:id`
- **Description**: Delete a specific category or subcategory. The operation: Fails if the category has subcategories. Sets `category_id` to `null` for any job posts still referencing this category (legacy field handling). Removes the category from all jobseeker profiles’ `skills` where present.  
**Admins only.**
- **Headers**: `Authorization: Bearer <token>`
- **Request Parameters**: `id` (string, required): The ID of the category to delete.
- **Response (Success - 200)**:
  ```json
  { "message": "Category successfully deleted" }
- **Response (Error - 400 Bad Request — category has subcategories)**:
  ```json
  {"statusCode": 400, "message": "You cannot delete a category that contains subcategories. First remove subcategories.", "error": "Bad Request"}
- **Response (Error - 401 Unauthorized — missing/malformed token or invalid token)**:
  ```json
  {"statusCode": 401, "message": "Invalid token", "error": "Unauthorized"}
- **Response (Error - 403 Forbidden — not an admin)**:
  ```json
  {"statusCode": 403, "message": "Forbidden resource", "error": "Forbidden"}
- **Response (Error - 404 Not Found — category does not exist)**:
  ```json
  {"statusCode": 404, "message": "Category not found", "error": "Not Found"}

### 14. Apply to Job Post
- **Endpoint**: `POST /api/job-applications`
- **Description**: Allows a jobseeker to apply to a job post. Applications are limited per job post (default: 100) and distributed cumulatively over 4 days (60%, 80%, 90%, 100%). If the daily limit is reached, a "Daily application limit reached" error is returned. If the total limit is reached, a "Job full" error is returned. Applicants from excluded_locations are blocked.
- **Headers**: `Authorization: Bearer <token>`
- **Request Body**:
  ```json
  {
    "job_post_id": "<jobPostId>",
    "cover_letter": "Why I'm a good fit...",
    "relevant_experience": "Describe relevant experience (companies, roles, stack, achievements...)",
    "full_name": "Jane Mary Doe",
    "referred_by": "Alex Petrov / john@company.com"
  }
- **Response (Success - 200)**:
  ```json
  {
    "id": "<applicationId>",
    "job_post_id": "<jobPostId>",
    "job_seeker_id": "<userId>",
    "status": "Pending",
    "cover_letter": "Why I'm a good fit...",
    "relevant_experience": "Describe relevant experience...",
    "full_name": "Jane Mary Doe",
    "referred_by": "Alex Petrov / john@company.com",
    "created_at": "2025-09-25T12:00:00.000Z",
    "updated_at": "2025-09-25T12:00:00.000Z"
  }
- **Response (Error - 400, if daily limit reached)**:
  ```json
  {
    "statusCode": 400,
    "message": "Daily application limit reached",
    "error": "Bad Request"
  }
- **Response (Error - 400, if location excluded)**:
  ```json
  {
    "statusCode": 400,
    "message": "Applicants from your location are not allowed",
    "error": "Bad Request"
  }
- **Response (Error - 401, if token is invalid or missing)**:
  ```json
  {
    "statusCode": 401,
    "message": "Invalid token",
    "error": "Unauthorized"
  }
- **Response (Error - 401, if user is not a jobseeker)**:  
  ```json
  {
    "statusCode": 401,
    "message": "Only jobseekers can apply to job posts",
    "error": "Unauthorized"
  }
- **Response (Error - 404, if job post not found)**: 
  ```json
  {
    "statusCode": 404,
    "message": "Job post not found",
    "error": "Not Found"
  }
- **Response (Error - 400, if job post is not active)**: 
  ```json
  {
    "statusCode": 400,
    "message": "Cannot apply to a job post that is not active",
    "error": "Bad Request"
  }
- **Response (Error - 400, if user already applied)**: 
  ```json
  {
    "statusCode": 400,
    "message": "You have already applied to this job post",
    "error": "Bad Request"
  }
- **Response (Error - 400, if application limit reached)**: 
  ```json
  {
    "statusCode": 400,
    "message": "Job full",
    "error": "Bad Request"
  }
- **Response (Error - 400, if application period ended)**: 
  ```json
  {
    "statusCode": 400,
    "message": "Application period has ended",
    "error": "Bad Request"
  }

### 15. Close Job Post
- **Endpoint**: `POST /api/job-posts/:id/close`
- **Description**: Closes a job post (sets status to "Closed"). Only the employer who created the job can close it.
- **Headers**: `Authorization: Bearer <token>`
- **Request Parameters**: `id`: The ID of the job post.
- **Response (Success - 200)**: 
  ```json
  {
    "id": "<jobPostId>",
    "title": "Software Engineer",
    "description": "We are looking for a skilled software engineer...",
    "location": "Remote",
    "salary": 50000,
    "status": "Closed",
    "category_id": "<categoryId>",
    "job_type": "Full-time",
    "employer_id": "<userId>",
    "applicationLimit": 100,
    "created_at": "2025-05-15T05:13:00.000Z",
    "updated_at": "2025-05-15T05:13:00.000Z"
  }

- **Response (Error - 404, if job post not found)**: 
  ```json
  {
    "statusCode": 404,
    "message": "Job post not found or you do not have permission to close it",
    "error": "Not Found"
  }

- **Response (Error - 400, if already closed)**: 
  ```json
  {
    "statusCode": 400,
    "message": "Job post is already closed",
    "error": "Bad Request"
  }

### 16. Get My Applications (Jobseeker)
- **Endpoint**: `GET /api/job-applications/my-applications`
- **Description**: Retrieves all applications submitted by the authenticated jobseeker.
- **Headers**: `Authorization: Bearer <token>`
- **Response (Success - 200)**: 
  ```json
  [
  {
    "id": "<applicationId>",
    "job_post_id": "<jobPostId>",
    "job_seeker_id": "<userId>",
    "status": "Pending",
    "job_post": {
      "id": "<jobPostId>",
      "title": "Software Engineer",
      "description": "We are looking for a skilled software engineer...",
      "location": "Remote",
      "salary": 50000,
      "status": "Active",
      "category_id": "<categoryId>",
      "employer_id": "<employerId>",
      "created_at": "2025-05-13T18:00:00.000Z",
      "updated_at": "2025-05-13T18:00:00.000Z"
    },
    "job_seeker": {
      "id": "<userId>",
      "email": "jobseeker1@example.com",
      "username": "jobseeker1",
      "role": "jobseeker"
    },
    "created_at": "2025-05-13T18:00:00.000Z",
    "updated_at": "2025-05-13T18:00:00.000Z"
  }
  ]

- **Response (Error - 401, if token is invalid or missing)**: 
  ```json
  {
    "statusCode": 401,
    "message": "Invalid token",
    "error": "Unauthorized"
  }

- **Response (Error - 401, if user is not a jobseeker)**: 
  ```json
  {
    "statusCode": 401,
    "message": "Only jobseekers can view their applications",
    "error": "Unauthorized"
  }

- **Response (Error - 404, if user not found)**:   
  ```json
  {
    "statusCode": 404,
    "message": "User not found",
    "error": "Not Found"
  }

### 17. Get Applications for Job Post (Employer)
- **Endpoint**: `GET /api/job-applications/job-post/:id`
- **Description**: Retrieves all applications for a specific job post, accessible only to the employer who created the job post.
- **Headers**: `Authorization: Bearer <token>`
- **Path Parameters**: 
  - `id` (string, required): The ID of the job post.
- **Response (Success - 200)**:  
  ```json
  [
    {
      "applicationId": "<applicationId>",
      "userId": "<jobseekerId>",
      "username": "john_doe107",
      "email": "jobseeker107@example.com",
      "jobDescription": "Experienced web developer with 5 years in React.",
      "coverLetter": "I am excited to apply for this position...",
      "fullName": "Jane Mary Doe",
      "referredBy": "Alex Petrov",
      "appliedAt": "2025-05-15T06:12:00.000Z",
      "status": "Pending",
      "job_post_id": "<jobPostId>"
    }
  ]

- **Response (Error - 401, if token is invalid or missing)**:  
  ```json
  {
    "statusCode": 401,
    "message": "Invalid token",
    "error": "Unauthorized"
  }

- **Response (Error - 401, if user is not the employer of this job post)**:   
  ```json
  {
    "statusCode": 401,
    "message": "Only employers can view applications for their job posts",
    "error": "Unauthorized"
  }

- **Response (Error - 404, if job post not found or user does not have permission)**:   
  ```json
  {
    "statusCode": 404,
    "message": "Job post not found or you do not have permission to view its applications",
    "error": "Not Found"
  }

### 17.1 Get Application by ID (Employer/Admin/Moderator)
- **Endpoint**: `GET /api/job-applications/:id`
- **Description**: Retrieves details of a specific job application by ID. Accessible to employers (who own the job post), admins, or moderators.
- **Headers**: `Authorization: Bearer <token>`
- **Request Parameters**: `id`: The ID of the job application.
- **Response (Success - 200)**:
  ```json
  {
    "applicationId": "<applicationId>",
    "userId": "<jobseekerId>",
    "username": "john_doe",
    "email": "john@example.com",
    "jobDescription": "Experienced web developer with 5 years in React",
    "coverLetter": "I am excited to apply for this position...",
    "appliedAt": "2025-05-15T06:12:00.000Z",
    "status": "Pending",
    "job_post_id": "<jobPostId>",
    "job_post": {
      "id": "<jobPostId>",
      "title": "Software Engineer",
      "status": "Active"
    }
  }
- **Response (Error - 401, if token is invalid or missing)**:
  ```json
  {
    "statusCode": 401,
    "message": "Invalid token",
    "error": "Unauthorized"
  }
- **Response (Error - 401, if user does not have permission)**:
  ```json
  {
    "statusCode": 401,
    "message": "Only employers, admins, or moderators can view application details",
    "error": "Unauthorized"
  }
- **Response (Error - 401, if employer does not own the job post)**:
  ```json
  {
    "statusCode": 401,
    "message": "You do not have permission to view this application",
    "error": "Unauthorized"
  }
- **Response (Error - 404, if application not found)**:
  ```json
  {
    "statusCode": 404,
    "message": "Application not found",
    "error": "Not Found"
  }

### 18. Update Application Status (Employer)
- **Endpoint**: `PUT /api/job-applications/:id`
- **Description**: Updates the status of a job application, accessible only to the employer who created the job post.
- **Headers**: `Authorization: Bearer <token>`  
- **Request Parameters**: `id`: The ID of the job application
- **Note**: Only one application can be set to "Accepted" per job post. When an application is accepted, the job post is automatically closed (status set to "Closed"). **All other applications with status "Pending" for the same job post are automatically set to "Rejected".
- **Request Body**:   
  ```json
  {
    "status": "Accepted" // or "Rejected"
  }
- **Response (Success - 200)**: 
  ```json
  {
    "id": "<applicationId>",
    "job_post_id": "<jobPostId>",
    "job_seeker_id": "<userId>",
    "status": "Accepted",
    "created_at": "2025-05-13T18:00:00.000Z",
    "updated_at": "2025-05-13T18:30:00.000Z"
  }

- **Response (Success - 400)**: 
  ```json
  {
    "statusCode": 400,
    "message": "Only one application can be accepted per job post",
    "error": "Bad Request"
  }    

- **Response (Error - 401, if token is invalid or missing)**:   
  ```json
  {
    "statusCode": 401,
    "message": "Invalid token",
    "error": "Unauthorized"
  }

- **Response (Error - 401, if user is not an employer)**:     
  ```json
  {
    "statusCode": 401,
    "message": "Only employers can update application status",
    "error": "Unauthorized"
  }

- **Response (Error - 401, if user does not have permission)**:
  ```json
  {
    "statusCode": 401,
    "message": "You do not have permission to update this application",
    "error": "Unauthorized"
  }

- **Response (Error - 401, if user does not have permission)**:
  ```json
  {
    "statusCode": 404,
    "message": "Application not found",
    "error": "Not Found"
  }

### 19. Get All Job Posts
- **Endpoint**: `GET /api/job-posts`
- **Description**: Searches for active and approved job posts with optional filters. If salary_type is 'negotiable', salary can be null and UI should display "Negotiable".
- **Query Parameters**:
  - `title` (string, optional): Filter by job title (partial match).
  - `location` (string, optional): Filter by location (partial match).
  - `job_type` (string, optional): Filter by job type ("Full-time", "Part-time", "Project-based").
  - `salary_min` (optional): Filter by minimum salary (ignored if salary_type is 'negotiable').
  - `salary_max` (optional): Filter by maximum salary (ignored if salary_type is 'negotiable').
  - `salary_type` (optional): Filter by salary type ('per hour', 'per month', 'negotiable').
  - `category_ids` (array или comma-list, optional): Filter by category ID. Примеры: ?category_ids[]=<id1>&category_ids[]=<id2> или ?category_ids=<id1>,<id2>
  - `required_skills` (string or string[], optional): Filter by required skills (e.g., "required_skills=JavaScript" or "required_skills[]=JavaScript&required_skills[]=Python").
  - `page` (number, optional): Page number for pagination (default: 1).
  - `limit` (number, optional): Number of items per page (default: 10).
  - `sort_by` (string, optional): Field to sort by ("created_at" or "salary", default: "created_at").
  - `sort_order` (string, optional): Sort order ("ASC" or "DESC", default: "DESC").
- **Example Request**: `/api/job-posts?title=Engineer&location=Remote&job_type=Full-time&category_ids=<id1>,<id2>&salary_type=per%20hour`
- **Response (Success - 200)**:
  ```json
  {
    "total": 50,
    "data": [
      {
        "id": "<jobPostId>",
        "title": "Software Engineer",
        "description": "Develop and maintain web applications.",
        "location": "Remote",
        "salary": null,
        "status": "Active",
        "job_type": "Full-time",
        "salary_type": "negotiable",
        "excluded_locations": ["India"],
        "pending_review": false,

        "category_id": "<catId1>",                    // legacy
        "category": { "id": "<catId1>", "name": "Development" },
        "category_ids": ["<catId1>", "<catId2>"],     // NEW
        "categories": [                                // NEW
          { "id": "<catId1>", "name": "Development" },
          { "id": "<catId2>", "name": "Writing" }
        ],

        "employer_id": "<userId>",
        "employer": {
          "id": "<userId>",
          "username": "employer1",
          "email": "employer@example.com",
          "role": "employer"
        },
        "views": 10,
        "slug": "software-engineer-remote",
        "slug_id": "software-engineer-remote--8df3b0be",
        "created_at": "2025-07-08T07:00:00.000Z",
        "updated_at": "2025-07-08T07:00:00.000Z"
      }
    ]
  }

### 20. Create Review
- **Endpoint**: `POST /api/reviews`
- **Description**: Creates a review (status = Pending). Appears publicly only after admin approval.
- **Headers**: `Authorization: Bearer <token>`
- **Response (Success - 200)**:
  ```json
  {
    "id": "<reviewId>",
    "reviewer_id": "<userId>",
    "reviewed_id": "<userId>",
    "job_application_id": "<jobApplicationId>",
    "rating": 4,
    "comment": "Great work, very professional!",
    "status": "Pending",
    "created_at": "2025-05-13T18:00:00.000Z",
    "updated_at": "2025-05-13T18:00:00.000Z"
  }

- **Response (Error - 401, if token is invalid or missing)**:
  ```json
  {
    "statusCode": 401,
    "message": "Invalid token",
    "error": "Unauthorized"
  }

- **Response (Error - 401, if user does not have permission)**:
  ```json
  {
    "statusCode": 401,
    "message": "You can only leave reviews for your own job applications",
    "error": "Unauthorized"
  }

- **Response (Error - 400, if job application is not accepted)**:
  ```json
  {
    "statusCode": 400,
    "message": "Reviews can only be left for accepted job applications",
    "error": "Bad Request"
  }

- **Response (Error - 400, if rating is invalid)**:
  ```json
  {
    "statusCode": 400,
    "message": "Rating must be between 1 and 5",
    "error": "Bad Request"
  }

- **Response (Error - 400, if review already exists)**:
  ```json
  {
    "statusCode": 400,
    "message": "You have already left a review for this job application",
    "error": "Bad Request"
  }

- **Response (Error - 404, if job application not found)**:
  ```json
  {
    "statusCode": 404,
    "message": "Job application not found",
    "error": "Not Found"
  }

### 21. Get Reviews for User
- **Endpoint**: `GET /api/reviews/user/:id`
- **Description**: Returns only Approved reviews for the user.
- **Headers**: `Authorization: Bearer <token>`
- **Request Parameters**: `id`: The ID of the user
- **Response (Success - 200)**:
  ```json
  [
  {
    "id": "<reviewId>",
    "reviewer_id": "<userId>",
    "reviewed_id": "<userId>",
    "job_application_id": "<jobApplicationId>",
    "rating": 4,
    "comment": "Great work, very professional!",
    "reviewer": {
      "id": "<userId>",
      "email": "employer4@example.com",
      "username": "employer4",
      "role": "employer"
    },
    "job_application": {
      "id": "<jobApplicationId>",
      "job_post_id": "<jobPostId>",
      "job_seeker_id": "<userId>",
      "status": "Accepted"
    },
    "created_at": "2025-05-13T18:00:00.000Z",
    "updated_at": "2025-05-13T18:00:00.000Z"
  }
  ]

- **Response (Error - 404, if user not found)**:
  ```json
  {
    "statusCode": 404,
    "message": "User not found",
    "error": "Not Found"
  }

### 22. Get All Users (Admin/Moderator)
- **Endpoint**: `GET /api/admin/users`
- **Endpoint**: `GET /api/moderator/users`
- **Description**: Returns a paginated list of users with optional filters. Search by `username`, `email`, and `id` is combined with **OR** (a match on any of these fields is enough).
- **Headers**: `Authorization: Bearer <token>`
- **Query Parameters**:
  - `username` (string, optional): Partial, case-insensitive match on username.
  - `email` (string, optional): Partial, case-insensitive match on email.
  - `id` (string, optional): Exact match on user ID.
  - `createdAfter` (string, optional): ISO date (e.g., `YYYY-MM-DD`). Users created **on or after** this date.  
    - **400 Bad Request** if the date is invalid.
  - `role` (string, optional): `employer` \| `jobseeker` \| `admin` \| `moderator`.
  - `status` (string, optional): `active` \| `blocked`.
  - `page` (number, optional): Page number (default: `1`).
    - **400 Bad Request** if not a positive integer.
  - `limit` (number, optional): Items per page (default: `10`).
    - **400 Bad Request** if not a positive integer.
- **Example Request**:
  `GET /api/admin/users?username=test&email=example.com&id=123&createdAfter=2025-01-01&role=jobseeker&status=active&page=1&limit=10`
- **Response (Success - 200)**:
  ```json
  {
    "total": 42,
    "data": [
      {
        "id": "<userId>",
        "email": "test@example.com",
        "username": "test",
        "role": "jobseeker",
        "status": "active",
        "risk_score": 0,
        "created_at": "2025-05-13T18:00:00.000Z",
        "last_seen_at": "2025-09-03T10:17:42.000Z",
        "brand": null
      }
    ]
  }
- **Response (401 Unauthorized — missing/malformed token or invalid token)**:
  ```json
  {"statusCode": 401, "message": "Invalid token", "error": "Unauthorized"}
- **Response (403 Forbidden — authenticated but not an admin/moderator)**:
  ```json
  {"statusCode": 403, "message": "Forbidden resource", "error": "Forbidden"}
- **Response (400 Bad Request — invalid query parameters)**:
  ```json
  { "statusCode": 400, "message": "Page must be a positive integer", "error": "Bad Request" }
  { "statusCode": 400, "message": "Limit must be a positive integer", "error": "Bad Request" }
  { "statusCode": 400, "message": "Invalid createdAfter date format", "error": "Bad Request" }


### 23. Get User by ID (Admin/Moderator)
- **Endpoint**: `GET /api/admin/users/:id`
- **Endpoint**: `GET /api/moderator/users/:id`
- **Description**: Retrieve a single user by ID.
- **Headers**: `Authorization: Bearer <token>`
- **Request Parameters**: `id` (string, required): User ID.
- **Response (Success - 200)**:
  ```json
  {
    "id": "<userId>",
    "email": "test@example.com",
    "username": "test",
    "role": "employer",
    "status": "active",
    "provider": null,
    "risk_score": 0,
    "brand": null,
    "created_at": "2025-05-13T18:00:00.000Z",
    "last_seen_at": "2025-09-03T10:17:42.000Z",
    "updated_at": "2025-05-13T18:00:00.000Z"
  }
- **Response (Error - 401 Unauthorized — missing/malformed token or invalid token)**:
  ```json
  {"statusCode": 401, "message": "Invalid token", "error": "Unauthorized"}
- **Response (Error - 403 Forbidden — authenticated but not an admin/moderator)**:
  ```json
  {"statusCode": 403, "message": "Forbidden resource", "error": "Forbidden"}
- **Response (Error - 404 Not Found — user does not exist)**:
  ```json
  {"statusCode": 404, "message": "User not found", "error": "Not Found"}

### 24. Update User (Admin)
- **Endpoint**: `PUT /api/admin/users/:id`
- **Description**: Update a specific user’s basic fields. Admins only.
- **Headers**: `Authorization: Bearer <token>`
- **Request Parameters**: `id` (string, required): User ID.
- **Request Body**: 
  ```json
  {
    "email": "updated@example.com",
    "username": "updatedUser",
    "role": "jobseeker"
  }
- **Response (Success - 200)**: 
  ```json
  {
    "id": "<userId>",
    "email": "updated@example.com",
    "username": "updatedUser",
    "role": "jobseeker",
    "status": "active",
    "provider": null,
    "risk_score": 0,
    "brand": null,
    "created_at": "2025-05-13T18:00:00.000Z",
    "last_seen_at": "2025-09-03T10:17:42.000Z",
    "updated_at": "2025-05-13T18:30:00.000Z"
  }
- **Response (Error - 401 Unauthorized — missing/malformed token or invalid token)**: 
  ```json
  {"statusCode": 401, "message": "Invalid token", "error": "Unauthorized"}
- **Response (Error - 403 Forbidden — authenticated but not an admin)**: 
  ```json
  {"statusCode": 403, "message": "Forbidden resource", "error": "Forbidden"}
- **Response (Error - 404 Not Found — user does not exist)**: 
  ```json
  {"statusCode": 404, "message": "User not found", "error": "Not Found"}  

### 25. Delete User (Admin)
- **Endpoint**: `DELETE /api/admin/users/:id`
- **Description**: Deletes a specific user (admin only).
- **Headers**: `Authorization: Bearer <token>`
- **Request Parameters**: `id`: The ID of the user.
- **Response (Success - 200)**: 
  ```json
  {"message": "User deleted successfully"}
- **Response (Error - 401 Unauthorized — missing/malformed token or invalid token)**: 
  ```json
  {"statusCode": 401,"message": "Invalid token","error": "Unauthorized"}
- **Response (Error - 403 Forbidden — authenticated but not an admin)**: 
  ```json
  {"statusCode": 403,"message": "Forbidden resource","error": "Forbidden"}
- **Response (Error - 404 Not Found — user does not exist)**: 
  ```json
  {"statusCode": 404,"message": "User not found","error": "Not Found"}  
- **Response (Error - 400 Bad Request — deletion failed due to an internal error (wrapped by the service))**: 
  ```json
  {"statusCode": 400,"message": "Failed to delete user: <reason>","error": "Bad Request"}    

### 26. Reset User Password (Admin/Moderator)
- **Endpoint**: `POST /api/admin/users/:id/reset-password`
- **Endpoint**: `POST /api/moderator/users/:id/reset-password`
- **Description**: Resets the password for a specific user. Admins and moderators only.
- **Headers**: `Authorization: Bearer <token>`
- **Request Parameters**: `id`: The ID of the user.
- **Request Body**: 
  ```json
  {"newPassword": "newpassword123"}
- **Response (Success - 200)**:
  ```json
  {"message": "Password reset successful"}
- **Response (Error - 404, if user not found)**:
  ```json
  {"statusCode": 404,"message": "User not found","error": "Not Found"}
- **Response (Error - 401 Unauthorized — missing/malformed token or invalid token)**:
  ```json
  {"statusCode": 401,"message": "Invalid token","error": "Unauthorized"}
- **Response (Error - 403 Forbidden — authenticated but not an admin/moderator)**:
  ```json
  {"statusCode": 403,"message": "Forbidden resource","error": "Forbidden"}  

### 27. Get All Job Posts (Admin/Moderator)
- **Endpoint**: `GET /api/admin/job-posts`
- **Endpoint**: `GET /api/moderator/job-posts`
- **Description**: Returns job posts with optional filtering and pagination. Includes total count and paginated data. Sorting is fixed to `created_at DESC`.
- **Headers**: `Authorization: Bearer <token>`
- **Query Parameters**:
  - `status` (string, optional): `Active` | `Draft` | `Closed`.
  - `pendingReview` (string, optional): `'true'` or `'false'`. When provided, filters by `pending_review`.
  - `title` (string, optional): Partial, case-insensitive match on job title.
  - `employer_id` (string, optional): Filter by employer user ID.
  - `employer_username` (string, optional): Partial, case-insensitive match on employer username.
  - `category_id` (string, optional): **Deprecated** (single category; still supported for legacy requests).
  - `category_ids` (array or comma-separated string, optional): Multiple categories.  
    Examples:
    - `?category_ids[]=<id1>&category_ids[]=<id2>`
    - `?category_ids=<id1>,<id2>`
  - `id` (string, optional): Exact match on job post ID.
  - `salary_type` (string, optional): `per hour` | `per month` | `negotiable`.
  - `page` (number, optional): Page number (default: `1`).  
    - **400 Bad Request** if not a positive integer.
  - `limit` (number, optional): Items per page (default: `10`).  
    - **400 Bad Request** if not a positive integer.
- **Example Request**: `GET /api/admin/job-posts?status=Active&pendingReview=false&title=Software&employer_id=<employerId>&employer_username=john&category_ids=<cat1>,<cat2>&salary_type=negotiable&page=1&limit=10`
- **Response (Success - 200)**: 
  ```json
  {
    "total": 2,
    "data": [
      {
        "id": "<jobPostId>",
        "title": "Software Engineer",
        "description": "Develop and maintain web applications.",
        "location": "Remote",
        "salary": null,
        "status": "Active",
        "job_type": "Full-time",
        "salary_type": "negotiable",
        "excluded_locations": [],
        "pending_review": false,
        "category_id": "<catId1>",
        "category": { "id": "<catId1>", "name": "Development" },
        "category_ids": ["<catId1>", "<catId2>"],
        "categories": [
          { "id": "<catId1>", "name": "Development" },
          { "id": "<catId2>", "name": "Writing" }
        ],

        "employer_id": "<userId>",
        "employer": {
          "id": "<userId>",
          "email": "employer100@example.com",
          "username": "jane_smith100",
          "role": "employer"
        },

        "views": 10,
        "slug": "software-engineer-remote",
        "slug_id": "software-engineer-remote--8df3b0be",
        "created_at": "2025-07-08T07:00:00.000Z",
        "updated_at": "2025-07-08T07:00:00.000Z",

        "emailStats": { "sent": 20, "opened": 7, "clicked": 3 }
      }
    ]
  }
- **Response (Error - 400 Bad Request — pagination parameters invalid)**:
  ```json
  { "statusCode": 400, "message": "Page must be a positive integer", "error": "Bad Request" }
  { "statusCode": 400, "message": "Limit must be a positive integer", "error": "Bad Request" }
- **Response (Error - 401 Unauthorized — missing/malformed token or invalid token)**:
  ```json
  {"statusCode": 401,"message": "Invalid token","error": "Unauthorized"}
- **Response (Error - 403 Forbidden — authenticated but not an admin/moderator)**:
  ```json
  {"statusCode": 403,"message": "Forbidden resource","error": "Forbidden"}  

### 28. Update Job Post (Admin)
- **Endpoint**: `PUT /api/admin/job-posts/:id`
- **Description**: Update a specific job post. Admins only. If categories are provided, they are validated and the job post’s categories are replaced accordingly.
- **Headers**: `Authorization: Bearer <token>`
- **Request Parameters**: `id`: The ID of the job post.
- **Request Body**:
  ```json
  {
    "title": "Senior Software Engineer",
    "description": "Updated description...",
    "location": "Remote",
    "salary": 60000,
    "status": "Closed",
    "salary_type": "per month",
    "excluded_locations": ["Country1", "Country2"],
    "category_ids": ["<catId1>", "<catId2>"],
    "category_id": "<catId1>"
  }
- **Response (Success - 200)**: 
  ```json
  {
    "id": "<jobPostId>",
    "title": "Senior Software Engineer",
    "description": "Updated description...",
    "location": "Remote",
    "salary": 60000,
    "status": "Closed",
    "salary_type": "per month",
    "excluded_locations": ["Country1", "Country2"],

    "category_ids": ["<catId1>", "<catId2>"],
    "categories": [
      { "id": "<catId1>", "name": "Software Development" },
      { "id": "<catId2>", "name": "DevOps" }
    ],

    "employer_id": "<userId>",
    "created_at": "2025-05-13T18:00:00.000Z",
    "updated_at": "2025-05-13T18:30:00.000Z"
  }
- **Response (Error - 400 Bad Request — pagination parameters invalid)**:
  ```json
  { "statusCode": 400, "message": "Salary is required unless salary_type is negotiable", "error": "Bad Request" }
  { "statusCode": 400, "message": "One or more categories not found", "error": "Bad Request" }
- **Response (Error - 401 Unauthorized — missing/malformed token or invalid token)**:
  ```json
  {"statusCode": 401,"message": "Invalid token","error": "Unauthorized"}
- **Response (Error - 403 Forbidden — authenticated but not an admin/moderator)**:
  ```json
  {"statusCode": 403,"message": "Forbidden resource","error": "Forbidden"}  

### 29. Delete Job Post (Admin)
- **Endpoint**: `DELETE /api/admin/job-posts/:id`
- **Description**: Deletes a specific job post (admin only).
- **Headers**: `Authorization: Bearer <token>`
- **Request Parameters**: `id`: The ID of the job post.
- **Response (Success - 200)**: 
  ```json
  {"message": "Job post deleted successfully"}
- **Response (Error - 404, if job post not found)**: 
  ```json
  {
    "statusCode": 404,
    "message": "Job post not found",
    "error": "Not Found"
  }
- **Response (Error - 400 Bad Request — deletion failed due to an internal error (wrapped by the service))**:
  ```json
  {"statusCode": 400,"message": "Failed to delete job post: <reason>","error": "Bad Request"}
- **Response (Error - 401 Unauthorized — missing/malformed token or invalid token)**:
  ```json
  {"statusCode": 401,"message": "Invalid token","error": "Unauthorized"}
- **Response (Error - 403 Forbidden — authenticated but not an admin/moderator)**:
  ```json
  {"statusCode": 403,"message": "Forbidden resource","error": "Forbidden"}   
- **Response (Error - 404 Not Found — job post does not exist)**:
  ```json
  {"statusCode": 404,"message": "Job post not found","error": "Not Found"}     

### 30. Approve Job Post (Admin/Moderator)
- **Endpoint**: `POST /api/admin/job-posts/:id/approve`
- **Endpoint**: `POST /api/moderator/job-posts/:id/approve`
- **Description**: Approves a job post by setting `pending_review` to `false`. Admins and moderators only.  
If a global application limit is configured, an application limit record is initialized for the job post (if missing). _Note: this endpoint returns the updated job post entity; it does **not** include the limit value in the response._
- **Headers**: `Authorization: Bearer <token>`
- **Request Parameters**: `id`: The ID of the job post.
- **Response (Success - 200)**: 
  ```json
  {
    "id": "<jobPostId>",
    "title": "Software Engineer",
    "description": "We are looking for a skilled software engineer...",
    "location": "Remote",
    "salary": 50000,
    "status": "Active",
    "salary_type": "per month",
    "pending_review": false,
    "category_id": "<categoryId>",
    "employer_id": "<employerId>",
    "created_at": "2025-05-15T06:12:00.000Z",
    "updated_at": "2025-05-15T06:12:00.000Z"
  }
- **Response (Error - 401 Unauthorized — missing/malformed token or invalid token)**:
  ```json
  {"statusCode": 401,"message": "Invalid token","error": "Unauthorized"}
- **Response (Error - 403 Forbidden — authenticated but not an admin/moderator)**:
  ```json
  {"statusCode": 403,"message": "Forbidden resource","error": "Forbidden"}   
- **Response (Error - 404 Not Found — job post does not exist)**:
  ```json
  {"statusCode": 404,"message": "Job post not found","error": "Not Found"}    

### 31. Flag Job Post for Review (Admin/Moderator)
- **Endpoint**: `POST /api/admin/job-posts/:id/flag`
- **Endpoint**: `POST /api/moderator/job-posts/:id/flag`
- **Description**: Flags a job post for review by setting `pending_review` to `true`. Admins and moderators only.
- **Headers**: `Authorization: Bearer <token>`
- **Request Parameters**: `id`: The ID of the job post.
- **Response (Success - 200)**: 
  ```json
  {
    "id": "<jobPostId>",
    "title": "Software Engineer",
    "description": "We are looking for a skilled software engineer...",
    "location": "Remote",
    "salary": 50000,
    "status": "Active",
    "salary_type": "per month",
    "pending_review": true,
    "category_id": "<categoryId>",
    "employer_id": "<employerId>",
    "created_at": "2025-05-15T06:12:00.000Z",
    "updated_at": "2025-05-15T06:12:00.000Z"
  }
- **Response (Error - 401 Unauthorized — missing/malformed token or invalid token)**: 
  ```json  
  {"statusCode": 401, "message": "Invalid token", "error": "Unauthorized"}
- **Response (Error - 403 Forbidden — not an admin/moderator)**: 
  ```json  
  {"statusCode": 403, "message": "Forbidden resource", "error": "Forbidden"}
- **Response (Error - 404 Not Found — job post does not exist)**: 
  ```json  
  {"statusCode": 404, "message": "Job post not found", "error": "Not Found"}

### 32. ### 32. Get All Reviews (Admin/Moderator)
- **Endpoint**: `GET /api/admin/reviews`
- **Endpoint**: `GET /api/moderator/reviews`
- **Description**: Retrieve reviews with optional status filter and pagination. Returns total count and paginated data. Sorting is fixed to `created_at DESC`.
- **Headers**: `Authorization: Bearer <token>`
- **Query**:
  - `page` (number, optional, default: `1`) — must be a positive integer.
  - `limit` (number, optional, default: `10`) — must be a positive integer.
  - `status` (string, optional): `Pending` | `Approved` | `Rejected`.
- **Response (Success - 200)**: 
  ```json
  {
    "total": 123,
    "data": [
      {
        "id": "rev_1",
        "reviewer_id": "u_a",
        "reviewed_id": "u_b",
        "job_application_id": "app_1",
        "rating": 5,
        "comment": "Nice!",
        "status": "Pending",
        "reviewer": { "id": "u_a", "email": "a@x", "username": "a" },
        "reviewed": { "id": "u_b", "email": "b@x", "username": "b" },
        "job_application": {
          "id": "app_1",
          "job_post": { "id": "job_1", "title": "Virtual Assistant" },
          "job_seeker": { "id": "u_b", "username": "b" }
        },
        "created_at": "2025-05-13T18:00:00.000Z",
        "updated_at": "2025-05-13T18:00:00.000Z"
      }
    ]
  }
- **Response (Error - 400 Bad Request — invalid pagination parameter)**: 
  ```json  
  {"statusCode": 400, "message": "Page must be a positive integer", "error": "Bad Request"}
  {"statusCode": 400, "message": "Limit must be a positive integer", "error": "Bad Request"}
- **Response (Error - 401 Unauthorized — missing/malformed token or invalid token)**: 
  ```json  
  {"statusCode": 401, "message": "Invalid token", "error": "Unauthorized"}
- **Response (Error - 403 Forbidden — not an admin/moderator)**: 
  ```json  
  {"statusCode": 403, "message": "Forbidden resource", "error": "Forbidden"}

### 33. Delete Review (Admin/Moderator)
- **Endpoint**: `DELETE /api/admin/reviews/:id`
- **Endpoint**: `DELETE /api/moderator/reviews/:id`
- **Description**: Deletes a specific review. Admins and moderators only.  After deletion, the reviewed user’s average rating is recomputed using **all remaining reviews (any status)** for that user.
- **Headers**: `Authorization: Bearer <token>`
- **Request Parameters**: `id`: The ID of the review.
- **Response (Success - 200)**: 
  ```json
  {"message": "Review deleted successfully"}
- **Response (Error - 401 Unauthorized — missing/malformed token or invalid token)**: 
  ```json  
  {"statusCode": 401, "message": "Invalid token", "error": "Unauthorized"}
- **Response (Error - 403 Forbidden — not an admin/moderator)**: 
  ```json  
  {"statusCode": 403, "message": "Forbidden resource", "error": "Forbidden"} 
- **Response (Error - 404 Not Found — review does not exist)**: 
  ```json  
  {"statusCode": 404, "message": "Review not found", "error": "Not Found"}

### 33.1 Approve Review (Admin/Moderator)
- **Endpoint**: `PATCH /api/admin/reviews/:id/approve`
- **Endpoint**: `PATCH /api/moderator/reviews/:id/approve`
- **Description**: Set a review’s status to `Approved` and recompute the reviewed user’s average rating using only **Approved** reviews. If the review is already `Approved`, the endpoint returns the current review (idempotent).
- **Headers**: `Authorization: Bearer <token>`
- **Request Parameters**: `id` (string, required): Review ID
- **Response (Success - 200)**: 
  ```json
  {
    "id": "<reviewId>",
    "reviewer_id": "<userIdA>",
    "reviewed_id": "<userIdB>",
    "job_application_id": "<applicationId>",
    "rating": 5,
    "comment": "Great work!",
    "status": "Approved",
    "created_at": "2025-05-13T18:00:00.000Z",
    "updated_at": "2025-05-13T18:30:00.000Z"
  }
- **Response (Error - 401 Unauthorized — missing/malformed token or invalid token)**: 
  ```json  
  {"statusCode": 401, "message": "Invalid token", "error": "Unauthorized"}
- **Response (Error - 403 Forbidden — not an admin/moderator)**: 
  ```json  
  {"statusCode": 403, "message": "Forbidden resource", "error": "Forbidden"} 
- **Response (Error - 404 Not Found — review does not exist)**: 
  ```json  
  {"statusCode": 404, "message": "Review not found", "error": "Not Found"}

### 33.2 Reject Review (Admin/Moderator)
- **Endpoint**: `PATCH /api/admin/reviews/:id/reject`
- **Endpoint**: `PATCH /api/moderator/reviews/:id/reject`
- **Description**: Set a review’s status to `Rejected` and recompute the reviewed user’s average rating using only **Approved** reviews. If the review is already `Rejected`, the endpoint returns the current review (idempotent).
- **Headers**: `Authorization: Bearer <token>`
- **Request Parameters**: `id` (string, required): Review ID
- **Response (Success - 200)**: 
  ```json
  {
    "id": "<reviewId>",
    "reviewer_id": "<userIdA>",
    "reviewed_id": "<userIdB>",
    "job_application_id": "<applicationId>",
    "rating": 3,
    "comment": "Needs improvement",
    "status": "Rejected",
    "created_at": "2025-05-13T18:00:00.000Z",
    "updated_at": "2025-05-13T18:30:00.000Z"
  }
- **Response (Error - 401 Unauthorized — missing/malformed token or invalid token)**: 
  ```json  
  {"statusCode": 401, "message": "Invalid token", "error": "Unauthorized"}
- **Response (Error - 403 Forbidden — not an admin/moderator)**: 
  ```json  
  {"statusCode": 403, "message": "Forbidden resource", "error": "Forbidden"} 
- **Response (Error - 404 Not Found — review does not exist)**: 
  ```json  
  {"statusCode": 404, "message": "Review not found", "error": "Not Found"}  

### 34. Get Analytics (Admin/Moderator)
- **Endpoint**: `GET /api/admin/analytics`
- **Endpoint**: `GET /api/moderator/analytics`
- **Description**: Returns high-level platform analytics: totals for users, employers, job seekers, job posts (all and active), applications, and reviews.
- **Headers**: `Authorization: Bearer <token>`
- **Response (Success - 200)**: 
  ```json
  {
    "totalUsers": 100,
    "employers": 20,
    "jobSeekers": 80,
    "totalJobPosts": 50,
    "activeJobPosts": 30,
    "totalApplications": 200,
    "totalReviews": 50
  }
- **Response (Error - 401 Unauthorized — missing/malformed token or invalid token)**: 
  ```json
  {"statusCode": 401, "message": "Invalid token", "error": "Unauthorized"}
- **Response (Error - 403 Forbidden — not an admin/moderator)**: 
  ```json  
  {"statusCode": 403, "message": "Forbidden resource", "error": "Forbidden"} 

### 35. Get Registration Statistics (Admin/Moderator)
- **Endpoint**: `GET /api/admin/analytics/registrations`
- **Endpoint**: `GET /api/moderator/analytics/registrations`
- **Description**: Return user registration statistics aggregated by a given interval within a date range. Supports filtering by role.
- **Headers**: `Authorization: Bearer <token>`
- **Query Parameters**: 
  - `startDate` (string, required): ISO date, e.g. `2025-01-01`.
  - `endDate` (string, required): ISO date, e.g. `2025-01-31`.
  - `interval` (string, required): `day` | `week` | `month`.
  - `role` (string, optional, default: `all`): `jobseeker` | `employer` | `all`.
- **Example Request**: 
  - Without role filter: `/api/admin/analytics/registrations?startDate=2025-05-01&endDate=2025-05-15&interval=day`
  - With role filter: `/api/admin/analytics/registrations?startDate=2025-05-01&endDate=2025-05-15&interval=day&role=jobseeker`
- **Response (Success - 200)**: 
  ```json
  {
    "interval": "day",
    "role": "all",
    "startDate": "2025-01-01",
    "endDate": "2025-01-31",
    "total": 123,
    "buckets": [
      { "periodStart": "2025-01-01", "count": 5 },
      { "periodStart": "2025-01-02", "count": 7 },
      { "periodStart": "2025-01-03", "count": 3 }
    ]
  }
- **Response (Error - 400 Bad Request — invalid dates)**:  
  ```json
  {"statusCode": 400, "message": "Invalid date format", "error": "Bad Request"}
- **Response (Error - 401 Unauthorized — missing/malformed token or invalid token)**: 
  ```json
  {"statusCode": 401, "message": "Invalid token", "error": "Unauthorized"}
- **Response (Error - 403 Forbidden — not an admin/moderator)**: 
  ```json  
  {"statusCode": 403, "message": "Forbidden resource", "error": "Forbidden"}   

### 36. Get Geographic Distribution (Admin/Moderator)
- **Endpoint**: `GET /api/admin/analytics/geographic-distribution`
- **Endpoint**: `GET /api/moderator/analytics/geographic-distribution`
- **Description**: Retrieve the geographic distribution of users by country, optionally filtered by role and date range.  If `endDate` is provided, it is treated as **inclusive** (end of day 23:59:59.999). Users with `NULL` country are returned as `"Unknown"`.
- **Headers**: `Authorization: Bearer <token>`
- **Query Parameters**: 
  - `startDate` (string, optional): ISO date (e.g., `YYYY-MM-DD`). Filters users created **on or after** this   date.
  - `endDate` (string, optional): ISO date (e.g., `YYYY-MM-DD`). Filters users created **on or before** this date   (**inclusive**, end of day).
  - `role` (string, optional, default: `all`): `jobseeker` | `employer` | `all`.
- **Example Request**: `GET /api/admin/analytics/geographic-distribution?startDate=2025-07-01&endDate=2025-07-31&role=jobseeker`
- **Response (Success - 200)**:
  ```json
  [
    { "country": "US", "count": 50 },
    { "country": "CA", "count": 20 },
    { "country": "Unknown", "count": 3 }
  ]
- **Response (Error - 401 Unauthorized — missing/malformed token or invalid token)**: 
  ```json
  {"statusCode": 401, "message": "Invalid token", "error": "Unauthorized"}
- **Response (Error - 403 Forbidden — not an admin/moderator)**: 
  ```json  
  {"statusCode": 403, "message": "Forbidden resource", "error": "Forbidden"}   
- **Response (Error - 400 Bad Request — invalid date format)**:
  ```json
  {"statusCode": 400, "message": "Invalid date format", "error": "Bad Request"}

### 35. Set Global Application Limit for All Job Posts (Admin)
- **Endpoint**: `POST /api/admin/settings/job-posts-application-limit`
- **Description**: Set a global application limit and apply it to **all existing job posts**. Admins only.  
This endpoint: 1. updates the global setting, and  2. initializes per-post application limits for every job post using the provided value.
- **Headers**: `Authorization: Bearer <token>`
- **Request Body**:
  ```json
  {"limit": 50}
- **Response (Success - 200)**: 
  ```json
  {
    "message": "Global application limit updated successfully for all job posts",
    "limit": 50
  }
- **Response (Error - 400 Bad Request — invalid limit)**:
  ```json
  {"statusCode": 400, "message": "Application limit must be a non-negative number", "error": "Bad Request"}
- **Response (Error - 401 Unauthorized — missing/malformed token or invalid token)**:
  ```json
  {"statusCode": 401, "message": "Invalid token", "error": "Unauthorized"}
- **Response (Error - 403 Forbidden — not an admin)**:
  ```json
  {"statusCode": 403, "message": "Forbidden resource", "error": "Forbidden"}

### 36. Submit Tech Issue Feedback
- **Endpoint**: `POST /api/feedback`
- **Description**: Allows authenticated jobseekers or employers to submit general feedback about the platform.
- **Headers**: `Authorization: Bearer <token>`
- **Request Body**:
  ```json
  {
    "category": "Bug", // One of: Bug | UI | Perfomance | Data | Other
    "summary": "Short 1–2 sentence description",
    "steps_to_reproduce": "1) Open ... 2) Click ... 3) Error",
    "expected_result": "Should open profile page",
    "actual_result": "Stays on the same page with 500"
  }

- **Response (Success - 200)**: 
  ```json
  {
    "id": "<feedbackId>",
    "user_id": "<userId>",
    "role": "jobseeker",
    "category": "Bug",
    "summary": "Short 1–2 sentence description",
    "steps_to_reproduce": "1) Open ... 2) Click ... 3) Error",
    "expected_result": "Should open profile page",
    "actual_result": "Stays on the same page with 500",
    "created_at": "2025-08-15T10:00:00.000Z",
    "updated_at": "2025-08-15T10:00:00.000Z"
  }

- **Response (Error - 401, if token invalid or user not jobseeker/employer)**: 
  ```json
  {
    "statusCode": 401,
    "message": "Only jobseekers and employers can submit feedback",
    "error": "Unauthorized"
  }

### 37. Get Tech Issue Feedback (Admin)
- **Endpoint**: `GET /api/feedback`
- **Description**: Returns a paginated list of tech feedback (admin only).
- **Headers**: `Authorization: Bearer <token>`
- **Query Parameters**:
  - `page` (number, optional): Page number (default: 1)
  - `limit` (number, optional): Page size (default: 10)
- **Response (Success - 200)**: 
  ```json
  {
    "total": 123,
    "data": [
      {
        "id": "<feedbackId>",
        "user_id": "<userId>",
        "role": "employer",
        "category": "UI",
        "summary": "Button misaligned on mobile",
        "steps_to_reproduce": "Open /jobs on iPhone SE...",
        "expected_result": "Buttons aligned in a row",
        "actual_result": "Buttons wrap to next line",
        "created_at": "2025-08-15T10:00:00.000Z",
        "updated_at": "2025-08-15T10:00:00.000Z",
        "user": {
          "id": "<userId>",
          "username": "employer1",
          "email": "employer@example.com"
        }
      }
    ]
  }

- **Response (Error - 400)**:   
  ```json
  { "statusCode": 400, "message": "Page must be a positive integer", "error": "Bad Request" }

- **Response (Error - 401, if user is not an admin)**:   
  ```json
  { "statusCode": 401, "message": "Only admins can view feedback", "error": "Unauthorized" }

### 38. Add Blocked Country (Admin)
- **Endpoint**: `POST /api/admin/blocked-countries`
- **Description**: Add a country to the blocked list. Admins only.
- **Headers**: `Authorization: Bearer <token>`
- **Request Body**: 
  ```json
  {"countryCode": "IN"}
- **Response (Success - 201)**:
  ```json
  {
    "id": "<blockedCountryId>",
    "country_code": "IN",
    "created_at": "2025-05-15T06:12:00.000Z",
    "updated_at": "2025-05-15T06:12:00.000Z"
  }
- **Response (Error - 400 Bad Request — already blocked or invalid input)**:
  ```json
  {"statusCode": 400, "message": "Country is already blocked", "error": "Bad Request"}
- **Response (Error - 401 Unauthorized — missing/malformed token or invalid token)**:
  ```json
  {"statusCode": 401, "message": "Invalid token", "error": "Unauthorized"}
- **Response (Error - 403 Forbidden — not an admin)**:
  ```json
  {"statusCode": 403, "message": "Forbidden resource", "error": "Forbidden"}

### 39. Remove Blocked Country (Admin)
- **Endpoint**: `DELETE /api/admin/blocked-countries/:countryCode`
- **Description**: Removes a country from the blocked list (admin only).
- **Headers**: `Authorization: Bearer <token>`
- **Request Parameters**: `countryCode`: The country code to remove (e.g., "IN").
- **Response (Success - 200)**: 
  ```json
  {"message": "Country removed from blocked list"}
- **Response (Error - 400 Bad Request — country is not blocked)**:
  ```json
  {"statusCode": 400, "message": "Country is not blocked", "error": "Bad Request"}
- **Response (Error - 401 Unauthorized — missing/malformed token or invalid token)**:
  ```json
  {"statusCode": 401, "message": "Invalid token", "error": "Unauthorized"}
- **Response (Error - 403 Forbidden — not an admin)**:
  ```json
  {"statusCode": 403, "message": "Forbidden resource", "error": "Forbidden"}  

### 40. Get Blocked Countries (Admin)
- **Endpoint**: `GET /api/admin/blocked-countries`
- **Description**: Retrieves the list of blocked countries (admin only).
- **Headers**: `Authorization: Bearer <token>`
- **Response (Success - 200)**: 
  ```json
  [
  {
    "id": "<blockedCountryId>",
    "country_code": "IN",
    "created_at": "2025-05-15T06:12:00.000Z",
    "updated_at": "2025-05-15T06:12:00.000Z"
  },
  {
    "id": "<blockedCountryId>",
    "country_code": "PK",
    "created_at": "2025-05-15T06:12:00.000Z",
    "updated_at": "2025-05-15T06:12:00.000Z"
  }
  ]
- **Response (Error - 400 Bad Request — country is not blocked)**:
  ```json
  {"statusCode": 400, "message": "Country is not blocked", "error": "Bad Request"}
- **Response (Error - 401 Unauthorized — missing/malformed token or invalid token)**:
  ```json
  {"statusCode": 401, "message": "Invalid token", "error": "Unauthorized"}  

### 41. Get Top Employers (Admin)
- **Endpoint**: `GET /api/admin/leaderboards/top-employers`
- **Description**: Retrieves the top employers by average rating (admin only).
- **Headers**: `Authorization: Bearer <token>`
- **Query Parameters**: 
  - `limit` (number, optional): Number of results to return (default: 10).
- **Response (Success - 200)**:   
  ```json
  [
    {
      "userId": "<employerId>",
      "username": "jane_smith113",
      "email": "jane@example.com",
      "averageRating": 4.5
    }
  ]

- **Response (Error - 401, if user is not an admin)**:   
  ```json
  {
    "statusCode": 401,
    "message": "Unauthorized",
    "error": "Unauthorized"
  }

### 42. Get Top Jobseekers (Admin)
- **Endpoint**: `GET /api/admin/leaderboards/top-jobseekers`
- **Description**: Retrieves the top jobseekers by the number of applications (admin only).
- **Headers**: `Authorization: Bearer <token>`
- **Query Parameters**: 
  - `limit` (number, optional): Number of results to return (default: 10).
- **Response (Success - 200)**:   
  ```json
  [
    {
      "userId": "<jobseekerId>",
      "username": "john_doe",
      "email": "john@example.com",
      "averageRating": 4
    }
  ]

- **Response (Error - 401, if user is not an admin)**:   
  ```json
  {
    "statusCode": 401,
    "message": "Unauthorized",
    "error": "Unauthorized"
  }  

### 43. Upload Avatar
- **Endpoint**: `POST /api/profile/upload-avatar`
- **Description**: Uploads an avatar image for the authenticated user from their device.
- **Headers**: `Authorization: Bearer <token>`
- **Request Body**: Form-data with a field `avatar` (file: JPEG, JPG, PNG, max 5MB)
- **Response (Success - 200)**: Returns the updated profile (same format as GET /api/profile)

- **Response (Error - 400, if file is missing or invalid)**
      ```json
  {
    "statusCode": 400,
    "message": "Only JPEG, JPG, and PNG files are allowed",
    "error": "Bad Request"
  }

### 44. Upload Identity Document
- **Endpoint**: `POST /api/profile/upload-identity`
- **Description**: Uploads an identity document for verification from the authenticated user’s device.
- **Headers**: `Authorization: Bearer <token>`
- **Request Body**: Form-data with a field document (file: JPEG, JPG, PNG, PDF, max 10MB)
- **Response (Success - 200)**: Returns the updated profile (same format as GET /api/profile)

- **Response (Error - 400, if file is missing or invalid)**
      ```json
  {
    "statusCode": 400,
    "message": "Only JPEG, JPG, PNG, and PDF files are allowed",
    "error": "Bad Request"
  }

### 44.1 Upload Resume
- **Endpoint**: `POST /api/profile/upload-resume`
- **Description**: Uploads a resume file for the authenticated jobseeker from their device.
- **Headers**: `Authorization: Bearer <token>`
- **Request Body**: Form-data with a field resume (file: PDF, DOC, DOCX, max 10MB)
- **Response (Success - 200)**: Returns the updated profile (same format as GET /api/profile)
- **Response (Error - 400, if file is missing or invalid)**
      ```json
  {
    "statusCode": 400,
    "message": "Only PDF, DOC, and DOCX files are allowed",
    "error": "Bad Request"
  }

### 45. Verify Identity (Admin)
- **Endpoint**: `POST /api/admin/profile/:id/verify-identity`
- **Description**: Set the user’s `identity_verified` flag to either `true` or `false`. Requires that the user has an uploaded `identity_document`. Admins only.
- **Headers**: `Authorization: Bearer <token>`
- **Request Parameters**: `id`: The ID of the user.
- **Request Body**:
  ```json
  {"verify": true}
- **Response (Success - 200)**: 
  ```json
  {
    "message": "Identity verification status updated",
    "identity_verified": true
  }
- **Response (Error - 400 Bad Request — invalid body)**:
  ```json
  {"statusCode": 400, "message": "Verify parameter must be a boolean", "error": "Bad Request"}
- **Response (Error - 401 Unauthorized — missing/malformed token or invalid token)**:
  ```json  
  {"statusCode": 401, "message": "Invalid token", "error": "Unauthorized"}
- **Response (Error - 403 Forbidden — not an admin)**:
  ```json
  {"statusCode": 403, "message": "Forbidden resource", "error": "Forbidden"}
- **Response (Error - 404 Not Found — user does not exist)**:
  ```json
  {"statusCode": 404, "message": "User not found", "error": "Not Found"}
- **Response (Error - 404 Not Found — identity document missing)**:
  ```json
  {"statusCode": 404, "message": "No identity document uploaded", "error": "Not Found"}

### 46. Set Global Application Limit (Admin)
- **Endpoint**: `POST /api/admin/settings/application-limit`
- **Description**: Set the global application limit for all job posts. Admins only.
Note: This sets the global setting; applying it to existing job posts is handled by a separate endpoint.
- **Headers**: `Authorization: Bearer <token>`
- **Request Body**:
  ```json
  {"limit": 1000}
- **Response (Success - 200)**:
  ```json
  {
    "message": "Global application limit updated successfully",
    "limit": 1000
  } 
- **Response (Error - 401 Unauthorized — missing/malformed token or invalid token)**:
  ```json
  {"statusCode": 401, "message": "Invalid token", "error": "Unauthorized"}
- **Response (Error - 403 Forbidden — not an admin)**:
  ```json
  {"statusCode": 403, "message": "Forbidden resource", "error": "Forbidden"}

### 47. Get Global Application Limit (Admin)
- **Endpoint**: `GET /api/admin/settings/application-limit`
- **Description**: Retrieve the global application limit. Admins only. If the stored setting is missing, non-numeric, `NaN`, or negative, the API returns `null`.
- **Headers**: `Authorization: Bearer <token>`
- **Response (Success - 200)**:
  ```json
  {"globalApplicationLimit": 1000}
- **Response (Error - 401 Unauthorized — missing/malformed token or invalid token)**:
  ```json
  {"statusCode": 401, "message": "Invalid token", "error": "Unauthorized"}
- **Response (Error - 403 Forbidden — not an admin)**:
  ```json
  {"statusCode": 403, "message": "Forbidden resource", "error": "Forbidden"}

### 49. Increment Job Post Views
- **Endpoint**: `POST /api/job-posts/:id/increment-view`
- **Description**: Increments the view count for a specific job post.
- **Request Parameters**: `id`: The ID of the job post
- **Response (Success - 200)**:
  ```json
  {
    "message": "View count incremented",
    "views": 1
  }

- **Response (Error - 404, if job post not found)**:
  ```json
  {
    "statusCode": 404,
    "message": "Job post not found",
    "error": "Not Found"
  }

### 52. Block User (Admin/Moderator)
- **Endpoint**: `POST /api/admin/users/:id/block`
- **Endpoint**: `POST /api/moderator/users/:id/block`
- **Description**: Block a specific user by setting `status` to `blocked`. Admins and moderators only.
- **Headers**: `Authorization: Bearer <token>`
- **Request Parameters**: `id`: The ID of the user.
- **Response (Success - 200)**:
  ```json
  {"message": "User blocked successfully"}
- **Response (Error - 400 Bad Request — user already blocked)**:
  ```json
  {"statusCode": 400, "message": "User is already blocked", "error": "Bad Request"}
- **Response (Error - 401 Unauthorized — missing/malformed token or invalid token)**:
  ```json
  {"statusCode": 401, "message": "Invalid token", "error": "Unauthorized"}
- **Response (Error - 403 Forbidden — not an admin/moderator)**:
  ```json
  {"statusCode": 403, "message": "Forbidden resource", "error": "Forbidden"}
- **Response (Error - 404 Not Found — user does not exist)**:
  ```json
  {"statusCode": 404, "message": "User not found", "error": "Not Found"}

### 53. Unblock User (Admin/Moderator)
- **Endpoint**: `POST /api/admin/users/:id/unblock`
- **Endpoint**: `POST /api/moderator/users/:id/unblock`
- **Description**: Unblock a user by setting their `status` to `active`. Admins and moderators only.
- **Headers**: `Authorization: Bearer <token>`
- **Request Parameters**: `id`: The ID of the user.  
- **Response (Success - 200)**:
  ```json
  {"message": "User unblocked successfully"}
- **Response (Error - 400 Bad Request — user already active)**:
  ```json
  {"statusCode": 400, "message": "User is already active", "error": "Bad Request"} 
- **Response (Error - 401 Unauthorized — missing/malformed token or invalid token)**:
  ```json
  {"statusCode": 401, "message": "Invalid token", "error": "Unauthorized"}
- **Response (Error - 403 Forbidden — not an admin/moderator)**:
  ```json
  {"statusCode": 403, "message": "Forbidden resource", "error": "Forbidden"}
- **Response (Error - 404 Not Found — user does not exist)**:
  ```json
  {"statusCode": 404, "message": "User not found", "error": "Not Found"}

### 54. Increment Profile Views
- **Endpoint**: `POST /api/profile/:id/increment-view`
- **Description**: Increments the view count for a specific jobseeker's profile.
- **Headers**: `Authorization: Bearer <token>`
- **Request Parameters**: `id`: The ID of the user (jobseeker).
- **Response (Success - 200)**:
  ```json
  {
    "message": "Profile view count incremented",
    "profile_views": 1
  }

- **Response (Error - 404, if user or profile not found)**:
  ```json
  {
    "statusCode": 404,
    "message": "User not found",
    "error": "Not Found"
  }

- **Response (Error - 400, if user is not a jobseeker)**:
  ```json
  {
    "statusCode": 400,
    "message": "Profile views can only be incremented for jobseekers",
    "error": "Bad Request"
  }

### 55. Get Top Jobseekers by Profile Views (Admin/Moderator)
- **Endpoint**: `GET /api/admin/leaderboards/top-jobseekers-by-views`
- **Endpoint**: `GET /api/moderator/leaderboards/top-jobseekers-by-views`
- **Description**: Retrieve the top jobseekers ranked by `profile_views`.
- **Headers**: `Authorization: Bearer <token>`
- **Query Parameters**: `limit` (number, optional, default: `10`): Number of jobseekers to return.  
- **Response (Success - 200)**:
  ```json
  [
    {
      "userId": "<jobseekerId>",
      "username": "john_doe",
      "email": "john@example.com",
      "profileViews": 100
    }
  ]
- **Response (Error - 401 Unauthorized — missing/malformed token or invalid token)**:
  ```json
  {"statusCode": 401, "message": "Invalid token", "error": "Unauthorized"}
- **Response (Error - 403 Forbidden — not an admin/moderator)**:
  ```json
  {"statusCode": 403, "message": "Forbidden resource", "error": "Forbidden"}

### 56. Export Users to CSV (Admin/Moderator)
- **Endpoint**: `GET /api/admin/users/export-csv`
- **Endpoint**: `GET /api/moderator/users/export-csv`
- **Description**: Exports users to a CSV file. If no filters are provided, all users are included (backward compatible).
- **Headers**: `Authorization: Bearer <token>`
- **Query Parameters (all optional)**:
  - `role`: (string): jobseeker | employer | admin | moderator. Filter by user role.
  - `status`: (string): active | blocked. Filter by account status.
  - `q`: (string): any. Substring search across email and username (case-insensitive).
  - `email`: (string): any. Case-insensitive match on email (ILIKE).
  - `username`: (string): any. Case-insensitive match on username (ILIKE).
  - `country`: (string): any or unknown. Match by country; unknown matches NULL.
  - `provider`: (string): any or none. Match by OAuth provider; none matches NULL.
  - `referralSource`: (string): any. Substring match on referral_source
  - `isEmailVerified`: (string): true | false. Filter by email verification flag.
  - `identityVerified`: (string): true | false. Filter by identity verification flag.
  - `hasAvatar`: (string): true | false. Users with/non avatar.
  - `hasResume`: (string): true | false. For jobseekers: presence of resume.
  - `jobSearchStatus`: (string): actively_looking | open_to_offers | hired. Jobseeker status.
  - `companyName`: (string): any. Employer’s company name (substring).
  - `riskMin`: (number): integer/float. risk_score >= riskMin.
  - `riskMax`: (number): integer/float. risk_score <= riskMax.
  - `createdFrom`: (date): ISO (e.g., 2025-01-01). Registered on/after this date..
  - `createdTo`: (date): ISO. Registered on/before this date (Inclusive (end of day 23:59:59.999)).
  - `lastLoginFrom`: (date): ISO. Last login on/after this date.
  - `lastLoginTo`: (date): ISO. Last login on/before this date (Inclusive (end of day 23:59:59.999)).
  - `sortBy`: (string): created_at | last_login_at. Sort field. Default: created_at.
  - `order`: (string): ASC | DESC. Sort order. Default: DESC.
- **Notes**:
  - `createdTo` / `lastLoginTo` are treated as inclusive (end of day).
  - If role-specific columns don’t apply (e.g., employer fields for jobseekers), those CSV cells are left empty.
  - `provider=none` and `country=unknown` match `NULL` values.
- **Response (Success - 200)**:
  - Content-Type: `text/csv`
  - Content-Disposition: `attachment`; `filename="users_YYYYMMDD[_role-…].csv"`
- **CSV Columns**:
  - User ID,Email,Username,Role,Status,Country,Provider,Email Verified,Identity Verified,
    Referral Source,Risk Score,Created At,Updated At,Last Login At,Last Seen At,Has Avatar,
    JS Job Search Status,JS Expected Salary,JS Currency,JS Avg Rating,JS Has Resume,
    EM Company Name,EM Avg Rating
- **Response (Error - 401, JWT required. Access: admins and moderators (ModeratorGuard).)**:  
    ```json
  {"statusCode": 401, "message": "Invalid token", "error": "Unauthorized"}

### 57. Get Top Employers by Job Posts (Admin)
- **Endpoint**: `GET /api/admin/leaderboards/top-employers-by-posts`
- **Description**: Retrieves the top employers by the number of job posts created (admin only).
- **Headers**: `Authorization: Bearer <token>`
- **Query Parameters**: `limit` (number, optional): Number of results to return (default: 10).
- **Response (Success - 200)**:
  ```json
  [
    {
      "userId": "<employerId>",
      "username": "jane_smith",
      "email": "employer@example.com",
      "jobCount": 5
    }
  ]

- **Response (Error - 401, if token is invalid or user is not an admin)**:  
    ```json
  {
    "statusCode": 401,
    "message": "Invalid token",
    "error": "Unauthorized"
  }

### 58. Get Growth Trends (Admin/Moderator)
- **Endpoint**: `GET /api/admin/analytics/growth-trends`
- **Endpoint**: `GET /api/moderator/analytics/growth-trends`
- **Description**: Retrieve growth trends for **registrations** and **job posts** over the last **7** or **30** days, grouped by **day**. Results are ordered by period ascending.
- **Headers**: `Authorization: Bearer <token>`
- **Query Parameters**: `period` (string, optional): `7d` or `30d` (default: `7d`).  
- **Response (Success - 200)**:
  ```json
  {
    "registrations": [
      { "period": "2025-05-20T00:00:00.000Z", "count": 5 },
      { "period": "2025-05-21T00:00:00.000Z", "count": 3 }
    ],
    "jobPosts": [
      { "period": "2025-05-20T00:00:00.000Z", "count": 2 },
      { "period": "2025-05-21T00:00:00.000Z", "count": 4 }
    ]
  }
- **Response (Error - 401 Unauthorized — missing/malformed token or invalid token)**:
  ```json
  {"statusCode": 401, "message": "Invalid token", "error": "Unauthorized"}
- **Response (Error - 403 Forbidden — not an admin/moderator)**:
  ```json
  {"statusCode": 403, "message": "Forbidden resource", "error": "Forbidden"}

### 59. Get Recent Registrations (Admin/Moderator)
- **Endpoint**: `GET /api/admin/analytics/recent-registrations`
- **Endpoint**: `GET /api/moderator/analytics/recent-registrations`
- **Description**: Return registrations for a single local day (separately for jobseekers and employers) plus referral metadata. If `date` is omitted, the “today” window is computed using `tzOffset`.
- **Headers**: `Authorization: Bearer <token>`
- **Query Parameters**: 
  - `date` (string, optional): Day in `YYYY-MM-DD` (interpreted in the timezone derived from `tzOffset`). If  omitted, the server computes today’s date using `tzOffset`.
  - `tzOffset` (number, optional, default: `0`): Minutes **east of UTC** (e.g., UTC+3 → `180`, UTC−4 → `-240`).   Used to shift the daily window boundaries.
- **Response (Success - 200)**:
  ```json
  {
    "date": "2025-09-15",
    "tzOffset": 180,
    "jobseekers_total": 3,
    "employers_total": 1,
    "jobseekers": [
      {
        "id": "<userId>",
        "email": "jobseeker@example.com",
        "username": "john_doe",
        "role": "jobseeker",
        "created_at": "2025-09-15T06:00:00.000Z",

        "referral_from_signup": "facebook_ads_campaign_12",
        "referral_link_scope": "job",                       // e.g., "job" or "site"
        "referral_link_description": "Promo link for Data Analyst opening",
        "referral_job": { "id": "<jobPostId>", "title": "Data Analyst (Remote)" },
        "referral_job_description": "We are looking for a data analyst to ..."
      }
    ],
    "employers": [
      {
        "id": "<userId>",
        "email": "employer@example.com",
        "username": "jane_smith",
        "role": "employer",
        "created_at": "2025-09-15T05:21:00.000Z",

        "referral_from_signup": null,
        "referral_link_scope": null,
        "referral_link_description": null,
        "referral_job": null,
        "referral_job_description": null
      }
    ]
  }
- **Response (Error - 401 Unauthorized — missing/malformed token or invalid token)**:
  ```json
  {"statusCode": 401, "message": "Invalid token", "error": "Unauthorized"}
- **Response (Error - 403 Forbidden — not an admin/moderator)**:
  ```json
  {"statusCode": 403, "message": "Forbidden resource", "error": "Forbidden"}

### 59.1 Get Registrations Breakdown by Brand (Admin/Moderator)
- **Endpoint**: `GET /api/admin/analytics/brands`
- **Endpoint**: `GET /api/moderator/analytics/brands`
- **Description**: Return user registrations breakdown by **site brand** with counts per brand for **total**, **employers**, and **jobseekers**.
- **Headers**: `Authorization: Bearer <token>`
- **Query Parameters**: 
  - `startDate` (string, optional): ISO date, e.g., `2025-10-01`. Filters users created **on or after** this date.
  - `endDate` (string, optional): ISO date, e.g., `2025-10-31`. Filters users created **on or before** this date (**inclusive**, up to 23:59:59.999).
- **Response (Success - 200)**:
  ```json
  {
    "range": {
      "startDate": "2025-10-01",
      "endDate": "2025-10-31"
    },
    "byBrand": [
      { "brand": "jobforge",  "total": 123, "employers": 45, "jobseekers": 78 },
      { "brand": "22resumes", "total": 50,  "employers": 10, "jobseekers": 40 },
      { "brand": "unknown",   "total": 5,   "employers": 1,  "jobseekers": 4 }
    ],
    "overall": { "total": 178, "employers": 56, "jobseekers": 122 }
  }
- **Response (Error - 400 Bad Request — invalid start date)**:
  ```json
  {"statusCode": 400, "message": "Invalid startDate format", "error": "Bad Request"}
- **Response (Error - 400 Bad Request — invalid end date)**:
  ```json
  {"statusCode": 400, "message": "Invalid endDate format", "error": "Bad Request"}
- **Response (Error - 401 Unauthorized — missing/malformed token or invalid token)**:
  ```json
  {"statusCode": 401, "message": "Invalid token", "error": "Unauthorized"}
- **Response (Error - 403 Forbidden — not an admin/moderator)**:
  ```json
  {"statusCode": 403, "message": "Forbidden resource", "error": "Forbidden"}  

### 60. Get Job Posts with Applications (Admin/Moderator)
- **Endpoint**: `GET /api/admin/job-posts/applications`
- **Endpoint**: `GET /api/moderator/job-posts/applications`
- **Description**: Retrieve job posts with their application counts and employer details. Supports optional filtering by job post status.
- **Headers**: `Authorization: Bearer <token>`
- **Query Parameters**: 
  - `limit` (number, optional, default: `5`): Maximum number of results to return.  
  - `status` (string, optional): Job post status (e.g., `Active`, `Draft`, `Closed`).  
- **Response (Success - 200)**:
  ```json
  [
    {
      "id": "<jobPostId>",
      "title": "Software Engineer",
      "status": "Active",
      "applicationCount": 10,
      "created_at": "2025-05-27T06:00:00.000Z",
      "employer": {
        "id": "<userId>",
        "username": "john_doe",
        "company_name": "Tech Corp"
      }
    }
  ]
- **Response (Error - 401 Unauthorized — missing/malformed token or invalid token)**:
  ```json
  {"statusCode": 401, "message": "Invalid token", "error": "Unauthorized"}
- **Response (Error - 403 Forbidden — not an admin/moderator)**:
  ```json
  {"statusCode": 403, "message": "Forbidden resource", "error": "Forbidden"}  

### 61. Get Online Users (Admin/Moderator)
- **Endpoint**: `GET /api/admin/analytics/online-users`
- **Endpoint**: `GET /api/moderator/analytics/online-users`
- **Description**: Return the current number of online **jobseekers** and **employers**. Uses Redis keys with the `online:*` pattern.
- **Headers**: `Authorization: Bearer <token>`
- **Response (Success - 200)**:
  ```json
  { "jobseekers": 15, "employers": 5 }
- **Response (Error - 401 Unauthorized — missing/malformed token or invalid token)**:
  ```json
  {"statusCode": 401, "message": "Invalid token", "error": "Unauthorized"}
- **Response (Error - 403 Forbidden — not an admin/moderator)**:
  ```json
  {"statusCode": 403, "message": "Forbidden resource", "error": "Forbidden"}  
- **Response (Error - 500 Internal Server Error — Redis failure)**:
  ```json
  {"statusCode": 500, "message": "Redis get online users failed", "error": "Internal Server Error"}  

### 62. Get User Online Status
- **Endpoint**: `GET /api/users/:id/online`
- **Description**: Checks if a specific user is online, based on their presence in the Redis store. Accessible to jobseekers, employers, admins, and moderators.
- **Headers**: `Authorization: Bearer <token>`
- **Request Parameters**: `id`: The ID of the user.
- **Response (Success - 200)**:
  ```json
  {
    "userId": "<userId>",
    "isOnline": true,
    "role": "jobseeker" // or "employer", "admin", "moderator"
  }
- **Response (Error - 401, if token is invalid)**:
  ```json
  {
    "statusCode": 401,
    "message": "Invalid token",
    "error": "Unauthorized"
  }
- **Response (Error - 401, if user role is not supported)**:
  ```json
  {
    "statusCode": 401,
    "message": "Only jobseekers, employers, admins, or moderators can check online status",
    "error": "Unauthorized"
  }
- **Response (Error - 404, if user not found)**:
  ```json
  {
    "statusCode": 404,
    "message": "User not found",
    "error": "Not Found"
  }

### 63. Get User Risk Score (Admin/Moderator)
- **Endpoint**: `GET /api/admin/users/:id/risk-score`
- **Endpoint**: `GET /api/moderator/users/:id/risk-score`
- **Description**: Retrieves the risk score and anti-fraud details for a specific user. Admins and moderators only.
- **Headers**: `Authorization: Bearer <token>`
- **Request Parameters**: `id`: The ID of the user.
- **Response (Success - 200)**:
  ```json
  {
    "userId": "<userId>",
    "riskScore": 50,
    "details": {
      "duplicateIp": true,
      "proxyDetected": false,
      "duplicateFingerprint": false
    }
  }
- **Response (Error - 404, Not Found — user does not exist.)**:  
    ```json
  {"statusCode": 404,"message": "User not found","error": "Not Found"}
- **Response (Error - 401 Unauthorized — missing/malformed token or invalid token)**:  
    ```json
  {"statusCode": 401,"message": "Invalid token","error": "Unauthorized"}
- **Response (Error - 403 Forbidden — authenticated but not an admin/moderator)**:  
    ```json
  {"statusCode": 403,"message": "Forbidden resource","error": "Forbidden"}  

### 64. Search Talents
- **Endpoint**: `GET /api/talents`
- **Description**: Retrieves a list of freelancers based on specified filters such as skills, experience, description, rating, and timezone, with pagination and sorting options.
- **Request Parameters**:
  - `skills` (string or string[], optional): Filter by skills (e.g., "skills=Python" or "skills[]=Python&skills[]=JavaScript").
  - `experience` (string, optional): Filter by experience (partial match, e.g., "3 years").
  - `description` (string, optional): Filter by description (partial match, e.g., "React developer").
  - `rating` (number, optional): Filter by minimum average rating (0 to 5, e.g., "4").
  - `timezone` (string, optional): Filter by timezone (e.g., "America/New_York").
  - `page` (number, optional): Page number for pagination (default: 1).
  - `limit` (number, optional): Number of items per page (default: 10).
  - `sort_by` (string, optional): Field to sort by ("average_rating" or "profile_views", default: "average_rating").
  - `sort_order` (string, optional): Sort order ("ASC" or "DESC", default: "DESC").
  - `job_search_status` — "actively_looking" | "open_to_offers" | "hired"
  - `expected_salary_min` — неотрицательное число.
  - `expected_salary_max` — неотрицательное число.
  - `country` — ISO-код страны (например, US).
  - `countries` — массив ISO-кодов, можно как countries=US&countries=CA или countries=US,CA.
  - `languages` — массив языков (строки), например languages=en&languages=fr или languages=en,fr.
  - `languages_mode` — any (по умолчанию) | all.
  - `has_resume` — true | false.
- **Example Request**: `/api/talents?skills=<skillId>&experience=3 years&description=React&rating=4&timezone=America/New_York&page=1&limit=10&sort_by=average_rating&sort_order=DESC`
  `/api/talents?skills[]=123&skills=456&country=PH&languages=en,es&languages_mode=all&has_resume=true&page=1&limit=20`
  `/api/talents?countries=IN,BD&has_resume=false`
- **Response (Success - 200)**:
  ```json
  {
    "total": 50,
    "data": [
      {
        "id": "<userId>",
        "username": "john_doe",
        "email": "john@example.com",
        "skills": [
          { "id": "<skillId>", "name": "Web Development", "parent_id": "<parentSkillId>" }
        ],
        "experience": "3 years",
        "description": "Experienced web developer specializing in React and Node.js",
        "portfolio": "https://portfolio.com",
        "video_intro": "https://video.com",
        "timezone": "America/New_York",
        "currency": "USD",
        "expected_salary": 3500.00,
        "average_rating": 4.5,
        "job_search_status": "open_to_offers",
        "profile_views": 100,
        "identity_verified": true,
        "avatar": "/uploads/avatars/<filename>",
        "country": "US",
        "languages": ["English", "Spanish"],
        "has_resume": true
      }
    ]
  }

- **Response (Error - 400, if invalid parameters)**:
  ```json
  {
    "statusCode": 400,
    "message": "Rating must be between 0 and 5",
    "error": "Bad Request"
  }

### 65. Submit Complaint
- **Endpoint**: `POST /api/complaints`
- **Description**: Allows authenticated jobseekers or employers to submit a complaint against a job post or another user's profile.
- **Headers**: `Authorization: Bearer <token>`
- **Request Body**:
  ```json
  {
    "job_post_id": "<jobPostId>", // Optional, if complaining about a job post
    "profile_id": "<userId>", // Optional, if complaining about a profile
    "reason": "Inappropriate content in the job description"
  }

- **Response (Success - 200)**:
  ```json
  {
    "id": "<complaintId>",
    "complainant_id": "<userId>",
    "job_post_id": "<jobPostId>",
    "profile_id": null,
    "reason": "Inappropriate content in the job description",
    "status": "Pending",
    "created_at": "2025-06-06T12:00:00.000Z",
    "updated_at": "2025-06-06T12:00:00.000Z"
  }

- **Response (Error - 400, if both or neither IDs provided)**:
  ```json
  {
    "statusCode": 400,
    "message": "Either job_post_id or profile_id must be provided",
    "error": "Bad Request"
  }

- **Response (Error - 400, if complaining about own profile)**:
  ```json
  {
    "statusCode": 400,
    "message": "Cannot submit a complaint against your own profile",
    "error": "Bad Request"
  }  

- **Response (Error - 400, if complaint already exists)**:
  ```json
  {
    "statusCode": 400,
    "message": "You have already submitted a pending complaint for this target",
    "error": "Bad Request"
  }    

- **Response (Error - 401, if token invalid)**:
  ```json
  {
    "statusCode": 401,
    "message": "Invalid token",
    "error": "Unauthorized"
  }

- **Response (Error - 404, if target not found)**:
  ```json
  {
    "statusCode": 404,
    "message": "Job post not found",
    "error": "Not Found"
  }

### 66. Get Complaints (Admin)
- **Endpoint**: `GET /api/admin/complaints`
- **Description**: Return a paginated list of complaints for admin review. **Admins only.**  
Includes relations: `complainant`, `job_post`, `profile`, `resolver`. Results are ordered by `created_at DESC`.
- **Headers**: `Authorization: Bearer <token>`
- **Query Parameters**:
  - `page` (number, optional, default: `1`) — must be a positive integer.
  - `limit` (number, optional, default: `10`) — must be a positive integer.
- **Response (Success - 200)**:
  ```json
  {
    "total": 42,
    "data": [
      {
        "id": "cpl_123",
        "complainant_id": "u_111",
        "complainant": { "id": "u_111", "username": "alice", "email": "alice@example.com" },
        "job_post_id": "job_999",
        "job_post": { "id": "job_999", "title": "Virtual Assistant" },
        "profile_id": null,
        "profile": null,
        "reason": "Spam / scam",
        "status": "Pending",
        "resolution_comment": null,
        "resolver_id": null,
        "resolver": null,
        "created_at": "2025-08-15T10:00:00.000Z",
        "updated_at": "2025-08-15T10:00:00.000Z"
      }
    ]
  }
- **Response (Error - 400 Bad Request — invalid page)**:
  ```json
  {"statusCode": 400, "message": "Page must be a positive integer", "error": "Bad Request"}
- **Response (Error - 400 Bad Request — invalid limit)**:
  ```json
  {"statusCode": 400, "message": "Limit must be a positive integer", "error": "Bad Request"} 
- **Response (Error - 401 Unauthorized — authenticated but not an admin per service check)**:  
    ```json
  {"statusCode": 401, "message": "Only admins can view complaints", "error": "Unauthorized"}
- **Response (Error - 401 Unauthorized — missing/malformed token or invalid token)**:  
    ```json
  {"statusCode": 401,"message": "Invalid token","error": "Unauthorized"}  
- **Response (Error - 403 Forbidden — authenticated but not an admin/moderator)**:  
    ```json
  {"statusCode": 403,"message": "Forbidden resource","error": "Forbidden"}  

### 67. Resolve Complaint (Admin)
- **Endpoint**: `POST /api/admin/complaints/:id/resolve`
- **Description**: Resolve or reject a complaint with an optional comment. Admins only. 
Returns the saved complaint entity; the `resolver_id` is set, but a populated `resolver` object is **not** included by this endpoint.
- **Headers**: `Authorization: Bearer <token>`
- **Request Parameters**: `id`: The ID of the complaint.
- **Request Body**:
  ```json
  {
    "status": "Resolved",
    "comment": "Issue addressed with the user"
  }
- **Response (Success - 200)**:
  ```json
  {
    "id": "<complaintId>",
    "complainant_id": "<userId>",
    "job_post_id": "<jobPostId>",
    "profile_id": null,
    "reason": "Inappropriate job description",
    "status": "Resolved",
    "resolution_comment": "Issue addressed with the user",
    "resolver_id": "<adminId>",
    "created_at": "2025-07-31T12:00:00.000Z",
    "updated_at": "2025-07-31T12:10:00.000Z"
  }
- **Response (Error - 401 Unauthorized — authenticated but not an admin per service check)**:  
    ```json
  {"statusCode": 401, "message": "Only admins can view complaints", "error": "Unauthorized"}
- **Response (Error - 401 Unauthorized — missing/malformed token or invalid token)**:  
    ```json
  {"statusCode": 401,"message": "Invalid token","error": "Unauthorized"}  
- **Response (Error - 403 Forbidden — authenticated but not an admin/moderator)**:  
    ```json
  {"statusCode": 403,"message": "Forbidden resource","error": "Forbidden"}  
- **Response (Error - 404 Not Found — complaint does not exist)**:  
    ```json
  {"statusCode": 404, "message": "Complaint not found", "error": "Not Found"} 

### 68. Get Public Statistics
- **Endpoint**: `GET /api/stats`
- **Description**: Retrieves public statistics about the platform, including the total number of resumes (jobseeker profiles), job posts, and employers. Accessible to both authenticated and unauthenticated users.
- **Headers**: None (optional `Authorization: Bearer <token>` for authenticated users, but not required)
- **Request Parameters**: None
- **Response (Success - 200)**:
  ```json
  {
    "totalResumes": 150,
    "totalJobPosts": 300,
    "totalEmployers": 50
  }

### 68. Approve Job Post (Moderator)
- **Endpoint**: `POST api/moderator/job-posts/:id/approve`
- **Description**: Approves a job post by setting pending_review to false (moderator or admin only).
- **Headers**: `Authorization: Bearer <token>`
- **Request Parameters**: `id`: The ID of the job post.
- **Response (Success - 200)**:
  ```json
  {
    "id": "<jobPostId>",
    "title": "Software Engineer",
    "description": "We are looking for a skilled software engineer...",
    "location": "Remote",
    "salary": 50000,
    "status": "Active",
    "pending_review": false,
    "category_id": "<categoryId>",
    "job_type": "Full-time",
    "employer_id": "<employerId>",
    "applicationLimit": 100,
    "created_at": "2025-06-15T06:00:00.000Z",
    "updated_at": "2025-06-15T06:00:00.000Z"
  }

- **Response (Error - 404, if job post not found)**:
  ```json
  {
    "statusCode": 404,
    "message": "Job post not found",
    "error": "Not Found"
  }

- **Response (Error - 401, if not authorized)**:
  ```json
  {
    "statusCode": 401,
    "message": "Only moderators or admins can access this resource",
    "error": "Unauthorized"
  }

### 69. Flag Job Post (Moderator)
- **Endpoint**: `POST api/moderator/job-posts/:id/flag`
- **Description**: Flags a job post for review by setting pending_review to true (moderator or admin only).
- **Headers**: `Authorization: Bearer <token>`
- **Request Parameters**: `id`: The ID of the job post.
- **Response (Success - 200)**:
  ```json
  {
    "id": "<jobPostId>",
    "title": "Software Engineer",
    "description": "We are looking for a skilled software engineer...",
    "location": "Remote",
    "status": "Active",
    "pending_review": true,
    "category_id": "<categoryId>",
    "job_type": "Full-time",
    "employer_id": "<employerId>",
    "applicationLimit": 100,
    "created_at": "2025-06-15T06:00:00.000Z",
    "updated_at": "2025-06-15T06:00:00.000Z"
  }

- **Response (Error - 404, if job post not found)**:
  ```json
  {
    "statusCode": 404,
    "message": "Job post not found",
    "error": "Not Found"
  }

- **Response (Error - 404, if job post not found)**:
  ```json
  {
    "statusCode": 401,
    "message": "Only moderators or admins can access this resource",
    "error": "Unauthorized"
  }

### 70. Get All Reviews (Moderator)
- **Endpoint**: `GET api/moderator/reviews`
- **Description**: Retrieves all reviews (moderator or admin only).
- **Headers**: `Authorization: Bearer <token>`
- **Response (Success - 200)**:
  ```json
  [
    {
      "id": "<reviewId>",
      "reviewer_id": "<userId>",
      "reviewed_id": "<userId>",
      "job_application_id": "<jobApplicationId>",
      "rating": 4,
      "comment": "Great work, very professional!",
      "reviewer": {
        "id": "<userId>",
        "email": "employer4@example.com",
        "username": "employer4",
        "role": "employer"
      },
      "reviewed": {
        "id": "<userId>",
        "email": "jobseeker1@example.com",
        "username": "jobseeker1",
        "role": "jobseeker"
      },
      "job_application": {
        "id": "<jobApplicationId>",
        "job_post_id": "<jobPostId>",
        "job_seeker_id": "<userId>",
        "status": "Accepted"
      },
      "created_at": "2025-06-13T18:00:00.000Z",
      "updated_at": "2025-06-13T18:00:00.000Z"
    }
  ]

- **Response (Error - 401, if not authorized)**:
  ```json
  {
    "statusCode": 401,
    "message": "Only moderators or admins can access this resource",
    "error": "Unauthorized"
  }

### 71. Delete Review (Moderator)
- **Endpoint**: `DELETE api/moderator/reviews/:id`
- **Description**: Deletes a specific review (moderator or admin only).
- **Headers**: `Authorization: Bearer <token>`
- **Request Parameters**: `id`: The ID of the review.
- **Response (Success - 200)**:
  ```json
  {
    "message": "Review deleted successfully"
  }

- **Response (Error - 404, if review not found)**:
  ```json
  {
    "statusCode": 404,
    "message": "Review not found",
    "error": "Not Found"
  }

- **Response (Error - 401, if not authorized)**:
  ```json
  {
    "statusCode": 401,
    "message": "Only moderators or admins can access this resource",
    "error": "Unauthorized"
  }

### 72. Get All Complaints (Moderator)
- **Endpoint**: `GET api/moderator/complaints`
- **Description**: Retrieves all complaints for moderator review.
- **Headers**: `Authorization: Bearer <token>`
- **Response (Success - 200)**:
  ```json
  [
    {
      "id": "<complaintId>",
      "complainant_id": "<userId>",
      "complainant": {
        "id": "<userId>",
        "username": "john_doe",
        "email": "john@example.com",
        "role": "jobseeker"
      },
      "job_post_id": "<jobPostId>",
      "job_post": {
        "id": "<jobPostId>",
        "title": "Software Engineer",
        "description": "Looking for a skilled engineer"
      },
      "profile_id": null,
      "reason": "Inappropriate content in the job description",
      "status": "Pending",
      "created_at": "2025-06-06T12:00:00.000Z",
      "updated_at": "2025-06-06T12:00:00.000Z"
    }
  ]

- **Response (Error - 401, if not authorized)**:
  ```json
  {
    "statusCode": 401,
    "message": "Only moderators or admins can access this resource",
    "error": "Unauthorized"
  }

### 73. Resolve Complaint (Moderator)
- **Endpoint**: `POST api/moderator/complaints/:id/resolve`
- **Description**: Allows moderators to resolve or reject a complaint with an optional comment.
- **Headers**: `Authorization: Bearer <token>`
- **Request Parameters**: `id`: The ID of the complaint.
- **Request Body**:
  ```json
  {
    "status": "Resolved",
    "comment": "Issue addressed with the user"
  }

- **Response (Success - 200)**:
  ```json
  {
    "id": "<complaintId>",
    "complainant_id": "<userId>",
    "job_post_id": "<jobPostId>",
    "profile_id": null,
    "reason": "Inappropriate content in the job description",
    "status": "Resolved",
    "resolution_comment": "Issue addressed with the user",
    "created_at": "2025-06-06T12:00:00.000Z",
    "updated_at": "2025-06-06T12:30:00.000Z"
  }

- **Response (Error - 401, if not authorized)**:
  ```json
  {
    "statusCode": 401,
    "message": "Only moderators or admins can access this resource",
    "error": "Unauthorized"
  }

- **Response (Error - 404, if complaint not found)**:
  ```json
  {
    "statusCode": 404,
    "message": "Complaint not found",
    "error": "Not Found"
  }

### 74. Notify Job Seekers (Admin)
- **Endpoint**: `POST /api/admin/job-posts/:id/notify-candidates`
- **Description**: Send email notifications to **eligible jobseekers** whose skills/categories match the job post’s categories. Only **Active** job posts are eligible. Users who already applied to the job or already received a notification for this job are excluded. The selection can be ordered by earliest signups, latest signups, or randomized. The effective send limit is capped at **1000** per request.
- **Headers**: `Authorization: Bearer <token>`
- **Request Parameters**: `id`: The ID of the job post
- **Request Body**:
  ```json
  {
    "limit": 50,
    "orderBy": "end"   // one of: "beginning" | "end" | "random"
  }
- **Response (Success - 200)**:
  ```json
  {
    "total": 120,
    "sent": 50,
    "emails": ["user1@example.com", "user2@example.com"],
    "jobPostId": "<jobPostId>"
  }
- **Response (Error - 400 Bad Request — invalid input)**:
  ```json
  {"statusCode": 400, "message": "Limit must be a positive integer", "error": "Bad Request"}
  {"statusCode": 400, "message": "OrderBy must be one of: beginning, end, random", "error": "Bad Request"}
  {"statusCode": 400, "message": "Notifications can only be sent for active job posts", "error": "Bad Request"}
  {"statusCode": 400, "message": "Job post has no categories assigned", "error": "Bad Request"}
- **Response (Error - 401 Unauthorized — missing/malformed token or invalid token)**:
  ```json
  {"statusCode": 401, "message": "Invalid token", "error": "Unauthorized"}
- **Response (Error - 403 Forbidden — not an admin)**:
  ```json
  {"statusCode": 403, "message": "Forbidden resource", "error": "Forbidden"}
- **Response (Error - 404 Not Found — job post does not exist)**:
  ```json
  {"statusCode": 404, "message": "Job post not found", "error": "Not Found"}

### 74.1 Notify Referral Applicants (Admin)
- **Endpoint**: `POST /api/admin/job-posts/:id/notify-referral-applicants`
- **Description**: Send email notifications to **eligible jobseekers who previously registered via referral links** that pointed to **job posts sharing at least one category** with the target job. Only **Active** job posts are eligible. Users who already applied to the target job or already received a notification for this job are excluded. Selection can be ordered by earliest signups, latest signups, or randomized. The effective send limit is capped at **1000** per request.
- **Headers**: `Authorization: Bearer <token>`
- **Request Parameters**: `id`: The ID of the job post
- **Request Body**:
  ```json
  {
    "limit": 50,
    "orderBy": "end"   // one of: "beginning" | "end" | "random"
  }
- **Response (Success - 200)**:
  ```json
  {
    "total": 120,
    "sent": 50,
    "jobPostId": "<jobPostId>"
  }
- **Response (Error - 400 Bad Request — invalid input)**:
  ```json
  {"statusCode": 400, "message": "Limit must be a positive integer", "error": "Bad Request"}
  {"statusCode": 400, "message": "OrderBy must be one of: beginning, end, random", "error": "Bad Request"}
  {"statusCode": 400, "message": "Notifications can only be sent for active job posts", "error": "Bad Request"}
  {"statusCode": 400, "message": "Job post has no categories assigned", "error": "Bad Request"}
- **Response (Error - 401 Unauthorized — missing/malformed token or invalid token)**:
  ```json
  {"statusCode": 401, "message": "Invalid token", "error": "Unauthorized"}
- **Response (Error - 403 Forbidden — not an admin)**:
  ```json
  {"statusCode": 403, "message": "Forbidden resource", "error": "Forbidden"}
- **Response (Error - 404 Not Found — job post does not exist)**:
  ```json
  {"statusCode": 404, "message": "Job post not found", "error": "Not Found"}

### 74.1 Notify Referral Applicants (Admin)
- **Endpoint**: `POST /api/admin/job-posts/:id/notify-referral-applicants`
- **Description**: Sends email notifications only to applicants who have previously applied via referral links for jobs in the same category as the specified vacancy. Allows you to select the recipient limit and the selection order by registration date.
- **Headers**: `Authorization: Bearer <token>`
- **Request Parameters**: `id`: The ID of the job post
- **Request Body**:
  ```json
  {
    "limit": 50,
    "orderBy": "end" // Options: "beginning", "end", "random"
  }

- **Response (Success - 200)**:
  ```json
  {
    "total": 120,
    "sent": 50,
    "jobPostId": "<jobPostId>"
  }

- **Response (Error - 400, invalid input)**:
  ```json
  {
    "statusCode": 400,
    "message": "Limit must be a positive integer",
    "error": "Bad Request"
  }

- **Response (Error - 400, no category)**:
  ```json
  {
    "statusCode": 400,
    "message": "Job post has no category assigned",
    "error": "Bad Request"
  }

- **Response (Error - 401, unauthorized)**:
  ```json
  {
    "statusCode": 401,
    "message": "Invalid token",
    "error": "Unauthorized"
  }

- **Response (Error - 404, job post not found)**:
  ```json
  {
    "statusCode": 404,
    "message": "Job post not found",
    "error": "Not Found"
  }  

### 75. Get Chat History (Admin)
- **Endpoint**: `GET /api/admin/chat/:jobApplicationId`
- **Description**: Retrieve the chat history for a specific job application. Results are ordered by `created_at ASC`. Admins only.
- **Headers**: `Authorization: Bearer <token>` (Required, JWT token).
- **Path Parameters**: `jobApplicationId` (string, required): The ID of the job application.
- **Query Parameters**:
  - `page` (number, optional, default: `1`) — must be a positive integer.
  - `limit` (number, optional, default: `10`) — must be a positive integer.
- **Response (Success - 200)**:
  ```json
  {
    "total": 50,
    "data": [
      {
        "id": "<messageId>",
        "job_application_id": "<jobApplicationId>",
        "sender_id": "<userId>",
        "sender": { "id": "<userId>", "username": "john_doe", "email": "john@example.com", "role": "jobseeker" },
        "recipient_id": "<userId>",
        "recipient": { "id": "<userId>", "username": "jane_smith", "email": "jane@example.com", "role":   "employer" },
        "content": "Hello, let's discuss the project!",
        "created_at": "2025-06-16T05:47:00.000Z",
        "is_read": false
      }
    ]
  }
- **Response (Error - 400 Bad Request — invalid pagination)**:
  ```json
  {"statusCode": 400, "message": "Page must be a positive integer", "error": "Bad Request"}
  {"statusCode": 400, "message": "Limit must be a positive integer", "error": "Bad Request"}
- **Response (Error - 401 Unauthorized — missing/malformed token or invalid token)**:
  ```json
  {"statusCode": 401, "message": "Invalid token", "error": "Unauthorized"}
- **Response (Error - 403 Forbidden — not an admin)**:
  ```json
  {"statusCode": 403, "message": "Forbidden resource", "error": "Forbidden"}
- **Response (Error - 404 Not Found — job application does not exist)**:
  ```json
  {"statusCode": 404, "message": "Job application not found", "error": "Not Found"}

### 76. Get All Job Posts (Moderator)
- **Endpoint**: `GET /api/moderator/job-posts`
- **Description**: Retrieves all job posts (moderator or admin only) with optional filters, pagination, and sorting. Supports filtering by status, pending review status, and job title (partial match). Returns total count and paginated data for frontend pagination.
- **Headers**: `Authorization: Bearer <token>`
- **Query Parameters**:
  - `status` (string, optional): Filter by status ("Active", "Draft", "Closed").
  - `pendingReview` (string, optional): Filter by pending review status ("true" or "false").
  - `title` (string, optional): Filter by job title (partial match, case-insensitive).
  - `page` (number, optional): Page number for pagination (default: 1).
  - `limit` (number, optional): Number of items per page (default: 10).
- **Example Request**: `/api/moderator/job-posts?status=Active&pendingReview=false&title=Software&page=1&limit=10`
- **Response (Success - 200)**:
  ```json
  {
    "total": 50,
    "data": [
      {
        "id": "<jobPostId>",
        "title": "Software Engineer",
        "description": "We are looking for a skilled software engineer...",
        "location": "Remote",
        "salary": 50000,
        "status": "Active",
        "pending_review": false,
        "category_id": "<categoryId>",
        "category": {
          "id": "<categoryId>",
          "name": "Software Development",
          "created_at": "2025-05-15T06:12:00.000Z",
          "updated_at": "2025-05-15T06:12:00.000Z"
        },
        "job_type": "Full-time",
        "employer_id": "<employerId>",
        "employer": {
          "id": "<employerId>",
          "email": "employer100@example.com",
          "username": "jane_smith100",
          "role": "employer"
        },
        "views": 0,
        "required_skills": ["JavaScript", "TypeScript"],
        "created_at": "2025-05-15T06:12:00.000Z",
        "updated_at": "2025-05-15T06:12:00.000Z"
      }
    ]
  }
- **Response (Error - 400, if pagination parameters incorrect)**:
  ```json
  {
    "statusCode": 400,
    "message": "Page must be a positive integer",
    "error": "Bad Request"
  }
- **Response (Error - 401, if not authorized)**:
  ```json
  {
    "statusCode": 401,
    "message": "Only moderators or admins can access this resource",
    "error": "Unauthorized"
  }

### 77. Submit Success Story
- **Endpoint**: `POST /api/platform-feedback`
- **Description**: Allows authenticated jobseekers or employers to submit feedback or success stories about the platform.
- **Headers**: `Authorization: Bearer <token>`
- **Request Body**:
  ```json
  {
    "headline": "Landed my first remote role via Jobforge",
    "story": "I applied to 3 roles and got 2 interviews within a week...",
    "rating": 5,
    "allow_publish": true,
    "company": "Acme Inc",
    "country": "CA"
  }

- **Response (Success - 200)**:
  ```json
  {
    "id": "<id>",
    "user_id": "<userId>",
    "role": "jobseeker",
    "headline": "Landed my first remote role via Jobforge",
    "story": "I applied to 3 roles and got 2 interviews within a week...",
    "rating": 5,
    "allowed_to_publish": true,
    "is_public": true,
    "company": "Acme Inc",
    "country": "CA",
    "created_at": "2025-08-15T10:00:00.000Z",
    "updated_at": "2025-08-15T10:00:00.000Z"
  }

- **Response (Error - 400, if rating is invalid)**:
  ```json
  {
    "statusCode": 400,
    "message": "Rating must be between 1 and 5",
    "error": "Bad Request"
  }

- **Response (Error - 400, if description is missing)**:
  ```json
  {
    "statusCode": 400,
    "message": "Description is required",
    "error": "Bad Request"
  }

- **Response (Error - 401, if token is invalid or user is not jobseeker/employer)**:
  ```json
  {
    "statusCode": 401,
    "message": "Only jobseekers and employers can submit platform feedback",
    "error": "Unauthorized"
  }

- **Response (Error - 404, if user not found)**:
  ```json
  {
    "statusCode": 404,
    "message": "User not found",
    "error": "Not Found"
  }

### 78. Get Success Stories (Public)
- **Endpoint**: `GET /api/platform-feedback`
- **Description**: Retrieves a paginated list of platform feedback and success stories, accessible to all users (including unauthenticated). Returns only published (is_public=true)
- **Query Parameters**:
    - `page` (number, optional): Page number for pagination (default: 1).
    - `limit` (number, optional): Number of items per page (default: 10).
- **Example Request**: `/api/platform-feedback?page=1&limit=10`
- **Response (Success - 200)**:
  ```json
  {
    "total": 50,
    "data": [
      {
        "id": "<id>",
        "headline": "Hired in 10 days",
        "story": "Your platform matched me with a perfect role...",
        "rating": 5,
        "company": "Globex",
        "country": "SE",
        "created_at": "2025-08-01T12:00:00.000Z",
        "updated_at": "2025-08-01T12:00:00.000Z",
        "user": { "id": "<uid>", "username": "anna", "role": "jobseeker" }
      }
    ]
  }

- **Response (Error - 400, if pagination parameters are invalid)**:
  ```json
  {
    "statusCode": 400,
    "message": "Page must be a positive integer",
    "error": "Bad Request"
  }

### 79. Get Platform Feedback (Admin/Moderator)
- **Endpoint**: `GET /api/admin/platform-feedback`
- **Endpoint**: `GET /api/moderator/platform-feedback`
- **Description**: Return a paginated list of all platform feedback entries (success stories and reviews), including both **published and unpublished** items. Includes the submitting user.
- **Headers**: `Authorization: Bearer <token>`
- **Query Parameters**:
  - `page` (number, optional, default: `1`) — must be a positive integer.
  - `limit` (number, optional, default: `10`) — must be a positive integer.
- **Example Request**: `/api/admin/platform-feedback?page=1&limit=10`
- **Response (Success - 200)**:
  ```json
  {
    "total": 42,
    "data": [
      {
        "id": "fdb-uuid",
        "user_id": "user-uuid",
        "role": "jobseeker",
        "headline": "Hired in 10 days",
        "story": "Your platform matched me with a perfect role...",
        "rating": 5,
        "allowed_to_publish": true,
        "is_public": true,
        "company": "Globex",
        "country": "SE",
        "created_at": "2025-08-12T10:00:00.000Z",
        "updated_at": "2025-08-12T10:00:00.000Z",
        "user": {
          "id": "user-uuid",
          "username": "anna",
          "role": "jobseeker"
        }
      }
    ]
  }
- **Response (Error - 400 Bad Request — invalid page)**:
  ```json
  {"statusCode": 400, "message": "Page must be a positive integer", "error": "Bad Request"}
- **Response (Error - 400 Bad Request — invalid limit)**:
  ```json
  {"statusCode": 400, "message": "Limit must be a positive integer", "error": "Bad Request"}
- **Response (Error - 401 Unauthorized — missing/malformed token or invalid token)**:
  ```json
  {"statusCode": 401,"message": "Invalid token","error": "Unauthorized"}
- **Response (Error - 401 Unauthorized — authenticated but not admin/moderator per service check)**:
  ```json
  {"statusCode": 401, "message": "Only admins or moderators can access this resource", "error": "Unauthorized"}
- **Response (Error - 403 Forbidden — authenticated but not an admin/moderator)**:
  ```json
  {"statusCode": 403,"message": "Forbidden resource","error": "Forbidden"}  

### 79.1 Publish Platform Feedback (Admin/Moderator)
- **Endpoint**: `PATCH /api/admin/platform-feedback/:id/publish`
- **Endpoint**: `PATCH /api/moderator/platform-feedback/:id/publish`
- **Description**: Publish a platform feedback entry by setting `is_public = true`. Allowed **only** if the submitter consented (`allowed_to_publish = true`). Admins or moderators.
- **Headers**: `Authorization: Bearer <token>`
- **Params**:
    - `id` — ID записи платформенного фидбека
- **Response (Success - 200)**:
  ```json
  {
    "id": "fdb-uuid",
    "user_id": "user-uuid",
    "role": "employer",
    "headline": "Closed a hard role with Jobforge",
    "story": "Posting and screening saved us days...",
    "rating": 5,
    "allowed_to_publish": true,
    "is_public": true,
    "company": "Acme Inc",
    "country": "CA",
    "created_at": "2025-08-10T09:00:00.000Z",
    "updated_at": "2025-08-15T11:20:00.000Z"
  }
- **Response (Error - 400 Bad Request — no consent)**:
  ```json
  {"statusCode": 400, "message": "User did not allow publishing this story", "error": "Bad Request"}
- **Response (Error - 401 Unauthorized — missing/malformed token or invalid token)**:
  ```json
  {"statusCode": 401,"message": "Invalid token","error": "Unauthorized"}
- **Response (Error - 401 Unauthorized — authenticated but not admin/moderator per service check)**:
  ```json
  {"statusCode": 401, "message": "Only admins or moderators can access this resource", "error": "Unauthorized"}
- **Response (Error - 403 Forbidden — authenticated but not an admin/moderator)**:
  ```json
  {"statusCode": 403,"message": "Forbidden resource","error": "Forbidden"}  
- **Response (Error - 404 Not Found — feedback does not exist)**:
  ```json
  {"statusCode": 404, "message": "Platform feedback not found", "error": "Not Found"}  

### 79.2 Unpublish Platform Feedback (Admin/Moderator)
- **Endpoint**: `PATCH /api/admin/platform-feedback/:id/unpublish`
- **Endpoint**: `PATCH /api/moderator/platform-feedback/:id/unpublish`
- **Description**: Unpublish a platform feedback entry by setting `is_public = false`. Admins or moderators.
- **Headers**: `Authorization: Bearer <token>`
- **Params**: `id` (string, required): Platform feedback ID.
- **Response (Success - 200)**:
  ```json
  {
    "id": "fdb-uuid",
    "user_id": "user-uuid",
    "role": "jobseeker",
    "headline": "Got my first remote role",
    "story": "After 2 interviews I got an offer...",
    "rating": 4,
    "allowed_to_publish": true,
    "is_public": false,
    "company": "Globex",
    "country": "SE",
    "created_at": "2025-08-09T08:30:00.000Z",
    "updated_at": "2025-08-15T11:22:00.000Z"
  }
- **Response (Error - 401 Unauthorized — missing/malformed token or invalid token)**:
  ```json
  {"statusCode": 401,"message": "Invalid token","error": "Unauthorized"}
- **Response (Error - 401 Unauthorized — authenticated but not admin/moderator per service check)**:
  ```json
  {"statusCode": 401, "message": "Only admins or moderators can access this resource", "error": "Unauthorized"}
- **Response (Error - 403 Forbidden — authenticated but not an admin/moderator)**:
  ```json
  {"statusCode": 403,"message": "Forbidden resource","error": "Forbidden"}  
- **Response (Error - 404 Not Found — feedback does not exist)**:
  ```json
  {"statusCode": 404, "message": "Platform feedback not found", "error": "Not Found"} 

### 80. Delete Platform Feedback (Admin/Moderator)
- **Endpoint**: `DELETE /api/admin/platform-feedback/:id`
- **Endpoint**: `DELETE /api/moderator/platform-feedback/:id`
- **Description**: Delete a specific platform feedback entry. Admins or moderators.
- **Headers**: `Authorization: Bearer <token>`
- **Request Parameters**: `id`: The ID of the feedback.
- **Example Request**: `DELETE /api/admin/platform-feedback/fdb-uuid`
- **Response (Success - 200)**:
  ```json
  { "message": "Platform feedback deleted successfully" }
- **Response (Error - 401 Unauthorized — missing/malformed token or invalid token)**:
  ```json
  {"statusCode": 401,"message": "Invalid token","error": "Unauthorized"}
- **Response (Error - 401 Unauthorized — authenticated but not admin/moderator per service check)**:
  ```json
  {"statusCode": 401, "message": "Only admins or moderators can access this resource", "error": "Unauthorized"}
- **Response (Error - 403 Forbidden — authenticated but not an admin/moderator)**:
  ```json
  {"statusCode": 403,"message": "Forbidden resource","error": "Forbidden"}  
- **Response (Error - 404 Not Found — feedback does not exist)**:
  ```json
  {"statusCode": 404, "message": "Platform feedback not found", "error": "Not Found"}   

### 81. Reject Job Post (Admin/Moderator)
- **Endpoint**: `POST /api/admin/job-posts/:id/reject`
- **Endpoint**: `POST /api/moderator/job-posts/:id/reject`
- **Description**: Rejects a job post by **deleting** it and notifying the employer with the rejection reason. **Admins and moderators** only. Also deletes related records: job applications (and their reviews and messages), application limits, and complaints for the job post. A rejection email is attempted; if sending fails, the rejection still succeeds.
- **Headers**: `Authorization: Bearer <token>`
- **Request Parameters**: `id`: The ID of the job post.
- **Request Body**:
  ```json
  {"reason": "Inappropriate content in job description"}
- **Response (Success - 200)**:
  ```json
  {
    "message": "Job post rejected successfully",
    "reason": "Inappropriate content in job description"
  }
- **Response (Error - 400, if reason is missing)**:
  ```json
  {"statusCode": 400,"message": "Reason for rejection is required","error": "Bad Request"}
- **Response (Error - 401 Unauthorized — missing/malformed token or invalid token)**:
  ```json
  {"statusCode": 401,"message": "Invalid token","error": "Unauthorized"}
- **Response (Error - 403 Forbidden — authenticated but not an admin/moderator)**:
  ```json
  {"statusCode": 403,"message": "Forbidden resource","error": "Forbidden"}  
- **Response (Error - 404, if job post not found)**:
  ```json
  {"statusCode": 404,"message": "Job post not found","error": "Not Found"}

### 82. Get Email Notification Stats for Job Post (Admin)
- **Endpoint**: `GET /api/admin/job-posts/:id/email-stats`
- **Description**: Retrieve email notification statistics for a specific job post: total **sent**, **opened**, **clicked**, plus per-recipient details. Admins only.
- **Headers**: `Authorization: Bearer <token>`
- **Request Parameters**: `id`: The ID of the job post.
- **Response (Success - 200)**:
  ```json
  {
    "sent": 20,
    "opened": 10,
    "clicked": 5,
    "details": [
      {
        "email": "user1@example.com",
        "username": "user1",
        "opened": true,
        "clicked": false,
        "sent_at": "2025-07-28T12:00:00.000Z",
        "opened_at": "2025-07-28T12:05:00.000Z",
        "clicked_at": null
      }
    ]
  }
- **Response (Error - 401 Unauthorized — missing/malformed token or invalid token)**:
  ```json
  {"statusCode": 401,"message": "Invalid token","error": "Unauthorized"}
- **Response (Error - 403 Forbidden — authenticated but not an admin/moderator)**:
  ```json
  {"statusCode": 403,"message": "Forbidden resource","error": "Forbidden"}  
- **Response (Error - 404, if job post not found)**:
  ```json
  {"statusCode": 404,"message": "Job post not found","error": "Not Found"}

### 83. Get All Email Notification Stats (Admin)
- **Endpoint**: `GET /api/admin/email-stats`
- **Description**: Returns aggregated email notification statistics **across all job posts**, with optional filters. Includes totals for **sent**, **opened**, **clicked**, plus per-recipient details. Admins only.
- **Headers**: `Authorization: Bearer <token>`
- **Query Parameters**: 
  - `jobPostId` (string): Filter by a specific job post ID.
  - `title` (string): Filter by job post title (partial match; uses SQL `LIKE`, case-sensitive with current DB  collation).
  - `employerId` (string): Filter by employer user ID.
  - `employerEmail` (string): Filter by employer email (partial match; `LIKE`).
  - `employerUsername` (string): Filter by employer username (partial match; `LIKE`).
- **Response (Success - 200)**:
  ```json
  {
    "sent": 100,
    "opened": 50,
    "clicked": 20,
    "details": [
      {
        "job_post_id": "<jobPostId>",
        "email": "user1@example.com",
        "username": "user1",
        "opened": true,
        "clicked": false,
        "sent_at": "2025-07-28T12:00:00.000Z",
        "opened_at": "2025-07-28T12:05:00.000Z",
        "clicked_at": null
      }
    ]
  }
- **Response (Error - 401 Unauthorized — missing/malformed token or invalid token)**:
  ```json
  {"statusCode": 401,"message": "Invalid token","error": "Unauthorized"}
- **Response (Error - 403 Forbidden — authenticated but not an admin/moderator)**:
  ```json
  {"statusCode": 403,"message": "Forbidden resource","error": "Forbidden"}  

### 84. Create Referral Link for Job Post (Admin/Moderator)
- **Endpoint**: `POST /api/admin/job-posts/:id/referral-links`
- **Endpoint**: `POST /api/moderator/job-posts/:id/referral-links`
- **Description**: Creates a new referral link for the specified job post. Multiple links per job post are allowed. Returns both the **pretty** campaign link (`/job/<slug_id>?ref=<code>`) and a **legacy** short link (`/ref/<code>`).
- **Headers**: `Authorization: Bearer <token>`
- **Request Parameters**: `id` — Job post ID.
- **Body**: 
  ```json
  {"description": "Facebook Ads, campaign A"}  
- **Response (Success - 200)**:
  ```json
  {
    "id": "<linkId>",
    "refCode": "<uuid>",
    "jobPostId": "<jobPostId>",
    "description": "Facebook Ads, campaign A",
    "clicks": 0,
    "registrations": 0,
    "registrationsVerified": 0,
    "fullLink": "https://jobforge.net/job/<slug_id>?ref=<uuid>",
    "legacyLink": "https://jobforge.net/ref/<uuid>"
  }
- **Response (Error - 401 Unauthorized — missing/malformed token or invalid token)**:
  ```json
  {"statusCode": 401,"message": "Invalid token","error": "Unauthorized"}
- **Response (Error - 404 Not Found — job post does not exist)**:
  ```json
  {"statusCode": 404, "message": "Job post not found", "error": "Not Found"} 

### 85. Get All Referral Links (Admin/Moderator)
- **Endpoint**: `GET /api/admin/referral-links`
- **Endpoint**: `GET /api/moderator/referral-links`
- **Description**: Returns all generated referral links with job post context, click and registration counts, and per-registration user details. Supports filtering by job post ID and job title (partial match).
- **Query Parameters**:
- `jobId` (string, optional) — Filter by a specific job post ID.
- `jobTitle` (string, optional) — Filter by job post title (partial, case-insensitive).
- **Headers**: `Authorization: Bearer <token>`
- **Response (Success - 200)**:
  ```json
  [
    {
      "id": "link_123",
      "jobPostId": "job_999",
      "refCode": "6a5f4c1e-0b0e-4f9b-9a3e-0f0b1c2d3e4f",
      "fullLink": "https://jobforge.net/job/software-engineer-remote--8df3b0be? ref=6a5f4c1e-0b0e-4f9b-9a3e-0f0b1c2d3e4f",
      "legacyLink": "https://jobforge.net/ref/6a5f4c1e-0b0e-4f9b-9a3e-0f0b1c2d3e4f",
      "description": "Facebook Ads, campaign A",
      "clicks": 10,
      "registrations": 5,
      "registrationsVerified": 3,
      "registrationsDetails": [
        {
          "id": "reg_1",
          "user": {
            "id": "u_1",
            "email": "user1@example.com",
            "username": "user1",
            "is_email_verified": true
          },
          "created_at": "2025-07-31T00:05:00.000Z"
        }
      ],
      "job_post": {
        "id": "job_999",
        "title": "Software Engineer",
        "slug": "software-engineer-remote",
        "slug_id": "software-engineer-remote--8df3b0be"
      }
    }
  ]
- **Response (Error - 401 Unauthorized — missing/malformed token or invalid token)**:
  ```json
  {"statusCode": 401,"message": "Invalid token","error": "Unauthorized"}

### 85.1 List Referral Links for a Job Post (Admin/Moderator)
- **Endpoint**: `GET /api/admin/job-posts/:id/referral-links`
- **Endpoint**: `GET /api/moderator/job-posts/:id/referral-links`
- **Description**: Returns all referral links created for the specified job post, including counts (clicks, registrations, verified registrations) and registration details.
**Path Parameters**: `id` — Job post ID.
- **Response (Success - 200)**:
  ```json
  [
    {
      "id": "<linkId>",
      "jobPostId": "<jobPostId>",
      "refCode": "<uuid>",
      "fullLink": "https://jobforge.net/job/<slug_id>?ref=<uuid>",
      "legacyLink": "https://jobforge.net/ref/<uuid>",
      "description": "Facebook Ads, campaign A",
      "clicks": 10,
      "registrations": 5,
      "registrationsVerified": 3,
      "registrationsDetails": [
        {
          "id": "<registrationId>",
          "created_at": "2025-07-31T00:00:00.000Z",
          "user": {
            "id": "<userId>",
            "email": "user@example.com",
            "username": "john_doe",
            "is_email_verified": true
          }
        }
      ]
    }
  ]
- **Response (Error - 401 Unauthorized — missing/malformed token or invalid token)**:
  ```json
  {"statusCode": 401,"message": "Invalid token","error": "Unauthorized"}  

### 85.2 Update Referral Link Description (Admin/Moderator)
- **Endpoint**: `PUT /api/admin/referral-links/:linkId`
- **Endpoint**: `PUT /api/moderator/referral-links/:linkId`
- **Description**: Updates the `description` field of a specific referral link.
- **Path Parameters**: `id` — Job post ID.
- **Body**: 
  ```json
  { "description": "YouTube Influencer X" } 
- **Response (Success - 200)**:
  ```json
  {
    "message": "Updated",
    "id": "<linkId>",
    "description": "YouTube Influencer X"
  }
- **Response (Error - 401 Unauthorized — missing/malformed token or invalid token)**:
  ```json
  {"statusCode": 401,"message": "Invalid token","error": "Unauthorized"}   
- **Response (Error - 404 Not Found — referral link does not exist)**:
  ```json
  {"statusCode": 404, "message": "Referral link not found", "error": "Not Found"}  

### 85.3 Delete Referral Link (Admin/Moderator)
- **Endpoint**: `DELETE /api/admin/referral-links/:linkId`
- **Endpoint**: `DELETE /api/moderator/referral-links/:linkId`
- **Description**: Deletes a specific referral link.
- **Path Parameters**: `id` — Job post ID.
- **Body**: 
  ```json
  { "description": "YouTube Influencer X" } 
- **Response (Success - 200)**:
  ```json
  { "message": "Deleted" }
- **Response (Error - 401 Unauthorized — missing/malformed token or invalid token)**:
  ```json
  {"statusCode": 401,"message": "Invalid token","error": "Unauthorized"}   
- **Response (Error - 404 Not Found — referral link does not exist)**:
  ```json
  {"statusCode": 404, "message": "Referral link not found", "error": "Not Found"}  

### 86. Referral Redirect (Public)
- **Endpoint**: `GET /ref/:refCode`
- **Description**: Increments click count and redirects to the job post page.
- **Response: Redirect to /jobs/<jobid>, or 404 if invalid.</jobid>**

### 86.1 Track Referral Click (Public)
- **Endpoint**: `POST /api/ref/track`
- **Description**: Регистрирует клик по рефкоду на SPA-лендинге (когда открывается /job/<slug_id>?ref=<refCode>). Вызывать один раз при первом маунте страницы.
- **Response: { "ok": true, "jobPostId": "<jobPostId>" }**

### 87. Get Chat History
- **Endpoint**: `GET /api/chat/:jobApplicationId`
- **Description**: Retrieves the chat history for a specific job application with pagination. Accessible only to the jobseeker or employer associated with the accepted job application. Messages are ordered by `created_at` in ascending order.
- **Headers**: `Authorization: Bearer <token>` (Required, JWT token).
- **Path Parameters**: `jobApplicationId` (string, required): The ID of the job application.
- **Query Parameters**: 
  - `page` (number, optional): Page number for pagination (default: 1).
  - `limit` (number, optional): Number of messages per page (default: 10).
- **Response (Success - 200)**:
  ```json
  {
    "total": 50,
    "data": [
      {
        "id": "<messageId>",
        "job_application_id": "<jobApplicationId>",
        "sender_id": "<userId>",
        "sender": {
          "id": "<userId>",
          "username": "john_doe",
          "email": "john@example.com",
          "role": "jobseeker"
        },
        "recipient_id": "<userId>",
        "recipient": {
          "id": "<userId>",
          "username": "jane_smith",
          "email": "jane@example.com",
          "role": "employer"
        },
        "content": "Hello, let's discuss the project!",
        "created_at": "2025-06-16T05:47:00.000Z",
        "is_read": false
      }
    ]
  }

- **Response (Error - 401, if token is invalid or user lacks access)**:
  ```json
  {
    "statusCode": 401,
    "message": "Invalid token",  // or "No access to this chat"
    "error": "Unauthorized"
  }

- **Response (Error - 400, if pagination parameters are invalid)**:
  ```json
  {
    "statusCode": 400,
    "message": "Page must be a positive integer",  // or similar for limit
    "error": "Bad Request"
  }

- **Response (Error - 404, if job application not found or not accepted)**:
  ```json
  {
    "statusCode": 404,
    "message": "Job application not found",  // or "Chat is only available for accepted applications"
    "error": "Not Found"
  }

### 88. Get Job Posts by Main Categories Stats
- **Endpoint**: `GET /stats/job-posts-by-main-categories`
- **Description**: Description: Retrieves statistics on the number of active job posts (vacancies) for each main category (categories without a parent_id), including the count of active job posts from their subcategories (recursive). Only active and approved job posts are counted (status = 'Active', pending_review = false). Excludes categories with zero job posts. Results are sorted by count in descending order.
- **Headers**: None (public endpoint)
- **Request Body**: None
- **Response (Success - 200)**:
  ```json
  [
    { "categoryId": "<mainCatId>", "categoryName": "Development", "count": 42 }
  ]

- **Response (Error - 500, if internal error)**:
  ```json
  {
    "statusCode": 500,
    "message": "Internal server error",
    "error": "Internal Server Error"
  }

### 89. Get Job Posts by Subcategories Stats
- **Endpoint**: `GET /stats/job-posts-by-subcategories`
- **Description**: Retrieves statistics on the number of active job posts (vacancies) for each subcategory (categories with a parent_id), counting only the job posts directly associated with the subcategory (no recursive counting). Only active and approved job posts are counted (status = 'Active', pending_review = false). Excludes subcategories with zero job posts. Results are sorted by count in descending order.
- **Headers**: None (public endpoint)
- **Request Body**: None
- **Response (Success - 200)**:
  ```json
  [
    { "categoryId": "<subCatId>", "categoryName": "Frontend", "count": 17 }
  ]

- **Response (Error - 500, if internal error)**:
  ```json
  {
    "statusCode": 500,
    "message": "Internal server error",
    "error": "Internal Server Error"
  }  

### 90. Contact — Send a message
- **Endpoint:** `POST /api/contact`
- **Description:** Sends a message from the website contact form to the support inbox (support@jobforge.net) via Brevo. Single endpoint, two modes:
  - **Guest (public):** no JWT, CAPTCHA required, strict rate-limit by IP, honeypot, link ban.
  - **Dashboard (authenticated):** valid JWT, no CAPTCHA, softer rate-limit by userId, name/email auto-filled.
- **Request Body**:
  ```json
  {
    "name": "Jane Doe",
    "email": "jane@example.com",
    "message": "Hello! I'd like to know more about JobForge.",
    "captchaToken": "token-from-recaptcha-or-hcaptcha",
    "website": ""
  }
- **Guest:** name, email, message, captchaToken required (honeypot website must be empty).
- **Dashboard:** send the same shape; name, email, captchaToken are ignored if JWT is valid (server uses account data).
- **Auth:**
  - Optional JWT `(Authorization: Bearer <token>)`. If present and valid, the request is treated as Dashboard mode.
- **Spam & abuse protection:**
  - `Rate limit`: Guest — 3 req / 60s per IP; Dashboard — 10 req / 60s per userId.
  - `Honeypot`: website must be empty (else 403).
  - `Link ban`: messages containing links/HTML are rejected (400).
  - `CAPTCHA`: required for Guests; not required for Dashboard.
  - `Email delivery`: Brevo template (templateId=6) with params { fromName, fromEmail, message }. Reply-To = user email; To = support@jobforge.net.
- **Validation rules**:
  - `name` — string, 2–100 chars
  - `email` — valid email, ≤254 chars
  - `message` — 10–2000 chars, links/HTML not allowed
  - `website` — honeypot field, must be empty (hidden in UI)
  - `captchaToken` — optional; if CAPTCHA is enabled in config, it must pass verification
- **Response (202 Accepted)**:
  ```json
  { "message": "Message accepted" }

### 91. Get Chat Notification Settings (Admin)
- **Endpoint:** `GET /api/admin/settings/chat-notifications`
- **Description:** Returns the global chat email-notification settings used by the platform. Defaults are returned if no custom settings are saved. Admin only
- **Headers**: `Authorization: Bearer <token>`
- **Response (Success - 200)**:
  ```json
  {
    "enabled": true,
    "onEmployerMessage": {
      "immediate": true,
      "delayedIfUnread": { "enabled": true, "minutes": 60 },
      "after24hIfUnread": { "enabled": true, "hours": 24 },
      "onlyFirstMessageInThread": false
    },
    "throttle": { "perChatCount": 2, "perMinutes": 60 }
  }
- **Response (Error - 401 Unauthorized — missing/malformed token or invalid token)**:
  ```json
  {"statusCode": 401,"message": "Invalid token","error": "Unauthorized"}   

### 92. Update Chat Notification Settings (Admin)
- **Endpoint:** `POST /api/admin/settings/chat-notifications`
- **Description:** Updates the global chat email-notification settings. Admin only.
- **Headers**: `Authorization: Bearer <token>`
- **Request Body:**:
  ```json
  {
    "enabled": true,
    "onEmployerMessage": {
      "immediate": true,
      "delayedIfUnread": { "enabled": true, "minutes": 60 },
      "after24hIfUnread": { "enabled": true, "hours": 24 },
      "onlyFirstMessageInThread": false
    },
    "throttle": { "perChatCount": 2, "perMinutes": 60 }
  }
- **Response (200)**:
  ```json
  {
    "message": "Chat notification settings updated",
    "settings": {
      "enabled": true,
      "onEmployerMessage": {
        "immediate": true,
        "delayedIfUnread": { "enabled": true, "minutes": 60 },
        "after24hIfUnread": { "enabled": true, "hours": 24 },
        "onlyFirstMessageInThread": false
      },
      "throttle": { "perChatCount": 2, "perMinutes": 60 }
    }
  }
- **Notes**:
  - `immediate`: send right away when employer writes to jobseeker.
  - `delayedIfUnread`: also send if still unread after minutes.
  - `onlyFirstMessageInThread`: if true, notify only on the first message in a given chat thread.
  - `throttle`: не чаще X раз в N минут для одного чата и получателя (anti-spam).
- **Response (Error - 401 Unauthorized — missing/malformed token or invalid token)**:
  ```json
  {"statusCode": 401,"message": "Invalid token","error": "Unauthorized"}     

### 93. Employer: Invite a candidate
- **Endpoint:** `POST /api/job-applications/invitations`
- **Headers**: `Bearer (role=employer)`
- **Request Body:**:
  ```json
  {
    "job_post_id": "<jobPostId>",
    "job_seeker_id": "<userId>",
    "message": "We think you’re a great fit for this role"
  }
- **Response (200)**:
  ```json
  {
    "id": "<invitationId>",
    "job_post_id": "<jobPostId>",
    "employer_id": "<employerId>",
    "job_seeker_id": "<userId>",
    "status": "Pending",
    "message": "We think you’re a great fit for this role",
    "created_at": "2025-10-06T10:00:00.000Z",
    "updated_at": "2025-10-06T10:00:00.000Z"
  }
- **Response 401**:
  ```json
  { "statusCode": 401, "message": "Only employers can send invitations", "error": "Only employers can send invitations" }
- **Response 404**:
  ```json
  { "statusCode": 404, "message": "Job post not found or not yours / Jobseeker not found", "error": "Job post not found or not yours / Jobseeker not found" }
- **Response 400**:
  ```json
  { "statusCode": 400, "message": "Job not active/approved / already applied / cannot invite yourself", "error": "Job not active/approved / already applied / cannot invite yourself" }

### 94. Jobseeker: List invitations
- **Endpoint:** `GET /api/job-applications/invitations?includeAll=false`
- **Headers**: `Bearer (role=jobseeker)`
- **Response (200)**:
  ```json
  [
    {
      "id": "<invitationId>",
      "status": "Pending",
      "message": "We think you’re a great fit...",
      "created_at": "2025-10-06T10:00:00.000Z",
      "job_post": {
        "id": "<jobPostId>",
        "title": "Software Engineer",
        "location": "Remote",
        "salary": 5000,
        "salary_type": "per month",
        "job_type": "Full-time",
        "slug": "software-engineer-remote",
        "slug_id": "software-engineer-remote--8df3b0be",
        "employer": { "id": "<employerId>", "username": "acme_hr" }
      },
      "employer": { "id": "<employerId>", "username": "acme_hr" }
    }
  ]

### 95. Jobseeker: Decline invitation
- **Endpoint:** `POST /api/job-applications/invitations/:id/decline`
- **Headers**: `Bearer (role=jobseeker)`
- **Response (200)**:
  ```json
  { "id": "<invitationId>", "status": "Declined", ... }

### 96. Jobseeker: Accept invitation (starts application flow)
- **Endpoint:** `POST /api/job-applications/invitations/:id/accept`
- **Headers**: `Bearer (role=jobseeker)`
- **Request Body: same shape as regular application**:
  ```json
  {
  "cover_letter": "Why I'm a good fit...",
  "relevant_experience": "3 years with Django, SQL...",
  "full_name": "Jane Doe",
  "referred_by": "Alex P."
  } 

### 97. Send message to selected applicants
- **Endpoint:** `POST /api/chat/broadcast-selected/:jobPostId`
- **Headers**: `Authorization: Bearer <token>`
- **Request Body:**:
  ```json
  {
    "applicationIds": ["<applicationId1>", "<applicationId2>", "..."],
    "content": "Short update for you all..."
  }
- **Response (200)**:
  ```json
  { "sent": 2 }

### 98. Bulk reject applications
- **Endpoint:** `POST /api/job-applications/bulk-reject`
- **Headers**: `Authorization: Bearer <token>`
- **Request Body:**:
  ```json
  {
    "applicationIds": ["<applicationId1>", "<applicationId2>", "..."]
  }
- **Response (200)**:
  ```json
  { "updated": 2, "updatedIds": ["<applicationId1>", "<applicationId2>"] }

### 99. Set “Avatar Required on Registration” (Admin)
- **Endpoint:** `POST /api/admin/settings/registration-avatar`
- **Description:** Enables or disables the requirement for users to upload an avatar during registration.
- **Headers**: `Authorization: Bearer <token>`
- **Request Body:**:
  ```json
  {"required": true}
- **Response (200)**:
  ```json
  {"required": true}
- **Response (Error - 400, invalid type)**:
  ```json
  {"statusCode": 400, "message": "`required` must be boolean", "error": "Bad Request"}
- **Response (Error - 401 Unauthorized — missing/malformed token or invalid token)**:
  ```json
  {"statusCode": 401,"message": "Invalid token","error": "Unauthorized"}      

### 100. Get “Avatar Required on Registration” (Admin)
- **Endpoint:** `GET /api/admin/settings/registration-avatar`
- **Description:** Returns whether uploading an avatar is required during **registration**.
- **Headers**: `Authorization: Bearer <token>`
- **Response (Success - 200)**:
  ```json
  { "required": false }
- **Response (Error - 401 Unauthorized — missing/malformed token or invalid token)**:
  ```json
  {"statusCode": 401,"message": "Invalid token","error": "Unauthorized"}    

### 101. Get “Avatar Required on Registration” (Public)
- **Endpoint:** `GET /api/settings/registration-avatar`
- **Description:** Returns whether jobseeker must upload an avatar during registration (no auth).
- **Response (Success - 200)**:
  ```json
  { "required": true }

### 102. Create Site Referral Link (Admin/Moderator)
- **Endpoint:** `POST /api/admin/site-referral-links`
- **Endpoint:** `POST /api/moderator/site-referral-links`
- **Description:** Creates a global (site-wide) referral link not tied to a specific job post. The link is associated with the admin/moderator who created it.
- **Headers**: `Authorization: Bearer <token>`
- **Request Body:**:
  ```json
  {
    "description": "Telegram promo",
    "landingPath": "/register?role=jobseeker"
  }
- **Response (Success - 200)**:
  ```json
  {
    "id": "<linkId>",
    "scope": "site",
    "refCode": "<uuid>",
    "description": "Telegram promo",
    "clicks": 0,
    "registrations": 0,
    "registrationsVerified": 0,
    "landingPath": "/register?role=jobseeker",
    "shortLink": "https://jobforge.net/ref/<uuid>",
    "createdByAdminId": "<adminOrModeratorUserId>"
  }
- **Response (Error - 401 Unauthorized — missing/malformed token or invalid token)**:
  ```json
  {"statusCode": 401,"message": "Invalid token","error": "Unauthorized"}  
- **Response (Error — 404 Not Found — creator user not found)**:
  ```json
  { "statusCode": 404, "message": "Admin not found", "error": "Not Found" }       

### 103. Get Site Referral Links (Admin/Moderator)
- **Endpoint:** `GET /api/admin/site-referral-links`
- **Endpoint:** `GET /api/moderator/site-referral-links`
- **Description:** Returns a list of site-wide (global) referral links with metrics and registration details. Supports filtering by creator and text search.
- **Query (optional)** 
  - `createdByAdminId` — Return links created by this specific admin/moderator (UUID).
  - `q` — Text search over description or refCode (partial, ILIKE).
- **Headers**: `Authorization: Bearer <token>`
- **Response (Success - 200)**:
  ```json
  [
    {
      "id": "<linkId>",
      "scope": "site",
      "refCode": "<uuid>",
      "description": "Telegram promo",
      "clicks": 12,
      "registrations": 7,
      "registrationsVerified": 5,
      "landingPath": "/register?role=jobseeker",
      "shortLink": "https://jobforge.net/ref/<uuid>",
      "createdByAdmin": { "id": "<adminId>", "username": "adminName" },
      "registrationsDetails": [ ],
      "created_at": "2025-07-31T00:00:00.000Z"
    }
  ]
- **Response (Error - 401 Unauthorized — missing/malformed token or invalid token)**:
  ```json
  {"statusCode": 401,"message": "Invalid token","error": "Unauthorized"}    

### 104. Update Site Referral Link (Admin/Moderator)
- **Endpoint:** `PUT /api/admin/site-referral-links/:id`
- **Endpoint:** `PUT /api/moderator/site-referral-links/:id`
- **Description:** Updates the description of a site-wide (global) referral link.
- **Headers**: `Authorization: Bearer <token>`
- **Request Body:**:
  ```json
  { "description": "New description" }
- **Response (Success - 200)**:
  ```json
  { "message": "Updated", "id": "<linkId>", "description": "New description" }
- **Response (Error - 401 Unauthorized — missing/malformed token or invalid token)**:
  ```json
  {"statusCode": 401,"message": "Invalid token","error": "Unauthorized"}
- **Response (Error — 400 Bad Request — not a site link):**:
  ```json
  { "statusCode": 400, "message": "This link is not a site referral link", "error": "Bad Request" }
- **Response (Error — 401 Unauthorized — insufficient role):**:
  ```json
  { "statusCode": 401, "message": "Only admins or moderators can access this resource", "error": "Unauthorized" }
- **Response (Error — 404 Not Found — link does not exist):**:
  ```json
  { "statusCode": 404, "message": "Referral link not found", "error": "Not Found" }

### 105. Delete Site Referral Link (Admin/Moderator)
- **Endpoint:** `DELETE /api/admin/site-referral-links/:id`
- **Endpoint:** `DELETE /api/moderator/site-referral-links/:id`
- **Description:** Deletes a site-wide (global) referral link.
- **Params**: `id` — Referral link ID (UUID)
- **Headers**: `Authorization: Bearer <token>`
- **Response (Success - 200)**:
  ```json
  { "message": "Deleted" }
- **Response (Error - 401 Unauthorized — missing/malformed token or invalid token)**:
  ```json
  {"statusCode": 401,"message": "Invalid token","error": "Unauthorized"}
- **Response (Error — 400 Bad Request — not a site link):**:
  ```json
  { "statusCode": 400, "message": "This link is not a site referral link", "error": "Bad Request" }
- **Response (Error — 401 Unauthorized — insufficient role):**:
  ```json
  { "statusCode": 401, "message": "Only admins or moderators can access this resource", "error": "Unauthorized" }
- **Response (Error — 404 Not Found — link does not exist):**:
  ```json
  { "statusCode": 404, "message": "Referral link not found", "error": "Not Found" }  