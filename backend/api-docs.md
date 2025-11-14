# API Documentation

## Base URL
`http://localhost:3000`

## Endpoints

### 1. Register a User
- **Endpoint**: `POST api/auth/register`
- **Description**: Creates a new account (role: jobseeker or employer). Sends an email verification link. For role=jobseeker, both resume (URL or file) and date_of_birth are REQUIRED.
Also supports privileged creation of admin/moderator users when a valid secretKey is provided (returns an access token immediately).
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
    "role": "jobseeker",                    // "jobseeker" | "employer"
    "country": "US",                        // optional; inferred from IP if missing
    "skills": ["<categoryId1>", "<categoryId2>"],  // jobseeker only
    "experience": "3 years",                // jobseeker only
    "resume": "https://.../cv.pdf",         // REQUIRED for jobseeker; auto-filled if resume_file uploaded
    "date_of_birth": "1992-07-15",          // REQUIRED for jobseeker; format YYYY-MM-DD
    "linkedin": "https://linkedin.com/in/...",
    "instagram": "https://instagram.com/...",
    "facebook": "https://facebook.com/...",
    "whatsapp": "+12025550123",
    "telegram": "@username",
    "description": "up to 150 words",
    "languages": ["English", "German"],
    "ref": "<referralCode>",                // optional (also accepted via query/header/cookie)
    "secretKey": "<admin-or-moderator-secret>" // privileged registration only
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
- **Response (Error - 400, Invalid portfolio files)**:
  ```json
  {"statusCode": 400, "message": "Only PDF, DOC, DOCX, JPG, JPEG, PNG, and WEBP are allowed for portfolio files", "error": "Bad Request"}
- **Response (Error - 400, Missing fingerprint)**:
  ```json
  {"statusCode": 400, "message": "Fingerprint is required", "error": "Bad Request"}
- **Response (Error - 400, DOB is required)**:
  ```json
  {"statusCode": 400, "message": "date_of_birth is required for jobseeker registration", "error": "Bad Request"}
- **Response (Error - 400, DOB is bad format)**:
  ```json
  {"statusCode": 400, "message": "date_of_birth must be in format YYYY-MM-DD", "error": "Bad Request"}
- **Response (Error - 400, Missing resume)**:
  ```json
  {"statusCode": 400, "message": "Resume is required for jobseeker registration", "error": "Bad Request"}
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

### 2. Verify Email
- **Endpoint**: `GET api/auth/verify-email`
- **Description**:Verifies a user’s email using a one-time token and always redirects to the frontend callback with a JWT for auto-login.
  Works for all roles: jobseeker, employer, affiliate, admin, moderator.
- **Query Parameters:**: `token`: (required) — verification token from the email link
- **Cookies (read-only, optional)**:
  - `ref_to` — if present and is a relative path starting with `/`, it will be forwarded as `redirect` in the callback URL
- **Response (Success - 302 Redirect)**: Redirects to `${BASE_URL}/auth/callback?token=<JWT>&verified=true[&redirect=<path>]`
  Where:
  - `token` — JWT access token (expires in **7 days**)
  - `verified=true` — email successfully confirmed
  - `redirect` — included **only** when `ref_to` cookie contains a safe relative path (e.g., `/vacancy/xyz`)
- **Response (Error - 400, if token is invalid or expired)**: Redirect to `${FRONTEND_URL}/auth/callback?error=invalid_token` or JSON:
  ```json
  {"statusCode": 400,"message": "Invalid or expired verification token","error": "Bad Request"}

### 3. Resend Verification Email
- **Endpoint**: `POST /api/auth/resend-verification`
- **Description**: Sends a new verification email **if** the account exists and is not yet verified. Always returns a generic success message to avoid revealing account existence.
- **Request Body:**: 
  ```json
  {"email": "user@example.com" }
- **Response (Success - 200)**:
  ```json
  {"message": "If the account exists and is not verified, we sent a new link."}
- **Response 429 (rate limit)**:
  ```json
  {"statusCode": 429,"message": "Please wait before requesting another verification email","error": "Too Many Requests"}

### 4. Login a User
- **Endpoint**: `POST api/auth/login`
- **Description**: Logs a user in with email and password and returns a JWT.
  Non-privileged users — jobseeker, employer, affiliate — must have a verified email (is_email_verified = true).
  Admin and moderator accounts are allowed to log in without email verification.
- **Headers**: 
 - `x-fingerprint (optional)` — device/browser fingerprint (used for anti-fraud & rate limiting).
- **Request Body**:
  ```json
  {
    "email": "test@example.com",
    "password": "password",
    "rememberMe": false
  }
- **Response (Success - 201)**:
  ```json
  {"accessToken": "<jwt>"}
- **Response (Error - 401, if credentials are invalid):**:
  ```json
  {"statusCode": 401,"message": "Invalid credentials","error": "Unauthorized"}
- **Response (Error - 401, if email is not verified)**:
  ```json
  {"statusCode": 401,"message": "Please confirm your email before logging in","error": "Unauthorized"}
- **Response (Error — 401, too many attempts)**:
  ```json
  {"statusCode": 401,"message": "Too many attempts. Try later.","error": "Unauthorized"}
- **Response (Error — 401, user blocked)**:
  ```json
  {"statusCode": 401,"message": "User is blocked","error": "Unauthorized"}
- **Response (Error — 400, session regenerate failed)**:
  ```json
  {"statusCode": 400,"message": "Failed to regenerate session","error": "Bad Request"}

### 5. Forgot Password
- **Endpoint**: `POST api/auth/forgot-password`
- **Description**: Sends a password reset link to the user's email (reset token valid for **1 hour**).
- **Request Body**:
  ```json
  {"email": "test@example.com"}
- **Response (Success - 200)**:
  ```json
  {"message": "Password reset link sent"}
- **Response (Error - 400, if user not found)**:
  ```json
  {"statusCode": 400,"message": "User not found","error": "Bad Request"}
- **Response (Error - 401, if user is admin or moderator)**:
  ```json
  {"statusCode": 401,"message": "Password reset is not allowed for admin or moderator roles","error": "Unauthorized"}

### 6. Reset Password
- **Endpoint**: `POST api/auth/reset-password`
- **Description**: Resets the user's password using the token from the reset email.
- **Request Body**:
  ```json
  {"token": "<resetToken>","newPassword": "newpassword123"}
- **Response (Success - 200)**:
  ```json
  {"message": "Password successfully reset"}
- **Response (Error - 400, if token is invalid or expired)**:
  ```json
  {"statusCode": 400,"message": "Invalid or expired reset token","error": "Bad Request"}
- **Response (Error - 401, if user is admin or moderator)**:
  ```json
  {"statusCode": 401,"message": "Password reset is not allowed for admin or moderator roles","error": "Unauthorized"}
- **Response (Error - 400, weak password)**:
  ```json
  {"statusCode": 400,"message": "Weak password","error": "Bad Request"}
- **Response (Error - 400, user not found)**:
  ```json
  {"statusCode": 400,"message": "User not found","error": "Bad Request"}

### 7. Logout a User
- **Endpoint**: `POST api/auth/logout`
- **Description**: Logs out a user by blacklisting their JWT in Redis, deleting the cached token, destroying the server session, and clearing the `sid` cookie.
- **Headers**: `Authorization: Bearer <token>`
- **Request Body**: None
- **Response (Success - 201)**:
  ```json
  {"message": "Logout successful"}
- **Response (Error - 401, if token is invalid or already blacklisted)**:
  ```json
  {"statusCode": 401,"message": "Token already invalidated","error": "Unauthorized"}    
- **Response (Error - 401, if token is missing or malformed)**:
  ```json
  {"statusCode": 401,"message": "Invalid token","error": "Unauthorized"}

### 8. Google OAuth - Initiate Authentication
- **Endpoint**: `GET /api/auth/google`
- **Description**: Initiates the Google OAuth authentication process.
- **Query Parameters**: `role` (string, required): The role of the user ("employer" or "jobseeker").
- **Example Request**: `/api/auth/google?role=employer`
- **Response**: Redirects the user to Google's authentication page.

### 9. Google OAuth - Callback (handled by backend)
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
  {"message": "Authentication failed","error": "<error message>"}

### 10. Google OAuth - Login
- **Endpoint**: `POST /api/auth/google-login`
- **Description**: Completes the login process for a user authenticated via Google OAuth.
- **Request Body**: 
  ```json
  {"token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."}
- **Response (Success - 200)**:
  ```json
  {"accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."}
- **Response (Error - 401, if token is invalid)**:
  ```json
  {"statusCode": 401,"message": "Invalid token","error": "Unauthorized"}

### 11. Get Profile
- **Endpoint**: `GET /api/profile/myprofile`
- **Description**: Returns the authenticated user's profile based on their role.  
  **Note:** In the current implementation, the service is called without the `isAuthenticated` flag, so the `email` field is **omitted** from the response.
- **Headers**: `Authorization: Bearer <token>`
- **Request Body**: None
- **Response (Success — 200) — Employer**
  ```json
  {
    "id": "<userId>",
    "role": "employer",
    "username": "test",
    "country_name": "United States",
    "company_name": "Test Company",
    "company_info": "A great company",
    "referral_link": "https://example.com/ref/test",
    "timezone": "Europe/Moscow",
    "currency": "USD",
    "average_rating": 4.5,
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
- **Response (Success — 200) — Jobseeker**
  ```json
  {
    "id": "<userId>",
    "role": "jobseeker",
    "username": "test",
    "country": "US",
    "country_name": "United States",
    "languages": ["English", "German"],
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
    "job_experience": "Worked as a frontend developer in 2 companies", 
    "linkedin": "https://www.linkedin.com/in/username",
    "instagram": "https://www.instagram.com/username",
    "facebook": "https://www.facebook.com/username",
    "description": "Experienced web developer specializing in React and Node.js",
    "portfolio": "https://portfolio.com",
    "portfolio_files": [
    "https://cdn.example.com/portfolios/file1.pdf",
    "https://cdn.example.com/portfolios/file2.png"
    ],
    "video_intro": "https://video.com",
    "resume": "https://example.com/resume.pdf",
    "date_of_birth": "1992-07-15",
    "timezone": "Europe/Moscow",
    "currency": "USD",
    "expected_salary": 4500.0,
    "average_rating": 4.0,
    "profile_views": 10,
    "avatar": "https://example.com/avatar.jpg",
    "identity_verified": false,
    "job_search_status": "open_to_offers",
    "whatsapp": "+15551234567",
    "telegram": "@username",
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
  {"statusCode": 401,"message": "Invalid token","error": "Unauthorized"}
- **Response (Error - 404, if user or profile not found)**: 
  ```json
  {"statusCode": 404,"message": "User not found","error": "Not Found"}

### 12. Get Profile by ID
- **Endpoint**: `GET /api/profile/:id`
- **Description**: Returns the profile of a specific user (jobseeker or employer) by **user ID**.  
  - Works for both authenticated and unauthenticated requests.  
  - If a valid JWT is provided, the response may include additional fields (e.g., `email`).  
  - **Jobseeker profiles**: view counter is incremented on each successful fetch.
- **Headers**: `Authorization: Bearer <token>` (optional)
- **Request Parameters**: `id`: The ID of the user.
- **Response (Success — 200) — Employer (unauthenticated)**
  > Note: No `email` field when unauthenticated. Employer profile includes `country_name` (not `country`).
  ```json
  {
    "id": "<userId>",
    "role": "employer",
    "username": "acme_hr",
    "country_name": "United States",
    "company_name": "Acme Inc",
    "company_info": "We build great things",
    "referral_link": "https://example.com/ref/acme",
    "timezone": "Europe/Moscow",
    "currency": "USD",
    "average_rating": 4.5,
    "reviews": [
      {
        "id": "<reviewId>",
        "reviewer_id": "<userId>",
        "reviewed_id": "<userId>",
        "job_application_id": "<jobApplicationId>",
        "rating": 5,
        "comment": "Fast and fair hiring process",
        "created_at": "2025-05-13T18:00:00.000Z",
        "updated_at": "2025-05-13T18:00:00.000Z"
      }
    ],
    "avatar": "https://example.com/avatar.jpg",
    "identity_verified": true
  }
- **Response (Success — 200) — Employer (unauthenticated)**
  Note: With a valid JWT, email is included.
  ```json
  {
    "id": "<userId>",
    "role": "employer",
    "email": "employer@example.com",
    "username": "acme_hr",
    "country_name": "United States",
    "company_name": "Acme Inc",
    "company_info": "We build great things",
    "referral_link": "https://example.com/ref/acme",
    "timezone": "Europe/Moscow",
    "currency": "USD",
    "average_rating": 4.5,
    "reviews": [],
    "avatar": "https://example.com/avatar.jpg",
    "identity_verified": true
  }
- **Response (Success — 200) — Jobseeker (unauthenticated)**
  Note: No email when unauthenticated. Views are incremented.
  ```json
  {
    "id": "<userId>",
    "role": "jobseeker",
    "username": "jane_dev",
    "country": "US",
    "country_name": "United States",
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
    "job_experience": "Worked as a frontend developer in 2 companies",
    "description": "Experienced web developer specializing in React and Node.js",
    "portfolio": "https://portfolio.com",
    "portfolio_files": [
    "https://cdn.example.com/portfolios/file1.pdf",
    "https://cdn.example.com/portfolios/file2.png"
    ],
    "video_intro": "https://video.com",
    "resume": "https://example.com/resume.pdf",
    "date_of_birth": "1992-07-15",
    "timezone": "Europe/Moscow",
    "currency": "USD",
    "expected_salary": 4500,
    "average_rating": 4.0,
    "profile_views": 11,
    "job_search_status": "open_to_offers",
    "linkedin": "https://www.linkedin.com/in/username",
    "instagram": "https://www.instagram.com/username",
    "facebook": "https://www.facebook.com/username",
    "whatsapp": "+15551234567",
    "telegram": "@username",
    "languages": ["English", "German"],
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
    ],
    "avatar": "https://example.com/avatar.jpg",
    "identity_verified": false
  }
- **Response (Success — 200) — Jobseeker (authenticated)**
  Note: With a valid JWT, email is included. Views are still incremented.
  ```json
  {
    "id": "<userId>",
    "role": "jobseeker",
    "email": "test@example.com",
    "username": "jane_dev",
    "country": "US",
    "country_name": "United States",
    "skills": [],
    "experience": "2 years",
    "job_experience": "Worked as a frontend developer in 2 companies",
    "description": "Experienced web developer specializing in React and Node.js",
    "portfolio": "https://portfolio.com",
    "portfolio_files": [
    "https://cdn.example.com/portfolios/file1.pdf",
    "https://cdn.example.com/portfolios/file2.png"
    ],
    "video_intro": "https://video.com",
    "resume": "https://example.com/resume.pdf",
    "date_of_birth": "1992-07-15",
    "timezone": "Europe/Moscow",
    "currency": "USD",
    "expected_salary": 4500,
    "average_rating": 4.0,
    "profile_views": 12,
    "job_search_status": "open_to_offers",
    "linkedin": "https://www.linkedin.com/in/username",
    "instagram": "https://www.instagram.com/username",
    "facebook": "https://www.facebook.com/username",
    "whatsapp": "+15551234567",
    "telegram": "@username",
    "languages": ["English", "German"],
    "reviews": [],
    "avatar": "https://example.com/avatar.jpg",
    "identity_verified": false
  }
- **Response (Error - 404, if user or profile not found)**: 
  ```json
  {"statusCode": 404,"message": "User not found","error": "Not Found"}
- **Response (Error - 401, if user role is not supported)**: 
  ```json
  {"statusCode": 401,"message": "User role not supported","error": "Unauthorized"}

### 13. Update Profile
- **Endpoint**: `PUT /api/profile`
- **Description**: Updates the authenticated user's profile.  
  - Supports both **jobseeker** and **employer** roles.  
  - Trims/validates fields. For jobseekers, `description` is clipped to **150 words**.  
  - On success, returns the **updated profile** (same shape as `GET /api/profile/myprofile`) and **includes `email`** because the service calls `getProfile(userId, true)`.
- **Headers**: `Authorization: Bearer <token>` (required)
- **Request Body — Employer**
  ```json
  {
    "role": "employer",
    "username": "new_name",                // optional; 1..100 chars
    "country": "DE",                       // optional; stored uppercased
    "company_name": "Updated Company",     // optional
    "company_info": "Updated info",        // optional
    "referral_link": "https://example.com/ref/updated", // optional
    "timezone": "America/New_York",        // optional
    "currency": "EUR"                      // optional
  }
- **Request Body — Jobseeker**
  ```json
  {
    "role": "jobseeker",
    "username": "new_name",
    "country": "DE",
    "languages": ["English", "German"],
    "skillIds": ["<skillId1>", "<skillId2>"],
    "experience": "3 years",
    "job_experience": "Detailed description of job history",
    "linkedin": "https://www.linkedin.com/in/...", 
    "instagram": "https://www.instagram.com/...",
    "facebook": "https://www.facebook.com/...",
    "whatsapp": "+15551234567",
    "telegram": "@handle",
    "description": "Up to 150 words ...",
    "portfolio": "https://portfolio.com",
    "portfolio_files": [
      "https://cdn.example.com/portfolios/file1.pdf",
      "https://cdn.example.com/portfolios/file2.png"
    ],
    "video_intro": "https://video.com",
    "resume": "https://example.com/resume.pdf",
    "date_of_birth": "1992-07-15",
    "timezone": "America/New_York",
    "currency": "EUR",
    "job_search_status": "actively_looking",
    "expected_salary": 4500
  }
- **Response (Success — 200):** Returns the updated profile (same format as GET /api/profile/myprofile).
  Email is included in the response because isAuthenticated = true is used internally.
- **Response (Error — 401, missing/invalid token)**:
  ```json
  {"statusCode": 401,"message": "Invalid token","error": "Unauthorized"}
- **Response (Error — 401, role mismatch)**:
  ```json
  {"statusCode": 401,"message": "User role mismatch","error": "Unauthorized"}
- **Response (Error — 401, unsupported role)**:
  ```json
  {"statusCode": 401,"message": "User role not supported","error": "Unauthorized"}
- **Response (Error — 404, user/profile not found)**:
  ```json
  {"statusCode": 404,"message": "User not found","error": "Not Found"}
- **Response (Error — 400, invalid username)**:
  ```json
  {"statusCode": 400,"message": "Username cannot be empty","error": "Bad Request"}
- **Response (Error — 400, username too long)**:
  ```json
  {"statusCode": 400,"message": "Username is too long (max 100)","error": "Bad Request"}
- **Response (Error — 400, invalid job_search_status)**:
  ```json
  {"statusCode": 400,"message": "job_search_status must be one of: actively_looking | open_to_offers | hired","error": "Bad Request"}
- **Response (Error — 400, invalid expected_salary)**:
  ```json
  {"statusCode": 400,"message": "expected_salary must be a non-negative number","error": "Bad Request"}
- **Response (Error — 400, invalid date)**:
  ```json
  {"statusCode": 400, "message": "date_of_birth must be in format YYYY-MM-DD", "error": "Bad Request"}

### 14. Create Job Post
- **Endpoint**: `POST /api/job-posts`
- **Description**: Creates a new job post for an authenticated **employer**.  
  - At least **one category** is required (`category_ids` preferred; `category_id` is legacy).  
  - If `salary_type` = `"negotiable"`, the server stores `salary = null`.  
  - If `description` is missing **and** `aiBrief` is provided, the server auto-generates a description.  
  - New posts are created with `pending_review: true` (not publicly visible until approved), even if `status` is `"Active"`.
- **Headers**: `Authorization: Bearer <token>`
- **Request Body**:
  ```json
  {
    "title": "Software Engineer",
    "description": "We are looking for a skilled software engineer.",
    "location": "Remote",
    "salary": 50000,
    "status": "Active",                           // "Active" | "Draft" | "Closed"
    "job_type": "Full-time",                      // "Full-time" | "Part-time" | "Project-based"
    "salary_type": "per month",                   // "per hour" | "per month" | "negotiable"
    "excluded_locations": ["IN", "PK"],          // optional array of country codes/labels
    "category_ids": ["<catId1>", "<catId2>"],    // preferred (multi)
    "category_id": "<catId1>",                    // legacy (single)
    "aiBrief": "Build and maintain web apps"      // optional; used when 'description' is omitted
  }
- **Response (Success - 201)**:
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
    "excluded_locations": ["IN"],
    "pending_review": true,

    "category_id": "<categoryId>",
    "category": {
      "id": "<categoryId>",
      "name": "Software Development",
      "created_at": "2025-05-15T06:12:00.000Z",
      "updated_at": "2025-05-15T06:12:00.000Z"
    },
    "category_ids": ["<catId1>", "<catId2>"],
    "categories": [
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

    "slug": "software-engineer-remote",
    "slug_id": "software-engineer-remote--8df3b0be",
    "created_at": "2025-05-15T06:12:00.000Z",
    "updated_at": "2025-05-15T06:12:00.000Z"
  }
- **Response (Error — 400, salary missing & not negotiable)**:
  ```json
  { "statusCode": 400, "message": "Salary is required unless salary_type is negotiable", "error": "Bad Request" }
- **Response (Error — 400, no categories)**:
  ```json
  { "statusCode": 400, "message": "At least one category is required", "error": "Bad Request" }
- **Response (Error — 400, some categories not found)**:
  ```json
  { "statusCode": 400, "message": "One or more categories not found", "error": "Bad Request" }
- **Response (Error — 401, invalid/missing token)**:
  ```json
  { "statusCode": 401, "message": "Invalid token", "error": "Unauthorized" }
- **Response (Error — 401, role not allowed)**:
  ```json
  { "statusCode": 401, "message": "Only employers can create job posts", "error": "Unauthorized" }
- **Response (Error — 404, user not found)**:
  ```json
  { "statusCode": 404, "message": "User not found", "error": "Not Found" }

### 15. Update Job Post
- **Endpoint**: `PUT /api/job-posts/:id`
- **Description**: Updates an existing job post for an authenticated **employer**.
  - If `salary_type` = `"negotiable"`, the server stores `salary = null`.
  - If changing `salary_type` to a non-negotiable value while the current salary is `null`, you **must** provide `salary` (otherwise 400).
  - If `aiBrief` is provided and `description` is omitted, the server **auto-generates** a description.
  - **You cannot set `status` to `"Closed"` here** — use the dedicated **Close Job** endpoint instead (attempting to set `"Closed"` returns 400).
  - If the title changes, the server recalculates `slug` and `slug_id`.
- **Headers**: `Authorization: Bearer <token>` 
- **Request Body**::
  ```json
  {
    "title": "Senior Software Engineer",
    "description": "Updated description.",
    "location": "Remote",
    "salary": 60000,
    "status": "Active",                          // "Active" | "Draft" (cannot set "Closed" here)
    "job_type": "Full-time",                     // "Full-time" | "Part-time" | "Project-based"
    "salary_type": "per month",                  // "per hour" | "per month" | "negotiable"
    "excluded_locations": ["IN"],
    "category_ids": ["<catId1>", "<catId2>"],   // preferred (multi)
    "category_id": "<catId1>",                  // legacy (single)
    "aiBrief": "Tighten performance, own services, mentor team"
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
    "excluded_locations": ["IN"],
    "pending_review": true,
    "category_id": "<categoryId>",
    "category": {
      "id": "<categoryId>",
      "name": "Software Development",
      "created_at": "2025-05-15T06:12:00.000Z",
      "updated_at": "2025-05-15T06:12:00.000Z"
    },
    "category_ids": ["<catId1>", "<catId2>"],
    "categories": [
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
    "slug": "senior-software-engineer-remote",
    "slug_id": "senior-software-engineer-remote--8df3b0be",
    "created_at": "2025-05-15T06:12:00.000Z",
    "updated_at": "2025-05-15T06:30:00.000Z"
  }
- **Response (Error — 400, salary required)**:
  ```json
  { "statusCode": 400, "message": "Salary is required unless salary_type is negotiable", "error": "Bad Request" }
- **Response (Error — 400, categories)**:
  ```json
  { "statusCode": 400, "message": "At least one category is required", "error": "Bad Request" }
  { "statusCode": 400, "message": "One or more categories not found", "error": "Bad Request" }
- **Response (Error — 400, attempting to close here)**:
  ```json
  { "statusCode": 400, "message": "Use Close Job endpoint to close a job post", "error": "Bad Request" }
- **Response (Error — 401, invalid/missing token)**:
  ```json
  { "statusCode": 401, "message": "Invalid token", "error": "Unauthorized" }
- **Response (Error — 404, not found/permission)**:
  ```json
  { "statusCode": 404, "message": "Job post not found or you do not have permission to update it", "error": "Not Found" }

### 16. Generate Job Description (AI)
- **Endpoint**: `POST /api/job-posts/generate-description`
- **Description**: Generates a **sanitized HTML** job description from a short AI brief.  
  - **Employers only** (JWT required).  
  - Honors optional context fields (`title`, `location`, `salary`, `salary_type`, `job_type`).  
  - If `salary_type = "negotiable"`, salary may be omitted and the output will display **Negotiable**.
  - Rate-limited via `ThrottlerGuard`.
- **Headers**: `Authorization: Bearer <token>` (Required for employers)
- **Request Body**::
  ```json
  {
    "aiBrief": "Need Python developer with 3 years experience for web app. Skills: Django, SQL.",
    "title": "Python Developer",
    "location": "Remote",
    "salary": 3000,
    "salary_type": "per month",      // "per hour" | "per month" | "negotiable"
    "job_type": "Full-time"          // "Full-time" | "Part-time" | "Project-based"
  }
- **Response (Success - 200)**::
  Returns a string with sanitized HTML (allowed tags: h2, ul, li, p, strong, em).
  Content type is a plain string; not wrapped in an object. <h2>Responsibilities</h2><ul><li>Build and maintain...</li>...</ul><h2>Requirements</h2>...
- **Response (Error — 401, invalid/missing token)**:
  ```json
  { "statusCode": 401, "message": "Invalid token", "error": "Unauthorized" }
- **Response (Error — 401, role not allowed)**:
  ```json
  { "statusCode": 401, "message": "Only employers can generate descriptions", "error": "Unauthorized" }
- **Response (Error — 400, missing brief)**:
  ```json
  { "statusCode": 400, "message": "AI brief is required for description generation", "error": "Bad Request" }
- **Response (Error — 429, rate limit)**:
  ```json
  { "statusCode": 429, "message": "Too Many Requests" }
- **Response (Error — 500, server/AI issues)**:
  ```json
  { "statusCode": 500, "message": "xAI API key is not configured", "error": "Internal Server Error" }
  { "statusCode": 500, "message": "Failed to generate description with AI", "error": "Internal Server Error" }

### 17. Get Job Post
- **Endpoint**: `GET /api/job-posts/:id`
- **Description**: Returns a single job post by its ID.  
  *Note:* This endpoint is **public** and does **not** filter by status or review state. If `salary_type` is `"negotiable"`, `salary` may be `null` (UI should display “Negotiable”).
- **Path Parameters**
  - `id` — job post ID (string, required)
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
    "excluded_locations": ["IN"],
    "pending_review": false,
    "category_id": "<categoryId>",
    "category_ids": ["<catId1>", "<catId2>"],
    "categories": [
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
  { "statusCode": 404, "message": "Job post not found", "error": "Not Found" }

### 18. Get Job Post by Slug or ID
- **Endpoint**: `GET /api/job-posts/by-slug-or-id/:slugOrId`
- **Description**: Retrieves a job post by `slug_id` **or** by UUID `id`.  
  **Lookup order:** `slug_id` → `id` (UUID). *(Note: plain `slug` is **not** supported in this endpoint.)*
- **Path Parameters**:
  - `slugOrId` — job post `slug_id` **or** UUID `id` (string, required)
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
    "excluded_locations": ["IN"],
    "pending_review": false,
    "category_id": "<catId1>",
    "category_ids": ["<catId1>", "<catId2>"],
    "categories": [
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
  { "statusCode": 404, "message": "Job post not found", "error": "Not Found" }

### 19. Get Job Posts by Employer
- **Endpoint**: `GET /api/job-posts/my-posts`
- **Description**: Retrieves **all** job posts created by the authenticated **employer**. Results are ordered by `created_at DESC`. Each post includes legacy single-category fields and the new multi-category fields.
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
      "excluded_locations": ["IN"],
      "status": "Closed",
      "job_type": "Full-time",
      "pending_review": false,
      "category_id": "<categoryId>",
      "category": {
        "id": "<categoryId>",
        "name": "Software Development",
        "created_at": "2025-05-13T18:00:00.000Z",
        "updated_at": "2025-05-13T18:00:00.000Z"
      },
      "category_ids": ["<catId1>", "<catId2>"],
      "categories": [
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
- **Response (Error — 401, invalid/missing token)**:
  ```json
  { "statusCode": 401, "message": "Invalid token", "error": "Unauthorized" }
- **Response (Error — 401, role not allowed)**:
  ```json
  { "statusCode": 401, "message": "Only employers can view their job posts", "error": "Unauthorized" }
- **Response (Error — 404, user not found)**:
  ```json
  { "statusCode": 404, "message": "User not found", "error": "Not Found" }

### 20. Create Category (Admin)
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

### 21. Get Categories (Admin)
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

### 22. Search Categories (Admin)
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

### 23. Get Categories (Public)
- **Endpoint**: `GET /api/categories`
- **Description**: Returns the hierarchical category tree. Optionally includes the total number of **active & approved** job posts per category (counts are aggregated from all descendants).
- **Headers**: None
- **Query Parameters (optional)**:
  - `includeCounts` — `true|false` (default `false`). When `true`, each category object includes `jobs_count`.
  - `onlyTopLevel` — `true|false` (default `false`). **Note:** currently ignored in code (the endpoint always returns the full tree).
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
- **Response (200) — when includeCounts=false**:
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

### 24. Search Categories (Public)
- **Endpoint**: `GET /api/categories/search`
- **Description**: Searches categories by name (partial match, case-insensitive). Public access.
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
  {"statusCode": 400,"message": "Search term is required","error": "Bad Request"}

### 25. Delete Category (Admin)
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

### 26. Apply to Job Post
- **Endpoint**: `POST /api/job-applications`
- **Description**: Allows a **jobseeker** to apply to a job post. The service enforces per-post application limits and may return a limit-related error message (e.g., *Daily application limit reached*, *Job full*, *Application period has ended*). Applicants from `excluded_locations` are blocked.
- **Headers**: `Authorization: Bearer <token>`
- **Request Body**:
  ```json
  {
    "job_post_id": "<jobPostId>",
    "cover_letter": "Why I'm a good fit...",
    "relevant_experience": "Describe relevant experience (companies, roles, stack, achievements...)",
    "full_name": "Jane Mary Doe",
    "referred_by": "Alex Petrov / john@company.com",
    "ref": "<referralCode>",          // optional; alias
    "refCode": "<referralCode>"       // optional; alias
  }
- **Response (Success - 201)**:
  ```json
  {
    "id": "<applicationId>",
    "job_post_id": "<jobPostId>",
    "job_seeker_id": "<userId>",
    "status": "Pending",
    "cover_letter": "Why I'm a good fit...",
    "relevant_experience": "Describe relevant experience (companies, roles, stack, achievements...)",
    "full_name": "Jane Mary Doe",
    "referred_by": "Alex Petrov / john@company.com",
    "created_at": "2025-09-25T12:00:00.000Z",
    "updated_at": "2025-09-25T12:00:00.000Z"
  }
- **Response (Error - 400, missing required fields)**:
  ```json
  { "statusCode": 400, "message": "Cover letter is required", "error": "Bad Request" }
  { "statusCode": 400, "message": "Relevant experience is required", "error": "Bad Request" }
- **Response (Error - 400, daily/total/period limits)**:
  ```json
  { "statusCode": 400, "message": "Daily application limit reached", "error": "Bad Request" }
  { "statusCode": 400, "message": "Job full", "error": "Bad Request" }
  { "statusCode": 400, "message": "Application period has ended", "error": "Bad Request" }
- **Response (Error - 400, job not active)**:
  ```json
  { "statusCode": 400, "message": "Cannot apply to a job post that is not active", "error": "Bad Request" }
- **Response (Error - 400, already applied)**:
  ```json
  { "statusCode": 400, "message": "You have already applied to this job post", "error": "Bad Request" }
- **Response (Error - 400, location excluded)**:
  ```json
  { "statusCode": 400, "message": "Applicants from your location are not allowed", "error": "Bad Request" }
- **Response (Error - 401, invalid or missing token)**:
  ```json
  { "statusCode": 401, "message": "Invalid token", "error": "Unauthorized" }
- **Response (Error - 401, role not allowed)**:
  ```json
  { "statusCode": 401, "message": "Only jobseekers can apply to job posts", "error": "Unauthorized" }
- **Response (Error - 404, not found)**:
  ```json
  { "statusCode": 404, "message": "User not found", "error": "Not Found" }
  { "statusCode": 404, "message": "Job post not found", "error": "Not Found" }

### 27. Close Job Post
- **Endpoint**: `POST /api/job-posts/:id/close`
- **Description**: Closes a job post (sets status to `"Closed"`). Only the **employer who owns the job post** can close it.  
  When closed, **all applications for this job that are not already `"Accepted"` are set to `"Rejected"`**.
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
    "salary_type": "per month",
    "status": "Closed",
    "job_type": "Full-time",
    "employer_id": "<userId>",
    "pending_review": false,
    "slug": "software-engineer-remote",
    "slug_id": "software-engineer-remote--8df3b0be",
    "created_at": "2025-05-15T05:13:00.000Z",
    "updated_at": "2025-05-15T05:20:00.000Z",
    "closed_at": "2025-05-15T05:20:00.000Z"
  }
- **Response (Error — 401, invalid/missing token)**: 
  ```json
  { "statusCode": 401, "message": "Invalid token", "error": "Unauthorized" }
- **Response (Error — 404, not found/permission)**: 
  ```json
  {"statusCode": 404,"message": "Job post not found or you do not have permission to close it","error": "Not Found"}
- **Response (Error — 400, already closed)**: 
  ```json
  { "statusCode": 400, "message": "Job post is already closed", "error": "Bad Request" }

### 28. Get My Applications (Jobseeker)
- **Endpoint**: `GET /api/job-applications/my-applications`
- **Description**: Returns **all** applications submitted by the authenticated user.  
  - If the user exists but is **not** a `jobseeker`, the endpoint returns an **empty array**.
- **Headers**: `Authorization: Bearer <token>`
- **Response (Success - 200)**: 
  ```json
  [
    {
      "id": "<applicationId>",
      "job_post_id": "<jobPostId>",
      "job_seeker_id": "<userId>",
      "status": "Pending",
      "cover_letter": "Why I'm a good fit...",
      "relevant_experience": "Describe relevant experience...",
      "full_name": "Jane Mary Doe",
      "referred_by": "Alex Petrov",
      "created_at": "2025-05-13T18:00:00.000Z",
      "updated_at": "2025-05-13T18:00:00.000Z",
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
        "updated_at": "2025-05-13T18:00:00.000Z",
        "employer": {
          "id": "<employerId>",
          "email": "employer@example.com",
          "username": "acme_hr",
          "role": "employer"
        }
      },
      "job_seeker": {
        "id": "<userId>",
        "email": "jobseeker1@example.com",
        "username": "jobseeker1",
        "role": "jobseeker"
      }
    }
  ]
- **Response (Error — 401, invalid/missing token)**: 
  ```json
  {"statusCode": 401,"message": "Invalid token","error": "Unauthorized"}
- **Response (Error - 404, if user not found)**:   
  ```json
  {"statusCode": 404,"message": "User not found","error": "Not Found"}

### 29. Get Applications for Job Post (Employer/Admin)
- **Endpoint**: `GET /api/job-applications/job-post/:id`
- **Description**: Returns all applications for the specified job post.  
  - **Admins/Moderators**: can view applications for **any** job post.  
  - **Employers**: can view applications **only** for their own job posts.
- **Headers**: `Authorization: Bearer <token>`
- **Path Parameters**: 
  - `id` (string, required): The ID of the job post.
- **Response (Success - 200)**:  
  ```json
  [
    {
      "applicationId": "<applicationId>",
      "userId": "<jobseekerUserId>",
      "username": "john_doe107",
      "email": "jobseeker107@example.com",
      "jobDescription": "Experienced web developer with 5 years in React.",
      "details": {
        "fullName": "Jane Mary Doe",
        "referredBy": "Alex Petrov",
        "coverLetter": "I am excited to apply for this position..."
      },
      "appliedAt": "2025-05-15T06:12:00.000Z",
      "status": "Pending",
      "job_post_id": "<jobPostId>",
      "applicant_country": "US",
      "applicant_country_code": "US",
      "applicant_date_of_birth": "1992-07-15"
    }
  ]
- **Response (Error - 401, if token is invalid or missing)**:  
  ```json
  {"statusCode": 401,"message": "Invalid token","error": "Unauthorized"}
- **Response (Error — 401, role not permitted for non-admin/moderator and non-employer)**:   
  ```json
  { "statusCode": 401, "message": "Only employers can view applications for their job posts", "error": "Unauthorized" }
- **Response (Error — 404, job post not found / permission issue for employer)**:   
  ```json
  { "statusCode": 404, "message": "Job post not found or you do not have permission to view its applications", "error": "Not Found" }
- **Response (Error — 404, user not found)**:   
  ```json
  { "statusCode": 404, "message": "User not found", "error": "Not Found" } 

### 30. Get Application by ID (Employer/Admin/Moderator)
- **Endpoint**: `GET /api/job-applications/:id`
- **Description**: Retrieves details of a specific job application by ID. Accessible to **employers** (only for their own job posts), **admins**, or **moderators**.
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
    },
    "applicant_country": "US",
    "applicant_country_code": "US",
    "applicant_date_of_birth": "1992-07-15"
  }
- **Response (Error - 401, invalid/missing token)**:
  ```json
  { "statusCode": 401, "message": "Invalid token", "error": "Unauthorized" }
- **Response (Error - 401, role not allowed)**:
  ```json
  { "statusCode": 401, "message": "Only employers, admins, or moderators can view application details", "error": "Unauthorized" }
- **Response (Error - 401, employer does not own the job post)**:
  ```json
  { "statusCode": 401, "message": "You do not have permission to view this application", "error": "Unauthorized" }
- **Response (Error - 404, not found)**:
  ```json
  { "statusCode": 404, "message": "User not found", "error": "Not Found" }
  { "statusCode": 404, "message": "Application not found", "error": "Not Found" }

### 31. Update Application Status (Employer)
- **Endpoint**: `PUT /api/job-applications/:id`
- **Description**: Updates the status of a **job application**. Only the **employer who owns the related job post** can update it.  
  Supported statuses: `"Pending" | "Accepted" | "Rejected"`.
- **Headers**: `Authorization: Bearer <token>`  
- **Path Parameters**:
  - `id` — application ID (string, required)
- **Request Body**:   
  ```json
  {"status": "Accepted"}
- **Response (Success - 200)**: 
  ```json
  {
    "id": "<applicationId>",
    "job_post_id": "<jobPostId>",
    "job_seeker_id": "<userId>",
    "status": "Accepted",
    "created_at": "2025-05-13T18:00:00.000Z",
    "updated_at": "2025-05-13T18:30:00.000Z",
    "job_post": { /* present when re-fetched on Accepted */ },
    "job_seeker": { /* present when relations were loaded */ }
  }
- **Response (Error — 401, invalid/missing token)**: 
  ```json
  { "statusCode": 401, "message": "Invalid token", "error": "Unauthorized" }
- **Response (Error — 401, role not allowed)**: 
  ```json
  { "statusCode": 401, "message": "Only employers can update application status", "error": "Unauthorized" }
- **Response (Error — 401, permission)**: 
  ```json
  { "statusCode": 401, "message": "You do not have permission to update this application", "error": "Unauthorized" }
- **Response (Error — 404, not found)**: 
  ```json
  { "statusCode": 404, "message": "User not found", "error": "Not Found" }
  { "statusCode": 404, "message": "Application not found", "error": "Not Found" }

### 32. Get All Job Posts
- **Endpoint**: `GET /api/job-posts`
- **Description**: Returns **active & approved** job posts with optional filters and pagination.  
  Only posts with `status = "Active"` **and** `pending_review = false` are included.
- **Query Parameters (all optional)**:
  - `title` — string; partial match (ILIKE) against job title
  - `location` — string; partial match (ILIKE)
  - `job_type` — `"Full-time" | "Part-time" | "Project-based"`
  - `salary_min` — number; minimum salary (ignored by posts where salary is `null`)
  - `salary_max` — number; maximum salary (ignored by posts where salary is `null`)
  - `salary_type` — `"per hour" | "per month" | "negotiable"`
  - `category_id` — string; filter by a single category **including its descendants**
  - `required_skills` — string or string[]; matches when the job’s `required_skills` array overlaps the provided list
  - `page` — number; default `1`, min `1`
  - `limit` — number; default `10`, min `1`, max `100`
  - `sort_by` — `"created_at" | "salary"`; default `"created_at"`
  - `sort_order` — `"ASC" | "DESC"`; default `"DESC"`
- **Example Request**: `/api/job-posts?title=Engineer&location=Remote&job_type=Full-time&category_id=<catId>&salary_type=per%20hour&page=1&limit=20&sort_by=created_at&sort_order=DESC`
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
      "excluded_locations": ["IN"],
      "pending_review": false,
      "category_id": "<catId1>",                     // legacy single category field
      "category": { "id": "<catId1>", "name": "Development" },
      "category_ids": ["<catId1>", "<catId2>"],      // aggregated from relations
      "categories": [                                 // expanded list with names
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

### 33. Create Review
- **Endpoint**: `POST /api/reviews`
- **Description**: Creates a review for an accepted job application. The review is saved with `status = "Pending"` and is only shown publicly after admin approval.
- **Headers**: `Authorization: Bearer <token>`
- **Request Body**:
  ```json
  {
    "job_application_id": "<jobApplicationId>",
    "rating": 4,
    "comment": "Great work, very professional!"
  }
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
- **Response (Error — 401, invalid/missing token)**:
  ```json
  {"statusCode": 401,"message": "Invalid token","error": "Unauthorized"}
- **Response (Error — 401, not your application / wrong role)**:
  ```json
  {"statusCode": 401,"message": "You can only leave reviews for your own job applications","error": "Unauthorized"}
- **Response (Error — 400, application not accepted)**:
  ```json
  {"statusCode": 400,"message": "Reviews can only be left for accepted job applications","error": "Bad Request"}
- **Response (Error — 400, rating invalid)**:
  ```json
  {"statusCode": 400,"message": "Rating must be between 1 and 5","error": "Bad Request"}
- **Response (Error — 400, duplicate review)**:
  ```json
  {"statusCode": 400,"message": "You have already left a review for this job application","error": "Bad Request"}
- **Response (Error — 404, application not found)**:
  ```json
  {"statusCode": 404,"message": "Job application not found","error": "Not Found"}

### 34. Get Reviews for User
- **Endpoint**: `GET /api/reviews/user/:id`
- **Description**: Returns only **Approved** reviews for the specified user (jobseeker or employer), newest first.
- **Headers**: *(none required)*
- **Path Parameters**: 
  - `id` (string, required): The user ID whose reviews you want to fetch.
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
  {"statusCode": 404,"message": "User not found","error": "Not Found"}

### 35. Get All Users (Admin/Moderator)
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

### 36. Get User by ID (Admin/Moderator)
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

### 37. Update User (Admin)
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

### 38. Delete User (Admin)
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

### 39. Reset User Password (Admin/Moderator)
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

### 40. Get All Job Posts (Admin/Moderator)
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

### 41. Update Job Post (Admin)
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

### 42. Delete Job Post (Admin)
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

### 43. Approve Job Post (Admin/Moderator)
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

### 44. Flag Job Post for Review (Admin/Moderator)
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

### 45. Get All Reviews (Admin/Moderator)
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

### 46. Delete Review (Admin/Moderator)
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

### 47. Approve Review (Admin/Moderator)
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

### 48. Reject Review (Admin/Moderator)
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

### 49. Get Analytics (Admin/Moderator)
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

### 50. Get Registration Statistics (Admin/Moderator)
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

### 51. Get Geographic Distribution (Admin/Moderator)
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

### 52. Set Global Application Limit for All Job Posts (Admin)
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

### 53. Submit Tech Issue Feedback
- **Endpoint**: `POST /api/feedback`
- **Description**: Allows **authenticated jobseekers or employers** to submit technical feedback/bug reports.
- **Headers**: `Authorization: Bearer <token>`
- **Request Body**:
  ```json
  {
    "category": "Bug",                     // One of: Bug | UI | Performance | Data | Other
    "summary": "Short 1–2 sentence description",
    "steps_to_reproduce": "1) Open ... 2) Click ... 3) Error",
    "expected_result": "Should open profile page",
    "actual_result": "Stays on the same page with 500",
    "message": "Optional alias for summary" // optional; used if 'summary' is missing
  }
- **Response (Success - 201)**: 
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
- **Response (Error - 401, invalid token)**: 
  ```json
  {"statusCode": 401,"message": "Invalid token","error": "Unauthorized"}
- **Response (Error - 401, role not allowed)**: 
  ```json
  {"statusCode": 401,"message": "Only jobseekers and employers can submit feedback","error": "Unauthorized"}
- **Response (Error - 404, user not found)**: 
  ```json
  {"statusCode": 404,"message": "User not found","error": "Not Found"} 

### 54. Get Tech Issue Feedback (Admin)
- **Endpoint**: `GET /api/feedback`
- **Description**: Returns a paginated list of submitted tech feedback. Admins or moderators only.
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
- **Response (Error - 400, invalid pagination)**:   
  ```json
  { "statusCode": 400, "message": "Page must be a positive integer", "error": "Bad Request" }
  { "statusCode": 400, "message": "Limit must be a positive integer", "error": "Bad Request" }
- **Response (Error - 401, invalid token)**:   
  ```json
  {"statusCode": 401,"message": "Invalid token","error": "Unauthorized"}
- **Response (Error - 401, role not allowed)**:   
  ```json
  {"statusCode": 401,"message": "Only admins or moderators can view feedback","error": "Unauthorized"}

### 55. Add Blocked Country (Admin)
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

### 56. Remove Blocked Country (Admin)
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

### 57. Get Blocked Countries (Admin)
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

### 58. Get Top Employers (Admin)
- **Endpoint**: `GET /api/admin/leaderboards/top-employers`
- **Description**: Returns the **top employers** ranked by `average_rating`. **Admins only** (JWT + `AdminGuard`).
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
- **Response (Error — 401, invalid/missing token)**:   
  ```json
  { "statusCode": 401, "message": "Invalid token", "error": "Unauthorized" }
- **Response (Error — 401, not an admin)**:   
  ```json
  { "statusCode": 401, "message": "Unauthorized", "error": "Unauthorized" }

### 59. Get Top Jobseekers (Admin)
- **Endpoint**: `GET /api/admin/leaderboards/top-jobseekers`
- **Description**: Retrieves the **top jobseekers by average rating** (admins only; JWT + `AdminGuard`).
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
- **Response (Error - 401, invalid/missing token)**:   
  ```json
  { "statusCode": 401, "message": "Invalid token", "error": "Unauthorized" }
- **Response (Error - 401, if user is not an admin)**:   
  ```json
  { "statusCode": 401, "message": "Unauthorized", "error": "Unauthorized" }

### 60. Upload Avatar
- **Endpoint**: `POST /api/profile/upload-avatar`
- **Description**: Uploads an avatar image for the authenticated user and updates their profile picture.  
  - Accepts **form-data** with a single file field named **`avatar`**.  
  - Supported types: **JPEG/JPG/PNG**. Max size: **5 MB**.  
  - On success, returns the **updated profile** (same shape as `GET /api/profile/myprofile`).
- **Headers**: `Authorization: Bearer <token>`
- **Request Body (multipart/form-data)**:
  - `avatar` — file (JPEG/JPG/PNG, ≤ 5MB)
- **Response (Success — 200)**: *Updated profile object*
  ```json
  {
    "id": "<userId>",
    "role": "jobseeker",
    "email": "user@example.com",
    "username": "jane",
    "country": "US",
    "languages": ["English","German"],
    "skills": [],
    "experience": "3 years",
    "description": "Up to 150 words ...",
    "portfolio": "https://portfolio.com",
    "video_intro": "https://video.com",
    "resume": "https://example.com/resume.pdf",
    "timezone": "Europe/Helsinki",
    "currency": "USD",
    "average_rating": 4.2,
    "profile_views": 12,
    "avatar": "https://cdn.example.com/avatars/<file>.jpg",
    "identity_verified": false,
    "reviews": []
  }
- **Response (Error — 400, file missing)**
      ```json
  {"statusCode": 400,"message": "Avatar file is required","error": "Bad Request"}
- **Response (Error — 400, invalid file type)**
      ```json
  {"statusCode": 400,"message": "Only JPEG, JPG, and PNG files are allowed","error": "Bad Request"}
- **Response (Error — 401, missing/invalid token)**
      ```json
  {"statusCode": 401,"message": "Invalid token","error": "Unauthorized"}
- **Response (Error — 404, user not found)**
      ```json
  {"statusCode": 404,"message": "User not found","error": "Not Found"}

### 61. Upload Identity Document
- **Endpoint**: `POST /api/profile/upload-identity`
- **Description**: Uploads an identity document for verification from the authenticated user’s device.  
  - Accepts **form-data** with a single file field named **`document`**.  
  - Supported types: **JPEG/JPG/PNG/PDF**. Max size: **10 MB**.  
  - On success, returns the **updated profile** (same shape as `GET /api/profile/myprofile`).
- **Headers**: `Authorization: Bearer <token>` (required)
- **Request Body (multipart/form-data)**:
  - `document` — file (JPEG/JPG/PNG/PDF, ≤ 10MB)
- **Response (Success — 200)**: *Updated profile object*  
*(same structure as “Get Profile” response)*
- **Response (Error — 400, file missing)**
  ```json
  {"statusCode": 400,"message": "Document file is required","error": "Bad Request"}
- **Response (Error — 400, invalid file type)**
  ```json
  {"statusCode": 400,"message": "Only JPEG, JPG, PNG, and PDF files are allowed","error": "Bad Request"}
- **Response (Error — 401, missing/invalid token)**
  ```json
  {"statusCode": 401,"message": "Invalid token","error": "Unauthorized"}
- **Response (Error — 404, user not found)**
  ```json
  {"statusCode": 404,"message": "User not found","error": "Not Found"}

### 62. Upload Resume
- **Endpoint**: `POST /api/profile/upload-resume`
- **Description**: Uploads a resume file for the authenticated **jobseeker** from their device.  
  - Accepts **form-data** with a single file field named **`resume`**.  
  - Supported types: **PDF/DOC/DOCX**. Max size: **10 MB**.  
  - On success, returns the **updated profile** (same shape as `GET /api/profile/myprofile`).
- **Headers**: `Authorization: Bearer <token>` (required)
- **Request Body (multipart/form-data)**:
  - `resume` — file (PDF/DOC/DOCX, ≤ 10MB)
- **Response (Success — 200)**: *Updated profile object*  
*(same structure as “Get Profile” response)*
- **Response (Error — 400, invalid file type)**
  ```json
  {"statusCode": 400,"message": "Only PDF, DOC, and DOCX files are allowed","error": "Bad Request"}
- **Response (Error — 400, file missing)**
  ```json
  {"statusCode": 400,"message": "Resume file is required","error": "Bad Request"} 
- **Response (Error — 400, wrong role)**
  ```json
  {"statusCode": 400,"message": "Only jobseekers can upload resumes","error": "Bad Request"}  
- **Response (Error — 401, missing/invalid token)**
  ```json
  {"statusCode": 401,"message": "Invalid token","error": "Unauthorized"}
- **Response (Error — 404, user/profile not found)**
  ```json
  {"statusCode": 404,"message": "User not found","error": "Not Found"}

### 63. Verify Identity (Admin)
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

### 64. Set Global Application Limit (Admin)
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

### 65. Get Global Application Limit (Admin)
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

### 66. Increment Job Post Views
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
  {"statusCode": 404,"message": "Job post not found","error": "Not Found"}

### 67. Block User (Admin/Moderator)
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

### 68. Unblock User (Admin/Moderator)
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

### 69. Increment Profile Views
- **Endpoint**: `POST /api/profile/:id/increment-view`
- **Description**: Increments the view count for a specific **jobseeker** profile.
- **Headers**: `Authorization: Bearer <token>`
- **Request Parameters**: `id`: The ID of the user (jobseeker).
- **Response (Success - 200)**:
  ```json
  {
    "message": "Profile view count incremented",
    "profile_views": 1
  }
- **Response (Error — 404, user not found):**:
  ```json
  {"statusCode": 404,"message": "User not found","error": "Not Found"}
- **Response (Error — 404, jobseeker profile not found)**:
  ```json
  {"statusCode": 404,"message": "JobSeeker profile not found","error": "Not Found"}
- **Response (Error — 400, user is not a jobseeker)**:
  ```json
  {"statusCode": 400,"message": "Profile views can only be incremented for jobseekers","error": "Bad Request"}

### 70. Get Top Jobseekers by Profile Views (Admin/Moderator)
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

### 71. Export Users to CSV (Admin/Moderator)
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

### 72. Get Top Employers by Job Posts (Admin)
- **Endpoint**: `GET /api/admin/leaderboards/top-employers-by-posts`
- **Description**: Retrieves the **top employers by number of job posts created**. Admins only (JWT + `AdminGuard`).
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
- **Response (Error — 401, invalid/missing token or not an admin)**:  
    ```json
  { "statusCode": 401, "message": "Invalid token", "error": "Unauthorized" }
  { "statusCode": 401, "message": "Unauthorized", "error": "Unauthorized" }

### 73. Get Growth Trends (Admin/Moderator)
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

### 74. Get Recent Registrations (Admin/Moderator)
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

### 75. Get Registrations Breakdown by Brand (Admin/Moderator)
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

### 76. Get Job Posts with Applications (Admin/Moderator)
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

### 77. Get Online Users (Admin/Moderator)
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

### 78. Get User Online Status
- **Endpoint**: `GET /api/users/:id/online`
- **Description**: Returns whether a specific user is currently online. Online status is stored in Redis (`online:<userId>` → `role`).  
- **Headers**: `Authorization: Bearer <token>`
- **Authentication**: `Authorization: Bearer <JWT>` (required). Only roles **jobseeker**, **employer**, **admin**, and **moderator** may access.  
- **Request Parameters**: `id`: The ID of the user.
- **Response (Success - 200)**:
  ```json
  {
    "userId": "5f4d2b2a-9b2a-4a7a-8c8e-2d1a1e33f9f1",
    "isOnline": true,
    "role": "jobseeker"
  }
- **Response (Error - 401, if token is invalid)**:
  ```json
  {"statusCode": 401,"message": "Invalid token","error": "Unauthorized"}
- **Response (Error - 401, if user role is not supported)**:
  ```json
  {"statusCode": 401,"message": "Only jobseekers, employers, admins, or moderators can check online status","error": "Unauthorized"}
- **Response (Error - 404, if user not found)**:
  ```json
  {"statusCode": 404,"message": "User not found","error": "Not Found"}

### 79. Get User Risk Score (Admin/Moderator)
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

### 80. Search Talents
- **Endpoint**: `GET /api/talents`  
- **Description**: Returns a paginated list of jobseekers (talents) filtered by skills (category IDs, with descendant expansion), experience, free-text description, minimum rating, timezone, country/countries, languages, and resume presence. Multi-value params accept both arrays and comma-separated lists.  
- **Authentication**: Public (unless restricted by global guards).  
- **Content Type**: `application/json`
- **Request Parameters**:
  - `skills` *(string | string[], optional)* — Filter by **Category IDs**. Accepts:
    - `skills=123`
    - `skills=123,456`
    - `skills[]=123&skills[]=456`
  - `skills[]` *(string | string[], optional)* — Alternate bracket form; merged with `skills`.
  - `experience` *(string, optional)* — Partial match on `jobSeeker.experience` (ILIKE), e.g., `3 years`,   `Senior`.
  - `description` *(string, optional)* — Partial match on `jobSeeker.description` (ILIKE), e.g., `React   developer`.
  - `rating` *(number as string, optional)* — Minimum average rating (**0–5**). Invalid values → `400`.
  - `timezone` *(string, optional)* — Exact match, e.g., `Europe/Helsinki`.
  - `job_search_status` *(enum, optional)* — One of: `actively_looking | open_to_offers | hired`. Invalid → `400`.
  - `expected_salary_min` *(number as string, optional)* — **>= 0**; filters `expected_salary >= value`. Invalid  → `400`.
  - `expected_salary_max` *(number as string, optional)* — **>= 0**; filters `expected_salary <= value`. Invalid  → `400`.
  - `page` *(number as string, optional)* — **>= 1**; default `1`. Invalid → `400`.
  - `limit` *(number as string, optional)* — **1..100**; default `10`, capped at `100`. Invalid → `400`.
  - `sort_by` *(enum, optional)* — `average_rating | profile_views`; default `average_rating`. Invalid → `400`.
  - `sort_order` *(enum, optional)* — `ASC | DESC`; default `DESC`. Invalid → `400`.
  - `country` *(string, optional)* — Country **name or ISO-2**; normalized to ISO-2 (e.g., `United States`,   `USA`, `us` → `US`).
  - `countries` *(string | string[], optional)* — Multiple countries; array or comma list; normalized to ISO-2.
  - `languages` *(string | string[], optional)* — Accepts codes and names (`en`, `eng`, `english`, `Spanish`,   etc.). Normalized to canonical names (see below).
  - `languages_mode` *(enum, optional)* — `any` (default, intersection) | `all` (must contain all).
  - `has_resume` *(string, optional)* — `true | false` (presence filter).
- **Example Request**: `/api/talents?skills=<skillId>&experience=3 years&description=React&rating=4&timezone=America/New_York&page=1&limit=10&sort_by=average_rating&sort_order=DESC`
  `/api/talents?skills[]=123&skills=456&country=PH&languages=en,es&languages_mode=all&has_resume=true&page=1&limit=20`
  `/api/talents?countries=IN,BD&has_resume=false`
- **Response (Success - 200)**:
  ```json
  {
    "total": 50,
    "data": [
      {
        "id": "e2fe3b1c-2f7e-4a49-9b1c-2a7b879f2b0a",
        "username": "john_doe",
        "email": "john@example.com",
        "skills": [
          { "id": "123", "name": "Web Development", "parent_id": "10" }
        ],
        "experience": "3 years",
        "description": "React/Node developer",
        "portfolio": "https://portfolio.example",
        "video_intro": "https://video.example",
        "timezone": "America/New_York",
        "currency": "USD",
        "expected_salary": 3500,
        "average_rating": 4.6,
        "profile_views": 127,
        "job_search_status": "open_to_offers",
        "identity_verified": true,
        "avatar": "/uploads/avatars/john.png",
        "country": "US",
        "languages": ["English", "Spanish"],
        "has_resume": true
      }
    ]
  }
- **Error Responses (400 Bad Request)**:
  ```json
  { "statusCode": 400, "message": "Rating must be between 0 and 5", "error": "Bad Request" }
  { "statusCode": 400, "message": "expected_salary_min must be a non-negative number", "error": "Bad Request" }
  { "statusCode": 400, "message": "expected_salary_max must be a non-negative number", "error": "Bad Request" }
  { "statusCode": 400, "message": "Page must be a positive integer", "error": "Bad Request" }
  { "statusCode": 400, "message": "Limit must be a positive integer", "error": "Bad Request" }
  { "statusCode": 400, "message": "Sort_by must be average_rating or profile_views", "error": "Bad Request" }
  { "statusCode": 400, "message": "Sort_order must be ASC or DESC", "error": "Bad Request" }
  { "statusCode": 400, "message": "job_search_status must be: actively_looking | open_to_offers | hired", "error": "Bad Request" }

### 81. Submit Complaint
- **Endpoint**: `POST /api/complaints`
- **Description**: Allows **authenticated** jobseekers or employers to submit a complaint against a **job post** or another user's **profile**. Exactly **one** target must be provided.
- **Headers**: `Authorization: Bearer <token>`
- **Request Body**:
  ```json
  {
    "job_post_id": "<jobPostId>",  // optional, use when complaining about a job post
    "profile_id": "<userId>",      // optional, use when complaining about a user profile
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
- **Response (Error — 400, neither or both targets provided)**:
  ```json
  {"statusCode": 400,"message": "Either job_post_id or profile_id must be provided","error": "Bad Request"}
  {"statusCode": 400, "message": "Only one of job_post_id or profile_id can be provided","error": "Bad Request"}
- **Response (Error - 400, if complaining about own profile)**:
  ```json
  {"statusCode": 400,"message": "Cannot submit a complaint against your own profile","error": "Bad Request"}  
- **Response (Error — 400, duplicate pending complaint)**:
  ```json
  {"statusCode": 400,"message": "You have already submitted a pending complaint for this target","error": "Bad Request"}    
- **Response (Error - 401, if token invalid)**:
  ```json
  {"statusCode": 401,"message": "Invalid token","error": "Unauthorized"}
- **Response (Error — 401, role not permitted)**:
  ```json
  {"statusCode": 401,"message": "Only jobseekers and employers can submit complaints","error": "Unauthorized"}
- **Response (Error — 404, not found)**:
  ```json
  {"statusCode": 404,"message": "Job post not found","error": "Not Found"}
  {"statusCode": 404,"message": "Profile not found","error": "Not Found"}
  {"statusCode": 404,"message": "Complainant not found","error": "Not Found"}

### 82. Get Complaints (Admin)
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

### 83. Resolve Complaint (Admin)
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

### 84. Get Public Statistics
- **Endpoint**: `GET /api/stats`
- **Description**: Retrieves public statistics about the platform, including the total number of resumes (jobseeker profiles), active & approved job posts, and employers. Accessible to all users.
- **Headers**: None
- **Request Parameters**: None
- **Response (Success - 200)**:
  ```json
  {
    "totalResumes": 150,
    "totalJobPosts": 300,
    "totalEmployers": 50
  }

### 85. Notify Job Seekers (Admin)
- **Endpoint**: `POST /api/admin/job-posts/:id/notify-candidates`
- **Description**: Send email notifications to eligible jobseekers whose skills/categories match the selected categories of the target job post.
Only Active job posts are eligible.
A user is included in the pool only if:
  - their role is jobseeker;
  - their account status is active;
  - their email is verified;
  - they have at least one matching skill/category from the selected categories;
  - they have not applied to this job post;
  - they have not previously received an email notification for this job post.
The admin may optionally restrict notifications to specific categories attached to the job; otherwise all categories of the job post are used.
The selection can be ordered by earliest sign-ups, latest sign-ups, or randomized.
The effective send limit is capped at 1000 per request.
- **Headers**: `Authorization: Bearer <token>`
- **Request Parameters**: `id`: The ID of the job post
- **Request Body**:
  ```json
  {
    "limit": 50,
    "orderBy": "end",           // one of: "beginning" | "end" | "random"
    "categoryIds": [            // optional; array of category IDs attached to this job post
      "uuid-of-category-1",
      "uuid-of-category-2"
    ]
  }
- **Response (Success - 200)**:
  ```json
  {
    "total": 120,                         // total number of eligible jobseekers found
    "sent": 50,                           // number of emails successfully sent
    "emails": ["user1@example.com", "user2@example.com"],
    "jobPostId": "<jobPostId>"
  }
- **Response (Error - 400 Bad Request — invalid input)**:
  ```json
  {"statusCode": 400, "message": "Limit must be a positive integer", "error": "Bad Request"}
  {"statusCode": 400, "message": "OrderBy must be one of: beginning, end, random", "error": "Bad Request"}
  {"statusCode": 400, "message": "Notifications can only be sent for active job posts", "error": "Bad Request"}
  {"statusCode": 400, "message": "Job post has no categories assigned", "error": "Bad Request"}
  {"statusCode": 400, "message": "Selected categories do not belong to this job post", "error": "Bad Request"}
- **Response (Error - 401 Unauthorized — missing/malformed token or invalid token)**:
  ```json
  {"statusCode": 401, "message": "Invalid token", "error": "Unauthorized"}
- **Response (Error - 403 Forbidden — not an admin)**:
  ```json
  {"statusCode": 403, "message": "Forbidden resource", "error": "Forbidden"}
- **Response (Error - 404 Not Found — job post does not exist)**:
  ```json
  {"statusCode": 404, "message": "Job post not found", "error": "Not Found"}

### 86. Notify Referral Applicants (Admin)
- **Endpoint**: `POST /api/admin/job-posts/:id/notify-referral-applicants`
- **Description**: Send email notifications to eligible jobseekers who previously registered via referral links that pointed to related job posts.
A related job post is one that shares at least one category with the target job post, optionally further restricted by:
  - a subset of categories chosen by the admin, and/or
  - a set of specific previous job posts selected by the admin.
Only Active job posts are eligible.
A user is included in the pool only if:
  - they registered via a referral link belonging to a related job post (according to the filters above);
  - their role is jobseeker;
  - their account status is active;
  - their email is verified;
  - they have not applied to the target job post;
  - they have not previously received an email notification for the target job post.
The selection can be ordered by earliest sign-ups, latest sign-ups, or randomized.
The effective send limit is capped at 1000 per request.
- **Headers**: `Authorization: Bearer <token>`
- **Request Parameters**: `id`: The ID of the job post
- **Request Body**:
  ```json
  {
    "limit": 50,
    "orderBy": "end",            // one of: "beginning" | "end" | "random"
    "categoryIds": [             // optional; subset of categories of the target job post
      "uuid-of-category-1",
      "uuid-of-category-2"
    ],
    "sourceJobIds": [            // optional; job posts whose referral signups should be considered
      "uuid-of-source-job-1",
      "uuid-of-source-job-2"
    ]
  }
- **Response (Success - 200)**:
  ```json
  {
    "total": 120,                 // total number of eligible referral jobseekers found
    "sent": 50,                   // number of emails successfully sent
    "jobPostId": "<jobPostId>"
  }
- **Response (Error - 400 Bad Request — invalid input)**:
  ```json
  {"statusCode": 400, "message": "Limit must be a positive integer", "error": "Bad Request"}
  {"statusCode": 400, "message": "OrderBy must be one of: beginning, end, random", "error": "Bad Request"}
  {"statusCode": 400, "message": "Notifications can only be sent for active job posts", "error": "Bad Request"}
  {"statusCode": 400, "message": "Job post has no categories assigned", "error": "Bad Request"}
  {"statusCode": 400, "message": "Selected categories do not belong to this job post", "error": "Bad Request"}
  {"statusCode": 400, "message": "Selected jobs do not share categories with this job post", "error": "Bad Request"}
- **Response (Error - 401 Unauthorized — missing/malformed token or invalid token)**:
  ```json
  {"statusCode": 401, "message": "Invalid token", "error": "Unauthorized"}
- **Response (Error - 403 Forbidden — not an admin)**:
  ```json
  {"statusCode": 403, "message": "Forbidden resource", "error": "Forbidden"}
- **Response (Error - 404 Not Found — job post does not exist)**:
  ```json
  {"statusCode": 404, "message": "Job post not found", "error": "Not Found"}

### 87. Get Chat History (Admin)
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

### 88. Submit Success Story
- **Endpoint**: `POST /api/platform-feedback`
- **Description**: Allows **authenticated jobseekers or employers** to submit feedback / success stories about the platform.
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
- **Response (Error - 401, if token is missing/invalid)**:
  ```json
  { "statusCode": 401, "message": "Invalid token", "error": "Unauthorized" }
- **Response (Error - 401, if user is not jobseeker/employer)**:
  ```json
  {"statusCode": 401,"message": "Only jobseekers and employers can submit platform feedback","error": "Unauthorized"}
- **Response (Error - 400, if required fields missing)**:
  ```json
  { "statusCode": 400, "message": "Story is required", "error": "Bad Request" }
  { "statusCode": 400, "message": "Headline is required", "error": "Bad Request" }
- **Response (Error - 404, if user not found)**:
  ```json
  { "statusCode": 404, "message": "User not found", "error": "Not Found" }

### 89. Get Success Stories (Public)
- **Endpoint**: `GET /api/platform-feedback`
- **Description**: Retrieves a paginated list of **published** platform feedback and success stories (`is_public = true`). Accessible to everyone (no auth required).
- **Query Parameters (optional)**:
  - `page` — number (default: `1`, must be ≥ 1)
  - `limit` — number (default: `10`, must be ≥ 1)
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
- **Response (Error — 400, invalid page)**:
  ```json
  { "statusCode": 400, "message": "Page must be a positive integer", "error": "Bad Request" }
- **Response (Error — 400, invalid limit)**:
  ```json
  { "statusCode": 400, "message": "Limit must be a positive integer", "error": "Bad Request" }

### 90. Get Platform Feedback (Admin/Moderator)
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

### 91. Publish Platform Feedback (Admin/Moderator)
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

### 92. Unpublish Platform Feedback (Admin/Moderator)
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

### 93. Delete Platform Feedback (Admin/Moderator)
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

### 94. Reject Job Post (Admin/Moderator)
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

### 95. Get Email Notification Stats for Job Post (Admin)
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

### 96. Get All Email Notification Stats (Admin)
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

### 97. Create Referral Link for Job Post (Admin/Moderator)
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

### 98. Get All Referral Links (Admin/Moderator)
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

### 99. List Referral Links for a Job Post (Admin/Moderator)
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

### 100. Update Referral Link Description (Admin/Moderator)
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

### 101. Delete Referral Link (Admin/Moderator)
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

### 102. Referral Redirect (Public)
- **Endpoint**: `GET /ref/:refCode`
- **Description**: Looks up the referral code, increments its click counter, sets referral cookies, and redirects the user to the intended target (job page or site page).
- **Path Parameters**:
  - `refCode` — referral code string.
- **Cookies set**:
  - `ref` — referral code, 30 days, `SameSite=Lax`.
  - `jf_ref` — referral code (alias), 30 days, `SameSite=Lax`.
  - `ref_to` — URL-encoded redirect path for post-signup redirect, 7 days, `SameSite=Lax`.
- **Response (Success — 302 Redirect)**: Redirects to `redirectTo` (e.g., `/vacancy/<slug>` or a site path).
- **Response (Error — 404)**:
  ```text
    Referral link not found
- **Response (Error — 500)**:
  ```text
    Internal server error

### 103. Track Referral Click (Public)
- **Endpoint**: `POST /api/ref/track`
- **Description**: Registers a click for a referral code on SPA pages (e.g., when landing on /job/<slug_id>?ref=<refCode>). Call once on initial mount.
- **Request Body**:
  ```json
  {"ref": "<refCode>"}
- **Cookies set**:
  - `ref` — referral code, 30 days, `SameSite=Lax`.
  - `jf_ref` — referral code (alias), 30 days, `SameSite=Lax`.
  - `ref_to` — URL-encoded redirect path for post-signup redirect, 7 days, `SameSite=Lax`.
- **Response (Success — 200)**:
  ```json
  {"ok": true,"redirectTo": "/vacancy/software-engineer-remote--8df3b0be","jobPostId": "<jobPostId>"}
- **Response (Error — 400)**:
  ```json
  {"statusCode": 400,"message": "ref is required","error": "Bad Request"}
- **Response (Error — 404)**:
  ```json
  {"statusCode": 404,"message": "Referral link not found","error": "Not Found"}
- **Response (Error — 500)**:
  ```json
  {"statusCode": 500,"message": "Internal server error","error": "Internal Server Error"}   

### 104. Get Chat History
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
  {"statusCode": 401,"message": "Invalid token",}
- **Response (Error - 400, if pagination parameters are invalid)**:
  ```json
  {"statusCode": 400,"message": "Page must be a positive integer",}
- **Response (Error - 404, if job application not found or not accepted)**:
  ```json
  {"statusCode": 404,"message": "Job application not found",}

### 105. Get Job Posts by Main Categories Stats
- **Endpoint**: `GET /api/stats/job-posts-by-main-categories`
- **Description**: Returns the number of **active & approved** job posts per **top-level** category, including all of each category’s **descendant subcategories** (recursive roll-up). Categories with zero jobs are excluded. Results are **sorted by count (DESC)**.
- **Headers**: None
- **Query Params**: None
- **Counting rules**:
  - `job_posts.status = 'Active'`
  - `job_posts.pending_review = false`
  - Counts from subcategories are included in their parent’s total.
- **Response (200)**:
  ```json
  [
    { "categoryId": "<mainCatId>", "categoryName": "Development", "count": 42 },
    { "categoryId": "<mainCatId>", "categoryName": "Design", "count": 17 }
  ]
- **Response (Error - 500, if internal error)**:
  ```json
  {"statusCode": 500,"message": "Internal server error","error": "Internal Server Error"}

### 106. Get Job Posts by Subcategories Stats
- **Endpoint**: `GET /api/stats/job-posts-by-subcategories`
- **Description**: Returns the number of **active & approved** job posts per **subcategory** (`categories.parent_id IS NOT NULL`). Counts include only the jobs **directly tagged** with each subcategory (no recursive roll-up). Categories with zero jobs are excluded. Results are **sorted by count (DESC)**.
- **Headers**: None
- **Query Params**: None
- **Counting rules**:
  - `job_posts.status = 'Active'`
  - `job_posts.pending_review = false`
  - Only subcategories (have a `parent_id`).
- **Response (200)**:
  ```json
  [
    { "categoryId": "<subCatId>", "categoryName": "Frontend", "count": 17 },
    { "categoryId": "<subCatId>", "categoryName": "Copywriting", "count": 12 }
  ]
- **Response (Error - 500, if internal error)**:
  ```json
  {"statusCode": 500,"message": "Internal server error","error": "Internal Server Error"}  

### 107. Contact — Send a message
- **Endpoint:** `POST /api/contact`
- **Description:** Sends a message from the website contact form to support. Works in two modes:
  - **Guest (public):** no JWT, CAPTCHA required, honeypot enforced, links are forbidden.
  - **Dashboard (authenticated):** valid JWT, no CAPTCHA, name/email are taken from the account.
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
- **Response (Error - 400 Bad Request — links not allowed)**:
  ```json
  { "statusCode": 400, "message": "Links are not allowed in the message.", "error": "Bad Request" }
- **Response (Error - 403 Forbidden — honeypot triggered)**:
  ```json
  { "statusCode": 403, "message": "Spam detected.", "error": "Forbidden" }
- **Response (Error - 403 Forbidden — CAPTCHA failed (guest))**:
  ```json
  { "statusCode": 403, "message": "CAPTCHA verification failed.", "error": "Forbidden" }

### 108. Get Chat Notification Settings (Admin)
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

### 109. Update Chat Notification Settings (Admin)
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

### 110. Employer: Invite a candidate
- **Endpoint:** `POST /api/job-applications/invitations`
- **Description:** Allows an **employer** to invite a jobseeker to apply for one of their **active & approved** job posts.  
  If a pending invitation already exists for the same job post and jobseeker, it is returned as-is.
- **Headers:** `Authorization: Bearer <token>` (role must be `employer`)
- **Request Body:**:
  ```json
  {
    "job_post_id": "<jobPostId>",
    "job_seeker_id": "<userId>",
    "message": "We think you’re a great fit for this role"
  }
- **Response (201)**:
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
- **Response (Error — 401, invalid or missing token)**:
  ```json
  { "statusCode": 401, "message": "Invalid token", "error": "Unauthorized" }
- **Response (Error — 401, role not allowed)**:
  ```json
  { "statusCode": 401, "message": "Only employers can send invitations", "error": "Unauthorized" }
- **Response (Error — 404, user/jobseeker/job post not found)**:
  ```json
  { "statusCode": 404, "message": "User not found", "error": "Not Found" }
  { "statusCode": 404, "message": "Job post not found or you do not have permission to invite for it", "error": "Not Found" }
  { "statusCode": 404, "message": "Jobseeker not found", "error": "Not Found" }
- **Response (Error — 400, business rules)**:
  ```json
  { "statusCode": 400, "message": "You can invite only for active and approved job posts", "error": "Bad Request" }
  { "statusCode": 400, "message": "Cannot invite yourself", "error": "Bad Request" }
  { "statusCode": 400, "message": "Candidate has already applied to this job", "error": "Bad Request" }

### 111. Jobseeker: List invitations
- **Endpoint:** `GET /api/job-applications/invitations`
- **Description:** Returns invitations for the authenticated **jobseeker**.  
  - By default, returns **only pending** invitations.  
  - If `includeAll=true`, returns invitations of **all statuses**.
- **Headers:** `Authorization: Bearer <token>`
- **Query Parameters (optional):**
  - `includeAll` — `true|false` (default: `false`)
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
- **Response (Error — 401, invalid/missing token)**:
  ```json
  { "statusCode": 401, "message": "Invalid token", "error": "Unauthorized" }
- **Response (Error — 404, user not found)**:
  ```json
  { "statusCode": 404, "message": "User not found", "error": "Not Found" }

### 112. Jobseeker: Decline invitation
- **Endpoint:** `POST /api/job-applications/invitations/:id/decline`
- **Description:** Allows an **authenticated jobseeker** to decline a pending invitation.  
  If the invitation is not in `Pending` status, the current invitation object is returned unchanged.
- **Headers:** `Authorization: Bearer <token>`
- **Path Parameters:**
  - `id` — invitation ID (string, required)
- **Request Body:** _none_
- **Response (200)**:
  ```json
  {
    "id": "<invitationId>",
    "status": "Declined",
    "job_post_id": "<jobPostId>",
    "job_seeker_id": "<userId>",
    "employer_id": "<employerId>",
    "message": "We think you’re a great fit...",
    "created_at": "2025-10-06T10:00:00.000Z",
    "updated_at": "2025-10-06T10:05:00.000Z"
  }
- **Response (Error — 401, invalid/missing token)**:
  ```json
  { "statusCode": 401, "message": "Invalid token", "error": "Unauthorized" }
- **Response (Error — 401, role not allowed)**:
  ```json
  { "statusCode": 401, "message": "Only jobseekers can decline invitations", "error": "Unauthorized" }
- **Response (Error — 404, user or invitation not found / not yours)**:
  ```json
  { "statusCode": 404, "message": "User not found", "error": "Not Found" }
  { "statusCode": 404, "message": "Invitation not found", "error": "Not Found" }

### 113. Jobseeker: Accept invitation (starts application flow)
- **Endpoint:** `POST /api/job-applications/invitations/:id/accept`
- **Description:** Accepts a **pending** invitation for the authenticated **jobseeker** and creates a job application (same validations as regular apply). If an application for this job already exists, the invite is marked **Accepted** and the **existing application** is returned.
- **Headers:** `Authorization: Bearer <token>`
- **Path Parameters:**
  - `id` — invitation ID (string, required)
- **Request Body (same shape as regular application):**
  ```json
  {
    "cover_letter": "Why I'm a good fit...",
    "relevant_experience": "3 years with Django, SQL...",
    "full_name": "Jane Doe",
    "referred_by": "Alex P."
  }
- **Response (Success — 201 Created, new application)**
  ```json
  {
    "id": "<applicationId>",
    "job_post_id": "<jobPostId>",
    "job_seeker_id": "<userId>",
    "status": "Pending",
    "cover_letter": "Why I'm a good fit...",
    "relevant_experience": "3 years with Django, SQL...",
    "full_name": "Jane Doe",
    "referred_by": "Alex P.",
    "created_at": "2025-10-06T10:00:00.000Z",
    "updated_at": "2025-10-06T10:00:00.000Z"
  }
- **Response (Success — 200 OK, application already existed)**
  ```json
  {
    "id": "<existingApplicationId>",
    "job_post_id": "<jobPostId>",
    "job_seeker_id": "<userId>",
    "status": "Pending",
    "cover_letter": "Previously submitted cover letter...",
    "relevant_experience": "Previously submitted experience...",
    "created_at": "2025-09-25T12:00:00.000Z",
    "updated_at": "2025-09-25T12:00:00.000Z"
  }
- **Response (Error — 401, invalid/missing token)**:
  ```json
  { "statusCode": 401, "message": "Invalid token", "error": "Unauthorized" }
- **Response (Error — 401, role not allowed)**:
  ```json
  { "statusCode": 401, "message": "Only jobseekers can accept invitations", "error": "Unauthorized" }
- **Response (Error — 404, user or invitation not found / not yours)**:
  ```json
  { "statusCode": 404, "message": "User not found", "error": "Not Found" }
  { "statusCode": 404, "message": "Invitation not found", "error": "Not Found" }
- **Response (Error — 400, invitation not pending)**:
  ```json
  { "statusCode": 400, "message": "Invitation is not pending", "error": "Bad Request" }

### 114. Send message to selected applicants
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

### 115. Bulk reject applications
- **Endpoint:** `POST /api/job-applications/bulk-reject`
- **Description:** For the authenticated **employer**, rejects multiple **Pending** applications that belong to the employer’s own job posts.
- **Headers:** `Authorization: Bearer <token>`
- **Request Body:**:
  ```json
  {
    "applicationIds": ["<applicationId1>", "<applicationId2>", "..."]
  }
- **Response (200)**:
  ```json
  { "updated": 2, "updatedIds": ["<applicationId1>", "<applicationId2>"] }
- **Response (Error — 400, invalid body)**:
  ```json
  { "statusCode": 400, "message": "applicationIds must be a non-empty array", "error": "Bad Request" }
  { "statusCode": 400, "message": "Too many applicationIds (max 1000)", "error": "Bad Request" }
- **Response (Error — 401, invalid/missing token)**:
  ```json
  { "statusCode": 401, "message": "Invalid token", "error": "Unauthorized" }
- **Response (Error — 401, role not allowed)**:
  ```json
  { "statusCode": 401, "message": "Only employers can update application status", "error": "Unauthorized" }
- **Response (Error — 404, user not found)**:
  ```json
  { "statusCode": 404, "message": "User not found", "error": "Not Found" }

### 116. Set “Avatar Required on Registration” (Admin)
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

### 117. Get “Avatar Required on Registration” (Admin)
- **Endpoint:** `GET /api/admin/settings/registration-avatar`
- **Description:** Returns whether uploading an avatar is required during **registration**.
- **Headers**: `Authorization: Bearer <token>`
- **Response (Success - 200)**:
  ```json
  { "required": false }
- **Response (Error - 401 Unauthorized — missing/malformed token or invalid token)**:
  ```json
  {"statusCode": 401,"message": "Invalid token","error": "Unauthorized"}    

### 118. Get “Avatar Required on Registration” (Public)
- **Endpoint:** `GET /api/settings/registration-avatar`
- **Description:** Returns whether a jobseeker must upload an avatar during registration (no auth required).
- **Response (Success — 200):**
  ```json
  { "required": true }

### 119. Create Site Referral Link (Admin/Moderator)
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

### 120. Get Site Referral Links (Admin/Moderator)
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

### 121. Update Site Referral Link (Admin/Moderator)
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

### 122. Delete Site Referral Link (Admin/Moderator)
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

### 123. Upload Portfolio Files
- **Endpoint**: `POST /api/profile/upload-portfolio`
- **Description**: Uploads one or more portfolio files for the authenticated jobseeker.
Files are stored in S3 under the portfolios/... prefix, and their URLs are appended to the portfolio_files array in the jobseeker profile.
A profile can have up to 10 portfolio files in total.
- **Headers**: `Authorization: Bearer <token>`
  `Content-Type: multipart/form-data`
- **Request (multipart/form-data)**:
  - `portfolio_files` — required, array of files
      `Allowed types`: pdf, doc, docx, jpg, jpeg, png, webp
      `Max files per request`: 10
      `Max size per file`: 10 MB
- **Response (Success — 200)**:
  ```json
  {
    "id": "<userId>",
    "role": "jobseeker",
    "email": "test@example.com",
    "username": "jane_dev",
    "country": "US",
    "country_name": "United States",
    "skills": [],
    "experience": "2 years",
    "job_experience": "Worked as a frontend developer in 2 companies",
    "description": "Experienced web developer specializing in React and Node.js",
    "portfolio": "https://portfolio.com",
    "portfolio_files": [
      "https://cdn.example.com/portfolios/file1.pdf",
      "https://cdn.example.com/portfolios/file2.png"
    ],
    "video_intro": "https://video.com",
    "resume": "https://example.com/resume.pdf",
    "date_of_birth": "1992-07-15",
    "timezone": "Europe/Moscow",
    "currency": "USD",
    "expected_salary": 4500,
    "average_rating": 4.0,
    "profile_views": 12,
    "job_search_status": "open_to_offers",
    "linkedin": "https://www.linkedin.com/in/username",
    "instagram": "https://www.instagram.com/username",
    "facebook": "https://www.facebook.com/username",
    "whatsapp": "+15551234567",
    "telegram": "@username",
    "languages": ["English", "German"],
    "reviews": [],
    "avatar": "https://example.com/avatar.jpg",
    "identity_verified": false
  }
- **Response (Error — 400, no files)**
      ```json
  {"statusCode": 400,"message": "Portfolio files are required","error": "Bad Request"}
- **Response (Error — 400, invalid file type)**
      ```json
  {"statusCode": 400,"message": "Only PDF, DOC, DOCX, JPG, JPEG, PNG, and WEBP are allowed for portfolio files","error": "Bad Request"}
- **Response (Error — 400, too many files in profile)**
      ```json
  {"statusCode": 400,"message": "You can have up to 10 portfolio files","error": "Bad Request"}
- **Response (Error — 400, role not jobseeker)**
      ```json
  {"statusCode": 400,"message": "Only jobseekers can upload portfolio files","error": "Bad Request"}
- **Response (Error — 401)**
      ```json
  {"statusCode": 401,"message": "Invalid token","error": "Unauthorized"} 
- **Response (Error — 404)**
      ```json
  {"statusCode": 404,"message": "User not found","error": "Not Found"} 

### 124. Register an Affiliate
- **Endpoint:** `POST api/auth/register-affiliate`
- **Description:** Creates a new affiliate account (role = "affiliate"). Sends an email verification link. No file uploads; only JSON body.
  Password strength and geo-blocking rules are the same as for regular registration.
- **Headers**: 
  - `x-fingerprint` (required) — device/browser fingerprint string.
  - `x-forwarded-for` (optional) — client IP (used for geo & anti-fraud).
  - `x-real-ip` (optional) — alternative IP header.
  - `x-site-brand` (optional) — explicit brand for multi-brand setup. If omitted, backend infers brand from Origin / Referer / Host.
  - `x-ref (optional)` — referral code (also accepted via body/query/cookie).
- **Content-Type:** application/json
- **Request Body:**
  ```json
  {
    "email": "affiliate@example.com",
    "password": "StrongP@ssw0rd",
    "username": "Jane Affiliate",
    "role": "affiliate",
    "country": "US",                    // optional; inferred from IP if missing
    "account_type": "individual",       // "individual" | "company" (optional, defaults to "individual")
    "company_name": "My Media LLC",     // optional (for account_type = "company")
    "website_url": "https://my-traffic-site.com",  // REQUIRED
    "traffic_sources": ["SEO", "PPC", "Social"],   // optional, array of strings
    "promo_geo": ["US", "CA", "UK"],               // optional, array of strings
    "monthly_traffic": "10000+ visits",            // optional free-form string
    "payout_method": "PayPal",                     // optional
    "payout_details": "paypal@example.com",        // optional (not exposed publicly)
    "telegram": "@affiliate_username",             // optional
    "whatsapp": "+12025550123",                    // optional
    "skype": "live:affiliate.user",                // optional
    "notes": "Short description of traffic and verticals", // optional
    "ref": "AFF123"                                // optional referral code
  }
- **Response (Success - 200)**:
  ```json
  { "message": "Registration is successful. Please confirm your email." }
- **Response (Error - 400 Missing fingerprint)**:
  ```json
  { "statusCode": 400, "message": "Fingerprint is required", "error": "Bad Request" }
- **Response (Error - 403 Country blocked)**:
  ```json
  { "statusCode": 403, "message": "Registration is not allowed from your country", "error": "Forbidden" }
- **Response (Error - 400 Weak password)**:
  ```json
  { "statusCode": 400, "message": "Weak password", "error": "Bad Request" }
- **Response (Error - 400 Missing website URL)**:
  ```json
  {"statusCode": 400,"message": "website_url is required for affiliate registration","error": "Bad Request"}
- **Response (Error - 400 Email already exists (verified))**:
  ```json
  { "statusCode": 400, "message": "Email already exists", "error": "Bad Request" }
- **Response (Error - Email exists but not verified)**:
  ```json
  {"message": "Account exists but not verified. We sent a new confirmation link."}

### 125. Get Current Affiliate Profile (Affiliate Dashboard)
- **Endpoint:** `GET api/affiliates/me`
- **Description:** Returns the current authenticated affiliate’s profile, including both affiliate-specific fields and the base user object. Intended for use in the affiliate dashboard.
- **Authentication:** `Authorization: Bearer <accessToken>` — token must belong to a user with role = "affiliate"
- **Headers:** `Authorization (required)` — Bearer <JWT>.
- **Success Response (200):**:
  ```json
  {
    "user_id": "f6f4a1b0-1234-4cde-9fab-111111111111",
    "account_type": "individual",
    "company_name": "My Media LLC",
    "website_url": "https://my-traffic-site.com",
    "traffic_sources": "SEO, PPC, Social",
    "promo_geo": "US, CA, UK",
    "monthly_traffic": "10000+ visits",
    "payout_method": "PayPal",
    "payout_details": "paypal@example.com",
    "telegram": "@affiliate_username",
    "whatsapp": "+12025550123",
    "skype": "live:affiliate.user",
    "notes": "Short description of traffic and verticals",
    "referral_link": "https://your-site.com/r/aff123",
    "referred_by_user_id": null,
    "created_at": "2025-11-13T10:00:00.000Z",
    "updated_at": "2025-11-13T10:00:00.000Z",

    "user": {
      "id": "f6f4a1b0-1234-4cde-9fab-111111111111",
      "email": "affiliate@example.com",
      "username": "Jane Affiliate",
      "role": "affiliate",
      "country": "US",
      "avatar": "https://cdn.../avatars/abc.webp",
      "is_email_verified": true,
      "status": "active",
      "created_at": "2025-11-13T09:59:30.000Z",
      "updated_at": "2025-11-13T10:00:00.000Z"
    }
  }
- **Response (Error - 401 Missing/invalid token)**:
  ```json
  {"statusCode": 401,"message": "Invalid token","error": "Unauthorized"}
- **Response (Error - 401 Token belongs to non-affiliate user)**:
  ```json
  {"statusCode": 401,"message": "Only affiliates can access this resource","error": "Unauthorized"}
- **Response (Error - 404 Affiliate profile not found (edge case))**:
  ```json
  {"statusCode": 404,"message": "Affiliate profile not found","error": "Not Found"}

### 126. Get Category Analytics (Admin)
- **Endpoint:** `GET /api/admin/analytics/categories`
- **Description:** Returns aggregated statistics by categories for both jobseekers (based on their skills) and job posts (based on attached categories). Only categories with at least one matching jobseeker or job post are returned. Parent categories and their subcategories are sorted in descending order by count.
- **Authentication:** `Authorization: Bearer <token>`
- **Success Response (200):**:
  ```json
  {
    "jobseekers": [
      {
        "id": "parent-category-id",
        "name": "Design & Creative",
        "jobseekersCount": 150,
        "subcategories": [
          {
            "id": "sub-category-id",
            "name": "Graphic Design",
            "jobseekersCount": 80
          }
        ]
      }
    ],
    "jobPosts": [
      {
        "id": "parent-category-id",
        "name": "Design & Creative",
        "jobPostsCount": 40,
        "subcategories": [
          {
            "id": "sub-category-id",
            "name": "Graphic Design",
            "jobPostsCount": 18
          }
        ]
      }
    ]
  }
- **Response (Error – 401 Unauthorized — missing/malformed token or invalid token)**:
  ```json
  {"statusCode": 401, "message": "Invalid token", "error": "Unauthorized"}
- **Response (Error – 403 Forbidden — not an admin/moderator)**:
  ```json
  {"statusCode": 403, "message": "Forbidden resource", "error": "Forbidden"}