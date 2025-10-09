# WebSocket Chat API

- **Description**: The WebSocket Chat API enables real-time messaging between an employer and a jobseeker after a job application is accepted (status: Accepted). Only the employer and jobseeker associated with the job application can join the chat. Administrators can view chat histories for dispute resolution via a REST endpoint.
- **Base WebSocket URL (Development)**: `ws://localhost:3000`
- **Base WebSocket URL (Production)**: `wss://jobforge.net`
- **Base REST URL**: `${BASE_URL}/api` (e.g., `https://jobforge.net/api` in production)
- **Authentication**: Requires a JWT token passed in the `Authorization` header for both WebSocket and REST requests.

# WebSocket Connection
  # Establishing a Connection
  - **Protocol**: Use `ws://` for development and `wss://` for production.
  - **Headers**: `Authorization: Bearer <token>` (Required, JWT token obtained from `/api/auth/login` or equivalent).
  - **Library**: Recommended to use `socket.io-client` for frontend integration.
  - **Reconnection**: The client should handle automatic reconnection with a delay (e.g., 3 seconds) if the connection is lost. Socket.IO client supports this by default with `reconnection: true`.

# WebSocket Events:
- **joinChat**: 
- **Description**: Joins a chat room for a specific job application. Only available to the employer and jobseeker of an accepted job application. Marks all unread messages for the user as read upon joining.
- **Payload**:
  ```json
  {
    "jobApplicationId": "<jobApplicationId>"
  }
  
- **Response**: Emits `chatHistory` event with the chat history for the specified job application.
- **Error**:
  - If the user is not authorized or lacks access:
  ```json
  {
    "statusCode": 401,
    "message": "No access to this chat",
    "error": "Unauthorized"
  }
  - If the job application is not found or not accepted:
  ```json
  {
    "statusCode": 404,
    "message": "Job application not found",
    "error": "Not Found"
  }

- **chatHistory**: 
- **Description**: Emitted automatically after a successful `joinChat`. Contains the history of messages for the specified job application, sorted by `created_at` in ascending order.
  - **Payload**:
    ```json
  [
    {
      "id": "<messageId>",
      "job_application_id": "<jobApplicationId>",
      "sender_id": "<userId>",
      "recipient_id": "<userId>",
      "content": "Hello, let's discuss the project!",
      "created_at": "2025-06-16T05:47:00.000Z",
      "is_read": false
    }
  ]
- **Notes**: 
  - `is_read`: Indicates whether the message has been read by the recipient. Display a "read" indicator (e.g., checkmark) if `is_read: true`.
  - Store this history in the frontend state to render the chat UI.

- **sendMessage**: 
- **Description**: Sends a message to the chat room associated with the job application.
  - **Payload**:
    ```json
  {
    "jobApplicationId": "<jobApplicationId>",
    "content": "Hello, let's discuss the project!"
  }
- **Response**: Broadcasts a `newMessage` event to all clients in the chat room (including the sender).
- **Error**:
  - If the user is not authorized or lacks access:
  ```json
  {
    "statusCode": 401,
    "message": "No access to this chat",
    "error": "Unauthorized"
  }
  - If the job application is not found:
  ```json
  {
    "statusCode": 404,
    "message": "Job application not found",
    "error": "Not Found"
  }

- **newMessage**: 
- **Description**: Broadcasted to all clients in the chat room when a new message is sent. Used to update the chat UI in real-time.
  - **Payload**:
    ```json
  {
    "id": "<messageId>",
    "job_application_id": "<jobApplicationId>",
    "sender_id": "<userId>",
    "recipient_id": "<userId>",
    "content": "Hello, let's discuss the project!",
    "created_at": "2025-06-16T05:47:00.000Z",
    "is_read": false
  }
- **Notes**: 
  - Append this message to the frontend state to update the chat UI.
  - Optionally, trigger a notification (e.g., toast or sound) if the recipient is not currently viewing the chat.

- **markMessagesAsRead**: 
- **Description**: Marks all unread messages for the user in the specified job application as read.
  - **Payload**:
    ```json
  {
    "jobApplicationId": "<jobApplicationId>"
  }
- **Response**: Emits `messagesRead` event with the updated messages.
  - **Payload(messagesRead)**:
    ```json
  [
    {
      "id": "<messageId>",
      "job_application_id": "<jobApplicationId>",
      "sender_id": "<userId>",
      "recipient_id": "<userId>",
      "content": "Hello, let's discuss the project!",
      "created_at": "2025-06-16T05:47:00.000Z",
      "is_read": true
    }
  ]
- **Error**:
  - If the user is not authorized or lacks access:
      ```json
      {
        "statusCode": 401,
        "message": "No access to this chat",
        "error": "Unauthorized"
      }
  - If the job application is not found:
      ```json
      {
        "statusCode": 404,
        "message": "Job application not found",
        "error": "Not Found"
      }

- **typing**: 
- **Description**: Notifies other users in the chat room when a user is typing or stops typing.
  - **Payload**:
    ```json
  {
    "jobApplicationId": "<jobApplicationId>",
    "isTyping": true // or false
  }
- **Response**: Broadcasts a `typing` event to other clients in the chat room (excluding the sender).
  - **Payload(typing)**:
    ```json
  {
    "userId": "<userId>",
    "isTyping": true // or false
  }
- **Notes**: 
  - Display "Typing..." in the chat UI when `isTyping: true` is received
  - Remove the "Typing..." indicator when `isTyping: false` is received.
- **Error**:
  - If the user is not authorized or lacks access:
      ```json
      {
        "statusCode": 401,
        "message": "No access to this chat",
        "error": "Unauthorized"
      }

- **broadcastToSelected**:
  - **Emit from client (employer):**:
    ```json
  {
    "jobPostId": "<jobPostId>",
    "applicationIds": ["<applicationId1>", "<applicationId2>"],
    "content": "Hello! Next round is tomorrow 10:00 UTC."
  }
- **Ack/response:**:
    ```json
  { "sent": 2 }