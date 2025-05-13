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
  "referral_link": "https://example.com/ref/test",
  "timezone": "Europe/Moscow",
  "currency": "USD"
  }
  //For jobseeker
  ```json
  {
  "tempToken": "<tempToken>",
  "role": "jobseeker",
  "skills": ["JavaScript", "TypeScript"],
  "experience": "2 years",
  "portfolio": "https://portfolio.com",
  "video_intro": "https://video.com",
  "timezone": "Europe/Moscow",
  "currency": "USD"
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

### 7. Get Profile
- **Endpoint**: `GET /api/profile`
- **Description**: Retrieves the authenticated user's profile based on their role.
- **Headers**: Authorization: Bearer <token>
- **Request Body:**: None
- **Response (Success - 200)**: 
  //For employer
  ```json
  {
  "role": "employer",
  "email": "test@example.com",
  "username": "test",
  "company_name": "Test Company",
  "company_info": "A great company",
  "referral_link": "https://example.com/ref/test",
  "timezone": "Europe/Moscow",
  "currency": "USD"
  }
  //For jobseeker
  ```json
  {
  "role": "jobseeker",
  "email": "test@example.com",
  "username": "test",
  "skills": ["JavaScript", "TypeScript"],
  "experience": "2 years",
  "portfolio": "https://portfolio.com",
  "video_intro": "https://video.com",
  "timezone": "Europe/Moscow",
  "currency": "USD" 
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


### 8. Update Profile
- **Endpoint**: `PUT /api/profile`
- **Description**: Updates the authenticated user's profile based on their role.
- **Headers**: Authorization: Bearer <token>
- **Request Body:**:
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

### 9. Create Job Post
- **Endpoint**: `POST /api/job-posts`
- **Description**: Creates a new job post for an authenticated employer.
- **Headers**: Authorization: Bearer <token>
- **Request Body:**:
  ```json
  {
    "title": "Software Engineer",
    "description": "We are looking for a skilled software engineer...",
    "location": "Remote",
    "salary": 50000,
    "status": "Active",
    "category_id": "<category_id>" // Optional
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
    "category_id": null,
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

### 10. Update Job Post
- **Endpoint**: `PUT /api/job-posts/:id`
- **Description**: Updates an existing job post for an authenticated employer.
- **Headers**: Authorization: Bearer <token>
- **Request Body:**:
  ```json
  {
  "title": "Senior Software Engineer",
  "description": "Updated description...",
  "location": "Remote",
  "salary": 60000,
  "status": "Closed",
  "category_id": "<category_id>" // Optional
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
  "category_id": null,
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

### 11. Get Job Post
- **Endpoint**: `GET /api/job-posts/:id`
- **Description**: Retrieves a specific job post by ID.
- **Request Parameters**: id: The ID of the job post.

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

### 12. Get Job Posts by Employer
- **Endpoint**: `GET /api/job-posts/my-posts`
- **Description**: Retrieves all job posts created by the authenticated employer.
- **Headers**: Authorization: Bearer <token>
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

### 13. Create Category
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

### 14. Get Categories
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

### 15. Apply to Job Post
- **Endpoint**: `POST /api/job-applications`
- **Description**: Allows a jobseeker to apply to a job post.
- **Headers**: Authorization: Bearer <token>
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

### 16. Get My Applications (Jobseeker)
- **Endpoint**: `GET /api/job-applications/my-applications`
- **Description**: Retrieves all applications submitted by the authenticated jobseeker.
- **Headers**: Authorization: Bearer <token>  
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
- **Headers**: Authorization: Bearer <token>    
- **Request Parameters**: id: The ID of the job post.
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

- **Response (Error - 401, if user is not an employer)**:   
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
- **Headers**: Authorization: Bearer <token>    
- **Request Parameters**: id: The ID of the job application
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