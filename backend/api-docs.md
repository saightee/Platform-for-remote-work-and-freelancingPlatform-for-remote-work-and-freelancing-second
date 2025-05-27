# API Documentation for Authentication

## Base URL
`http://localhost:3000`

## Endpoints

### 1. Register a User
- **Endpoint**: `POST api/auth/register`
- **Description**: Registers a user with email, password, username, and role (employer or jobseeker). Returns an access token for immediate login.
- **Request Body**:
  ```json
  {
    "email": "test@example.com",
    "password": "password",
    "username": "test",
    "role": "employer" // or "jobseeker"
  }

- **Response (Success - 200)**:
  ```json
  {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
  
- **Response (Error - 400, if email already exists)**:
  ```json
  {
    "statusCode": 400,
    "message": "Email already exists",
    "error": "Bad Request"
  }

- **Response (Error - 403, if country is blocked)**:
  ```json
  {
  "statusCode": 403,
  "message": "Registration is not allowed from your country",
  "error": "Forbidden"
  }

### 2. Login a User
- **Endpoint**: `POST api/auth/login`
- **Description**: Logs in a user with email and password, returns a JWT token.
- **Request Body**:
  ```json
  {
    "email": "test@example.com",
    "password": "password",
    "rememberMe": false // Optional, extends token expiry to 7 days if true
  }

- **Response (Success - 200)**:
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

- **Response (Error - 401, if user is blocked):**:
  ```json
  {
    "statusCode": 401,
    "message": "User is blocked",
    "error": "Unauthorized"
  }

### 3. Logout a User
- **Endpoint**: `POST api/auth/logout`
- **Description**: Logs out a user by blacklisting the JWT token.
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
- **Endpoint**: `GET /api/profile`
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
  //For jobseeker
  ```json
  {
    "id": "<userId>",
    "role": "jobseeker",
    "email": "test@example.com",
    "username": "test",
    "skills": ["JavaScript", "TypeScript"],
    "skillCategories": [
      {
        "id": "<skillCategoryId>",
        "name": "Web Development",
        "created_at": "2025-05-22T18:00:00.000Z",
        "updated_at": "2025-05-22T18:00:00.000Z"
      }
    ],
    "experience": "2 years",
    "portfolio": "https://portfolio.com",
    "video_intro": "https://video.com",
    "timezone": "Europe/Moscow",
    "currency": "USD",
    "average_rating": 4.0,
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
    "referral_link": "https://example.com/ref/updated",
    "timezone": "America/New_York",
    "currency": "EUR"
  }
  //For jobseeker
  ```json
  {
    "role": "jobseeker",
    "skills": ["JavaScript", "Python"],
    "categoryIds": ["<categoryId1>", "<categoryId2>"],
    "experience": "3 years",
    "portfolio": "https://newportfolio.com",
    "video_intro": "https://newvideo.com",
    "timezone": "America/New_York",
    "currency": "EUR"
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
- **Description**: Creates a new job post for an authenticated employer.
- **Headers**: `Authorization: Bearer <token>`
- **Request Body**:
  ```json
  {
    "title": "Software Engineer",
    "description": "We are looking for a skilled software engineer...",
    "location": "Remote",
    "salary": 50000,
    "status": "Active",
    "category_id": "<categoryId>", // Optional
    "job_type": "Full-time" // Optional: "Full-time", "Part-time", "Project-based"
  }
- **Response (Success - 200)**:
  ```json
  {
    "id": "<jobPostId>",
    "title": "Software Engineer",
    "description": "We are looking for a skilled software engineer...",
    "location": "Remote",
    "salary": 50000,
    "status": "Active",
    "category_id": "<categoryId>",
    "job_type": "Full-time",
    "employer_id": "<userId>",
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
- **Description**: Updates an existing job post for an authenticated employer.
- **Headers**: `Authorization: Bearer <token>`
- **Request Body:**:
  ```json
  {
    "title": "Senior Software Engineer",
    "description": "Updated description...",
    "location": "Remote",
    "salary": 60000,
    "status": "Closed",
    "category_id": "<categoryId>", // Optional
    "job_type": "Full-time" // Optional: "Full-time", "Part-time", "Project-based"
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
    "category_id": "<categoryId>",
    "job_type": "Full-time",
    "employer_id": "<userId>",
    "created_at": "2025-05-13T18:00:00.000Z",
    "updated_at": "2025-05-13T18:30:00.000Z"
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

### 10. Get Job Post
- **Endpoint**: `GET /api/job-posts/:id`
- **Description**: Retrieves a specific job post by ID.
- **Request Parameters**: `id`: The ID of the job post.

- **Response (Success - 200)**:
  ```json
  {
    "id": "<jobPostId>",
    "title": "Senior Software Engineer",
    "description": "Updated description...",
    "location": "Remote",
    "salary": 60000,
    "status": "Closed",
    "category_id": "<categoryId>",
    "category": {
      "id": "<categoryId>",
      "name": "Software Development",
      "created_at": "2025-05-13T18:00:00.000Z",
      "updated_at": "2025-05-13T18:00:00.000Z"
    },
    "job_type": "Full-time",
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
      "description": "Updated description...",
      "location": "Remote",
      "salary": 60000,
      "status": "Closed",
      "category_id": "<categoryId>",
      "category": {
        "id": "<categoryId>",
        "name": "Software Development",
        "created_at": "2025-05-13T18:00:00.000Z",
        "updated_at": "2025-05-13T18:00:00.000Z"
      },
      "job_type": "Full-time",
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

### 12. Create Category
- **Endpoint**: `POST /api/categories`
- **Description**: Creates a new category for job posts.
- **Request Body:**:
  ```json
  {
    "name": "Software Development"
  }

- **Response (Success - 200)**:
  ```json
  {
    "id": "<categoryId>",
    "name": "Software Development",
    "created_at": "2025-05-13T18:00:00.000Z",
    "updated_at": "2025-05-13T18:00:00.000Z"
  }

- **Response (Error - 400, if category already exists)**:
  ```json
  {
    "statusCode": 400,
    "message": "Category with this name already exists",
    "error": "Bad Request"
  }

- **Response (Error - 400, if name is missing)**:
  ```json
  {
    "statusCode": 400,
    "message": "Category name is required",
    "error": "Bad Request"
  }

### 13. Get Categories
- **Endpoint**: `GET /api/categories`
- **Description**: Retrieves all categories.
- **Response (Success - 200)**:
  ```json
  [
  {
    "id": "<categoryId>",
    "name": "Software Development",
    "created_at": "2025-05-13T18:00:00.000Z",
    "updated_at": "2025-05-13T18:00:00.000Z"
  }
  ]

### 14. Apply to Job Post
- **Endpoint**: `POST /api/job-applications`
- **Description**: Allows a jobseeker to apply to a job post. Applications are limited per job post (default: 100) and distributed over 4 days (60/20/10/10%). If the limit is reached for the current day, a "Job full" error is returned.
- **Headers**: `Authorization: Bearer <token>`
- **Request Body**:
  ```json
  {
    "job_post_id": "<jobPostId>"
  }

- **Response (Success - 200)**:
  ```json
  {
    "id": "<applicationId>",
    "job_post_id": "<jobPostId>",
    "job_seeker_id": "<userId>",
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
      "userId": "<jobseekerId>",
      "username": "john_doe107",
      "email": "jobseeker107@example.com",
      "jobDescription": "Experienced web developer with 5 years in React.",
      "appliedAt": "2025-05-15T06:12:00.000Z"
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

### 18. Update Application Status (Employer)
- **Endpoint**: `PUT /api/job-applications/:id`
- **Description**: Updates the status of a job application, accessible only to the employer who created the job post.
- **Headers**: `Authorization: Bearer <token>`  
- **Request Parameters**: `id`: The ID of the job application
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
- **Description**: Retrieves all active and approved job posts with optional filters, pagination, and sorting.
- **Query Parameters**:
  - `title` (string, optional): Filter by job title (partial match).
  - `location` (string, optional): Filter by location (partial match).
  - `job_type` (string, optional): Filter by job type ("Full-time", "Part-time", "Project-based").
  - `salary_min` (number, optional): Filter by minimum salary.
  - `salary_max` (number, optional): Filter by maximum salary.
  - `category_id` (string, optional): Filter by category ID.
  - `required_skills` (string or string[], optional): Filter by required skills (e.g., "required_skills=JavaScript" or "required_skills[]=JavaScript&required_skills[]=Python").
  - `page` (number, optional): Page number for pagination (default: 1).
  - `limit` (number, optional): Number of items per page (default: 10).
  - `sort_by` (string, optional): Field to sort by ("created_at" or "salary", default: "created_at").
  - `sort_order` (string, optional): Sort order ("ASC" or "DESC", default: "DESC").
- **Example Request**: `/api/job-posts/search?title=Engineer&location=Remote&salaryMin=40000&salaryMax=60000&job_type=Full-time&category_id=<categoryId>`
- **Response (Success - 200)**:
  ```json
  [
    {
      "id": "<jobPostId>",
      "title": "Software Engineer",
      "description": "We are looking for a skilled engineer...",
      "location": "Remote",
      "salary": 50000,
      "status": "Active",
      "pending_review": false,
      "category_id": "<categoryId>",
      "category": {
        "id": "<categoryId>",
        "name": "Engineering",
        "created_at": "2025-05-22T10:00:00.000Z",
        "updated_at": "2025-05-22T10:00:00.000Z"
      },
      "job_type": "Full-time",
      "employer_id": "<employerId>",
      "employer": {
        "user_id": "<employerId>",
        "company_name": "Tech Corp",
        "company_info": "A tech company",
        "referral_link": null,
        "timezone": "UTC",
        "currency": "USD",
        "average_rating": 0,
        "created_at": "2025-05-22T10:00:00.000Z",
        "updated_at": "2025-05-22T10:00:00.000Z"
      },
      "applicationLimit": 100,
      "views": 0,
      "required_skills": ["JavaScript", "TypeScript"],
      "created_at": "2025-05-22T10:00:00.000Z",
      "updated_at": "2025-05-22T10:00:00.000Z"
    }
  ]

### 20. Create Review
- **Endpoint**: `POST /api/reviews`
- **Description**: Creates a review for a user (employer or jobseeker) related to a specific job application.
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
- **Description**: Retrieves all reviews for a specific user (employer or jobseeker).
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

### 22. Get All Users (Admin)
- **Endpoint**: `GET /api/admin/users`
- **Description**: Retrieves all users (admin only) with optional filters.
- **Headers**: `Authorization: Bearer <token>`
- **Query Parameters**:
  - `username` (string, optional): Filter by username (partial match, case-insensitive).
  - `email` (string, optional): Filter by email (partial match, case-insensitive).
  - `createdAfter` (string, optional): Filter users created after this date (format: `YYYY-MM-DD`).
- **Example Request**: `/api/admin/users?username=john&email=example.com&createdAfter=2025-05-01`

- **Response (Success - 200)**: 
  ```json
  [
    {
      "id": "<userId>",
      "email": "john@example.com",
      "username": "john_doe",
      "role": "jobseeker",
      "provider": null,
      "created_at": "2025-05-15T05:13:00.000Z",
      "updated_at": "2025-05-15T05:13:00.000Z"
    }
  ]

- **Response (Error - 401, if token is invalid or missing)**: 
  ```json
  {
    "statusCode": 401,
    "message": "Invalid token",
    "error": "Unauthorized"
  }

- **Response (Error - 401, if user is not an admin)**: 
  ```json
  {
    "statusCode": 401,
    "message": "Only admins can access this resource",
    "error": "Unauthorized"
  }

### 23. Get User by ID (Admin)
- **Endpoint**: `GET /api/admin/users/:id`
- **Description**: Retrieves a specific user by ID (admin only).
- **Headers**: `Authorization: Bearer <token>`
- **Request Parameters**: `id`: The ID of the user.
- **Response (Success - 200)**: 
  ```json
  {
    "id": "<userId>",
    "email": "test@example.com",
    "username": "test",
    "role": "employer",
    "provider": null,
    "created_at": "2025-05-13T18:00:00.000Z",
    "updated_at": "2025-05-13T18:00:00.000Z"
  }

- **Response (Error - 404, if user not found)**: 
  ```json
  {
    "statusCode": 404,
    "message": "User not found",
    "error": "Not Found"
  }

### 24. Update User (Admin)
- **Endpoint**: `PUT /api/admin/users/:id`
- **Description**: Updates a specific user (admin only).
- **Headers**: `Authorization: Bearer <token>`
- **Request Parameters**: `id`: The ID of the user.
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
    "provider": null,
    "created_at": "2025-05-13T18:00:00.000Z",
    "updated_at": "2025-05-13T18:30:00.000Z"
  }

- **Response (Error - 404, if user not found)**: 
  ```json
  {
    "statusCode": 404,
    "message": "User not found",
    "error": "Not Found"
  }

### 25. Delete User (Admin)
- **Endpoint**: `DELETE /api/admin/users/:id`
- **Description**: Deletes a specific user (admin only).
- **Headers**: `Authorization: Bearer <token>`
- **Request Parameters**: `id`: The ID of the user.
- **Response (Success - 200)**: 
  ```json
  {
    "message": "User deleted successfully"
  }

- **Response (Error - 404, if user not found)**: 
  ```json
  {
    "statusCode": 404,
    "message": "User not found",
    "error": "Not Found"
  }

### 26. Reset User Password (Admin)
- **Endpoint**: `POST /api/admin/users/:id/reset-password`
- **Description**: Resets the password for a specific user (admin only).
- **Headers**: `Authorization: Bearer <token>`
- **Request Parameters**: `id`: The ID of the user.
- **Request Body**: 
  ```json
  {
    "newPassword": "newpassword123"
  }

- **Response (Success - 200)**:
  ```json
  {
    "message": "Password reset successful"
  }

- **Response (Error - 404, if user not found)**:
  ```json
  {
    "statusCode": 404,
    "message": "User not found",
    "error": "Not Found"
  }

- **Response (Error - 401, if token is invalid or user is not an admin)**:
  ```json
  {
    "statusCode": 401,
    "message": "Invalid token",
    "error": "Unauthorized"
  }

### 27. Get All Job Posts (Admin)
- **Endpoint**: `GET /api/admin/job-posts`
- **Description**: Retrieves all job posts (admin only) with optional filters.
- **Headers**: `Authorization: Bearer <token>`
- **Query Parameters**: 
  - `status` (string, optional): Filter by status ("Active", "Draft", "Closed").
  - `pendingReview` (string, optional): Filter by pending review status ("true" or "false").
- **Example Request**: `/api/admin/job-posts?status=Active&pendingReview=true`
- **Response (Success - 200)**: 
  ```json
  [
    {
      "id": "<jobPostId>",
      "title": "Software Engineer",
      "description": "We are looking for a skilled software engineer...",
      "location": "Remote",
      "salary": 50000,
      "status": "Active",
      "pending_review": true,
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
      "applicationLimit": 100,
      "created_at": "2025-05-15T06:12:00.000Z",
      "updated_at": "2025-05-15T06:12:00.000Z"
    }
  ]

- **Response (Error - 401, if token is invalid or user is not an admin)**:
  ```json
  {
    "statusCode": 401,
    "message": "Invalid token",
    "error": "Unauthorized"
  }

### 28. Update Job Post (Admin)
- **Endpoint**: `PUT /api/admin/job-posts/:id`
- **Description**: Updates a specific job post (admin only).
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
    "job_type": "Full-time",
    "category_id": "<categoryId>",
    "applicationLimit": 50
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
    "category_id": "<categoryId>",
    "job_type": "Full-time",
    "employer_id": "<userId>",
    "applicationLimit": 50,
    "created_at": "2025-05-13T18:00:00.000Z",
    "updated_at": "2025-05-13T18:30:00.000Z"
  }

### 29. Delete Job Post (Admin)
- **Endpoint**: `DELETE /api/admin/job-posts/:id`
- **Description**: Deletes a specific job post (admin only).
- **Headers**: `Authorization: Bearer <token>`
- **Request Parameters**: `id`: The ID of the job post.
- **Response (Success - 200)**: 
  ```json
  {
    "message": "Job post deleted successfully"
  }

- **Response (Error - 404, if job post not found)**: 
  ```json
  {
    "statusCode": 404,
    "message": "Job post not found",
    "error": "Not Found"
  }

### 30. Approve Job Post (Admin)
- **Endpoint**: `POST /api/admin/job-posts/:id/approve`
- **Description**: Approves a job post by setting pending_review to false (admin only).
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
    "created_at": "2025-05-15T06:12:00.000Z",
    "updated_at": "2025-05-15T06:12:00.000Z"
  }

- **Response (Error - 404, if job post not found)**: 
  ```json  
  {
    "statusCode": 404,
    "message": "Job post not found",
    "error": "Not Found"
  }

### 31. Flag Job Post for Review (Admin)
- **Endpoint**: `POST /api/admin/job-posts/:id/flag`
- **Description**: Flags a job post for review by setting pending_review to true (admin only).
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
    "pending_review": true,
    "category_id": "<categoryId>",
    "job_type": "Full-time",
    "employer_id": "<employerId>",
    "applicationLimit": 100,
    "created_at": "2025-05-15T06:12:00.000Z",
    "updated_at": "2025-05-15T06:12:00.000Z"
  }

- **Response (Error - 404, if job post not found)**: 
  ```json  
  {
    "statusCode": 404,
    "message": "Job post not found",
    "error": "Not Found"
  }

### 32. Get All Reviews (Admin)
- **Endpoint**: `GET /api/admin/reviews`
- **Description**: Retrieves all reviews (admin only).
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
    "created_at": "2025-05-13T18:00:00.000Z",
    "updated_at": "2025-05-13T18:00:00.000Z"
  }
  ]

### 33. Delete Review (Admin)
- **Endpoint**: `DELETE /api/admin/reviews/:id`
- **Description**: Deletes a specific review (admin only).
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

### 34. Get Analytics (Admin)
- **Endpoint**: `GET /api/admin/analytics`
- **Description**: Retrieves analytics data (admin only).
- **Headers**: `Authorization: Bearer <token>`
- **Response (Success - 200)**: 
  ```json
  {
    "totalUsers": 50,
    "employers": 20,
    "jobSeekers": 30,
    "totalJobPosts": 40,
    "activeJobPosts": 25,
    "totalApplications": 100,
    "totalReviews": 15
  }

### 35. Get Registration Stats (Admin)
- **Endpoint**: `GET /api/admin/analytics/registrations`
- **Description**: Retrieves registration statistics over a specified period (admin only).
- **Headers**: `Authorization: Bearer <token>`
- **Query Parameters**: 
  - `startDate` (string, required): Start date in format `YYYY-MM-DD`.
  - `endDate` (string, required): End date in format `YYYY-MM-DD`.
  - `interval` (string, required): Interval for grouping ("day", "week", "month").
- **Example Request**: `/api/admin/analytics/registrations?startDate=2025-05-01&endDate=2025-05-15&interval=day`
- **Response (Success - 200)**: 
  ```json
    [
      {
        "period": "2025-05-01T00:00:00.000Z",
        "count": 5
      },
      {
        "period": "2025-05-02T00:00:00.000Z",
        "count": 3
      }
    ]

- **Response (Error - 400, if invalid dates)**:  
  ```json
  {
    "statusCode": 400,
    "message": "Invalid date format",
    "error": "Bad Request"
  }

### 36. Get Geographic Distribution (Admin)
- **Endpoint**: `GET /api/admin/analytics/geographic-distribution`
- **Description**: Retrieves the geographic distribution of users (admin only).
- **Headers**: `Authorization: Bearer <token>`
- **Response (Success - 200)**: 
  ```json
  [
    {
      "country": "US",
      "count": 50,
      "percentage": "50.00"
    },
    {
      "country": "CA",
      "count": 30,
      "percentage": "30.00"
    },
    {
      "country": "UK",
      "count": 20,
      "percentage": "20.00"
    }
  ]

- **Response (Error - 400, if invalid dates)**:  
  ```json
  {
    "statusCode": 400,
    "message": "Invalid date format",
    "error": "Bad Request"
  }

### 35. Set Application Limit for Job Post (Admin)
- **Endpoint**: `POST /api/admin/job-posts/:id/set-application-limit`
- **Description**: Sets the application limit for a specific job post (admin only). Employers cannot set limits.
- **Headers**: `Authorization: Bearer <token>`
- **Request Parameters**: `id`: The ID of the job post.
- **Request Body**: `id`: The ID of the job post.
  ```json
  {
    "limit": 50
  }
- **Response (Success - 200)**: 
  ```json
  {
    "message": "Application limit updated successfully",
    "limit": 50
  }

- **Response (Error - 400, if limit exceeds global limit)**: 
  ```json
  {
    "statusCode": 400,
    "message": "Application limit cannot exceed global limit of 1000",
    "error": "Bad Request"
  }

- **Response (Error - 404, if job post not found)**: 
  ```json
  {
    "statusCode": 404,
    "message": "Job post not found",
    "error": "Not Found"
  }

### 36. Submit Feedback
- **Endpoint**: `POST /api/feedback`
- **Description**: Submits feedback from a jobseeker or employer.
- **Headers**: `Authorization: Bearer <token>`
- **Request Body**:
  ```json
  {
    "message": "This is my feedback about the platform."
  }

- **Response (Success - 200)**: 
  ```json
  {
    "id": "<feedbackId>",
    "user_id": "<userId>",
    "message": "This is my feedback about the platform.",
    "role": "jobseeker",
    "created_at": "2025-05-15T05:13:00.000Z",
    "updated_at": "2025-05-15T05:13:00.000Z"
  }

- **Response (Error - 401, if user is not a jobseeker or employer)**: 
  ```json
  {
    "statusCode": 401,
    "message": "Only jobseekers and employers can submit feedback",
    "error": "Unauthorized"
  }

### 37. Get Feedback (Admin)
- **Endpoint**: `GET /api/feedback`
- **Description**: Retrieves all feedback submissions (admin only).
- **Headers**: `Authorization: Bearer <token>`
- **Response (Success - 200)**: 
  ```json
  [
  {
    "id": "<feedbackId>",
    "user_id": "<userId>",
    "message": "This is my feedback about the platform.",
    "role": "jobseeker",
    "user": {
      "id": "<userId>",
      "email": "jobseeker100@example.com",
      "username": "john_doe100",
      "role": "jobseeker"
    },
    "created_at": "2025-05-15T05:13:00.000Z",
    "updated_at": "2025-05-15T05:13:00.000Z"
  }
  ]

- **Response (Error - 401, if user is not an admin)**:   
  ```json
  {
  "statusCode": 401,
  "message": "Only admins can view feedback",
  "error": "Unauthorized"
  }

### 38. Add Blocked Country (Admin)
- **Endpoint**: `POST /api/admin/blocked-countries`
- **Description**: Adds a country to the blocked list (admin only).
- **Headers**: `Authorization: Bearer <token>`
- **Request Body**: 
  ```json
  {
    "countryCode": "IN"
  }
- **Response (Success - 200)**:
  ```json
  {
    "id": "<blockedCountryId>",
    "country_code": "IN",
    "created_at": "2025-05-15T06:12:00.000Z",
    "updated_at": "2025-05-15T06:12:00.000Z"
  }

- **Response (Error - 400, if country is already blocked)**:
  ```json
  {
    "statusCode": 400,
    "message": "Country is already blocked",
    "error": "Bad Request"
  }

### 39. Remove Blocked Country (Admin)
- **Endpoint**: `DELETE /api/admin/blocked-countries/:countryCode`
- **Description**: Removes a country from the blocked list (admin only).
- **Headers**: `Authorization: Bearer <token>`
- **Request Parameters**: `countryCode`: The country code to remove (e.g., "IN").
- **Response (Success - 200)**: 
  ```json
  {
    "message": "Country removed from blocked list"
  }
- **Response (Error - 400, if country is not blocked)**:
  ```json
  {
    "statusCode": 400,
    "message": "Country is not blocked",
    "error": "Bad Request"
  }

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
      "employer_id": "<employerId>",
      "username": "jane_smith113",
      "job_count": 5
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

### 45. Verify Identity (Admin)
- **Endpoint**: `POST /api/admin/profile/:id/verify-identity`
- **Description**: Verifies or rejects the identity of a user by setting the identity_verified field (admin only).
- **Headers**: `Authorization: Bearer <token>`
- **Request Parameters**: `id`: The ID of the user.
- **Request Body**:
  ```json
  {
    "verify": true
  }

- **Response (Success - 200)**: Returns the updated profile (same format as GET /api/profile)

- **Response (Error - 401, if token is invalid or user is not an admin)**:
  ```json
  {
    "statusCode": 401,
    "message": "Unauthorized",
    "error": "Unauthorized"
  }

- **Response (Error - 401, if verify parameter is invalid)**:
  ```json
  {
    "statusCode": 401,
    "message": "Verify parameter must be a boolean",
    "error": "Unauthorized"
  }

- **Response (Error - 404, if user not found)**:
  ```json
  {
    "statusCode": 404,
    "message": "User not found",
    "error": "Not Found"
  }

- **Response (Error - 404, if no document uploaded)**:
  ```json
  {
    "statusCode": 404,
    "message": "No identity document uploaded",
    "error": "Not Found"
  } 

### 46. Set Global Application Limit (Admin)
- **Endpoint**: `POST /api/admin/settings/application-limit`
- **Description**: Sets the global application limit for all job posts (admin only).
- **Headers**: `Authorization: Bearer <token>`
- **Request Body**:
  ```json
  {
    "limit": 1000
  }

- **Response (Success - 200)**:
  ```json
  {
    "message": "Global application limit updated successfully",
    "limit": 1000
  } 

- **Response (Error - 400, if limit is invalid)**:
  ```json
  {
    "statusCode": 400,
    "message": "Global application limit must be a non-negative number",
    "error": "Bad Request"
  }

- **Response (Error - 401, if user is not an admin)**:
  ```json
  {
    "statusCode": 401,
    "message": "Unauthorized",
    "error": "Unauthorized"
  }

### 47. Get Global Application Limit (Admin)
- **Endpoint**: `GET /api/admin/settings/application-limit`
- **Description**: Retrieves the global application limit (admin only).
- **Headers**: `Authorization: Bearer <token>`
- **Response (Success - 200)**:
  ```json
  {
    "globalApplicationLimit": 1000
  }

- **Response (Error - 401, if user is not an admin)**:
  ```json
  {
    "statusCode": 401,
    "message": "Unauthorized",
    "error": "Unauthorized"
  }

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

### 52. Block User (Admin)
- **Endpoint**: `POST /api/admin/users/:id/block`
- **Description**: Blocks a specific user (admin only).
- **Headers**: `Authorization: Bearer <token>`
- **Request Parameters**: `id`: The ID of the user.
- **Response (Success - 200)**:
  ```json
  {
    "message": "User blocked successfully"
  }

- **Response (Error - 404, if user not found)**:
  ```json
  {
    "statusCode": 404,
    "message": "User not found",
    "error": "Not Found"
  }

- **Response (Error - 400, if user already blocked)**:
  ```json
  {
    "statusCode": 400,
    "message": "User is already blocked",
    "error": "Bad Request"
  }

- **Response (Error - 401, if token is invalid or user is not an admin)**:
  ```json
  {
    "statusCode": 401,
    "message": "Invalid token",
    "error": "Unauthorized"
  }

### 53. Unblock User (Admin)
- **Endpoint**: `POST /api/admin/users/:id/unblock`
- **Description**: Unblocks a specific user (admin only).
- **Headers**: `Authorization: Bearer <token>`
- **Request Parameters**: `id`: The ID of the user.  
- **Response (Success - 200)**:
  ```json
  {
    "message": "User unblocked successfully"
  }

- **Response (Error - 404, if user not found)**:
  ```json
  {
    "statusCode": 404,
    "message": "User not found",
    "error": "Not Found"
  }

- **Response (Error - 400, if user already active)**:
  ```json
  {
    "statusCode": 400,
    "message": "User is already active",
    "error": "Bad Request"
  }

- **Response (Error - 401, if token is invalid or user is not an admin)**:
  ```json
  {
    "statusCode": 401,
    "message": "Invalid token",
    "error": "Unauthorized"
  }

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

### 55. Get Top Jobseekers by Profile Views (Admin)
- **Endpoint**: `GET /api/admin/leaderboards/top-jobseekers-by-views`
- **Description**: Retrieves the top jobseekers by profile views (admin only).
- **Headers**: `Authorization: Bearer <token>`
- **Query Parameters**: `limit` (number, optional): Number of jobseekers to return (default: 10).
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

- **Response (Error - 400, if limit is invalid)**:
  ```json
  {
    "statusCode": 400,
    "message": "Limit must be a positive integer",
    "error": "Bad Request"
  }

- **Response (Error - 401, if token is invalid or user is not an admin)**:
  ```json
  {
    "statusCode": 401,
    "message": "Invalid token",
    "error": "Unauthorized"
  }

### 56. Export Users to CSV (Admin)
- **Endpoint**: `GET /api/admin/users/export-csv`
- **Description**: Exports all users to a CSV file (admin only).
- **Headers**: `Authorization: Bearer <token>`
- **Response (Success - 200)**:
  - Content-Type: `text/csv`
  - Content-Disposition: `attachment; filename="users.csv"`
  - Example file content: User ID,Email,Username,Role,Status,Created At,Updated At
  <userid1>,<a href="mailto:user1@example.com">user1@example.com</a>,user1,jobseeker,active,2025-05-22T10:00:00.000Z,2025-05-22T10:00:00.000Z</userid1>
  <userid2>,<a href="mailto:user2@example.com">user2@example.com</a>,user2,employer,blocked,2025-05-22T11:00:00.000Z,2025-05-22T11:00:00.000Z</userid2>

- **Response (Error - 401, if token is invalid or user is not an admin)**:  
    ```json
  {
    "statusCode": 401,
    "message": "Invalid token",
    "error": "Unauthorized"
  }

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

### 58. Get Growth Trends (Admin)
- **Endpoint**: `GET /api/admin/analytics/growth-trends`
- **Description**: Retrieves growth trends for registrations and job posts over the last 7 or 30 days, grouped by day (admin only).
- **Headers**: `Authorization: Bearer <token>`
- **Query Parameters**: `period` (string, optional): Time period ("7d" or "30d", default: "7d").
- **Response (Success - 200)**:
  ```json
  {
    "registrations": [
      {
        "period": "2025-05-20T00:00:00.000Z",
        "count": 5
      },
      {
        "period": "2025-05-21T00:00:00.000Z",
        "count": 3
      }
    ],
    "jobPosts": [
      {
        "period": "2025-05-20T00:00:00.000Z",
        "count": 2
      },
      {
        "period": "2025-05-21T00:00:00.000Z",
        "count": 4
      }
    ]
  }

- **Response (Error - 401, if token is invalid or user is not an admin)**:  
    ```json
  {
    "statusCode": 401,
    "message": "Invalid token",
    "error": "Unauthorized"
  }  

### 59. Get Recent Registrations (Admin)
- **Endpoint**: `GET /api/admin/analytics/recent-registrations`
- **Description**: Retrieves the last 5 registrations of jobseekers and employers (admin only).
- **Headers**: `Authorization: Bearer <token>`
- **Query Parameters**: `limit` (number, optional): Number of results per role (default: 5).
- **Response (Success - 200)**:
  ```json
  {
    "jobseekers": [
      {
        "id": "<userId>",
        "email": "jobseeker@example.com",
        "username": "john_doe",
        "role": "jobseeker",
        "created_at": "2025-05-27T06:00:00.000Z"
      }
    ],
    "employers": [
      {
        "id": "<userId>",
        "email": "employer@example.com",
        "username": "jane_smith",
        "role": "employer",
        "created_at": "2025-05-27T06:00:00.000Z"
      }
    ]
  }

- **Response (Error - 401, if token is invalid or user is not an admin)**:  
    ```json
  {
    "statusCode": 401,
    "message": "Invalid token",
    "error": "Unauthorized"
  }    

### 60. Get Job Posts with Applications (Admin)
- **Endpoint**: `GET /api/admin/job-posts/applications`
- **Description**: Retrieves all job posts with their application counts (admin only).
- **Headers**: `Authorization: Bearer <token>`
- **Query Parameters**: `limit` (number, optional): Number of results per role (default: 5).
- **Response (Success - 200)**:
  ```json
  [
    {
      "id": "<jobPostId>",
      "title": "Software Engineer",
      "status": "Active",
      "applicationCount": 10,
      "created_at": "2025-05-27T06:00:00.000Z"
    }
  ]

- **Response (Error - 401, if token is invalid or user is not an admin)**:  
    ```json
  {
    "statusCode": 401,
    "message": "Invalid token",
    "error": "Unauthorized"
  }

### 61. Get Online Users (Admin)
- **Endpoint**: `GET /api/admin/analytics/online-users`
- **Description**: Retrieves the count of online jobseekers and employers (admin only).
- **Headers**: `Authorization: Bearer <token>`
- **Response (Success - 200)**:
  ```json
  {
    "jobseekers": 15,
    "employers": 5
  }

- **Response (Error - 401, if token is invalid or user is not an admin)**:  
    ```json
  {
    "statusCode": 401,
    "message": "Invalid token",
    "error": "Unauthorized"
  }

### 62. Get User Online Status
- **Endpoint**: `GET /api/users/:id/online`
- **Description**: Checks if a specific user is online.
- **Headers**: `Authorization: Bearer <token>`
- **Request Parameters**: `id`: The ID of the user.
- **Response (Success - 200)**:
  ```json
  {
    "userId": "<userId>",
    "isOnline": true
  }

- **Response (Error - 401, if token is invalid)**:  
    ```json
  {
    "statusCode": 401,
    "message": "Invalid token",
    "error": "Unauthorized"
  }

- **Response (Error - 404, if user not found)**:  
    ```json
  {
    "statusCode": 404,
    "message": "User not found",
    "error": "Not Found"
  }