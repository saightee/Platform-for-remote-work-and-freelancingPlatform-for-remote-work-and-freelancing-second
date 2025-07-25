import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Copyright from '../components/Copyright';
import { useRole } from '../context/RoleContext';
import { getMyApplications, getMyJobPosts, getApplicationsForJobPost, getChatHistory, createReview } from '../services/api';
import { JobApplication, JobPost, JobApplicationDetails } from '@types';
import { format } from 'date-fns';
import Loader from '../components/Loader';


interface Message {
  id: string;
  job_application_id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  created_at: string;
  is_read: boolean;
}

const Messages: React.FC = () => {
  const { profile, currentRole, socket, socketStatus } = useRole();
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [jobPosts, setJobPosts] = useState<JobPost[]>([]);
  const [jobPostApplications, setJobPostApplications] = useState<{ [jobPostId: string]: JobApplicationDetails[] }>({});
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [messages, setMessages] = useState<{ [jobApplicationId: string]: Message[] }>({});
  const [newMessage, setNewMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [unreadCounts, setUnreadCounts] = useState<{ [jobApplicationId: string]: number }>({});
  const [isTyping, setIsTyping] = useState<{ [jobApplicationId: string]: boolean }>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<{ [jobApplicationId: string]: number }>({});
  const hasJoinedChats = useRef(false); // To prevent multiple joins
  const joinQueue = useRef<string[]>([]); // Добавлено для queue joins
  const [reviewForm, setReviewForm] = useState<{ applicationId: string; rating: number; comment: string } | null>(null); // Добавлено
  const [formError, setFormError] = useState<string | null>(null); // Добавлено
  const currentMessages = useMemo(() => selectedChat ? messages[selectedChat] : [], [selectedChat, messages]);
const currentTyping = useMemo(() => selectedChat ? isTyping[selectedChat] : false, [selectedChat, isTyping]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        if (currentRole === 'jobseeker') {
          const apps = await getMyApplications();
          console.log('Fetched applications for jobseeker:', apps); // Отладочный лог
          setApplications(apps.filter((app) => app.status === 'Accepted'));
        } else if (currentRole === 'employer') {
          const posts = await getMyJobPosts();
          console.log('Fetched job posts for employer:', posts); // Отладочный лог
          setJobPosts(posts);
          const appsArrays = await Promise.all(
            posts.map(post => getApplicationsForJobPost(post.id))
          );
          const appsMap: { [jobPostId: string]: JobApplicationDetails[] } = {};
          posts.forEach((post, index) => {
            appsMap[post.id] = appsArrays[index].filter((app) => app.status === 'Accepted');
            console.log(`Applications for job post ${post.id}:`, appsMap[post.id]); // Отладочный лог
          });
          setJobPostApplications(appsMap);
        }
      } catch (error) {
        console.error('Error fetching applications:', error);
        setError('Failed to load applications.');
      } finally {
        setIsLoading(false);
      }
    };

    if (profile && currentRole && ['jobseeker', 'employer'].includes(currentRole) && socket) {
      fetchData();
    }
  }, [profile, currentRole, socket]);

  useEffect(() => {
  if (!socket || !profile || !currentRole || !['jobseeker', 'employer'].includes(currentRole)) {
    setUnreadCounts({});
    setIsTyping({});
    return;
  }

  const joinChats = () => {
    if (hasJoinedChats.current) return;
    hasJoinedChats.current = true;
    
    let chats: { id: string }[] = [];
    if (currentRole === 'jobseeker') {
      chats = applications.map(app => ({ id: app.id }));
    } else if (currentRole === 'employer') {
      chats = Object.values(jobPostApplications).flat().map(app => ({ id: app.applicationId }));
    }

    chats.forEach(chat => {
      if (socket.connected) {
        socket.emit('joinChat', { jobApplicationId: chat.id });
      } else {
        joinQueue.current.push(chat.id);
      }
    });
  };

  socket.on('chatHistory', (history: Message[]) => {
    if (history.length > 0) {
      const jobApplicationId = history[0].job_application_id;
      setMessages((prev) => ({
        ...prev,
        [jobApplicationId]: history.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
      }));
      const unread = history.filter((msg) => msg.recipient_id === profile.id && !msg.is_read).length;
      setUnreadCounts((prevCounts) => ({
        ...prevCounts,
        [jobApplicationId]: selectedChat === jobApplicationId ? 0 : unread,
      }));
    }
  });

socket.on('newMessage', (message: Message) => {
  setMessages((prev) => ({
    ...prev,
    [message.job_application_id]: [...(prev[message.job_application_id] || []), message],
  }));
  if (message.recipient_id === profile.id && !message.is_read) {
    if (selectedChat && selectedChat === message.job_application_id) {
      socket.emit('markMessagesAsRead', { jobApplicationId: message.job_application_id });
    } else {
      setUnreadCounts((prevCounts) => ({
        ...prevCounts,
        [message.job_application_id]: (prevCounts[message.job_application_id] || 0) + 1,
      }));
    }
  }
});

  socket.on('typing', (data: { userId: string; jobApplicationId: string; isTyping: boolean }) => {
    if (data.userId !== profile.id) {
      setIsTyping((prev) => ({ ...prev, [data.jobApplicationId]: data.isTyping }));
    }
  });

socket.on('messagesRead', (updatedMessages: { data: Message[] }) => { // Изменено тип
  if (updatedMessages.data.length > 0) {
    const jobId = updatedMessages.data[0].job_application_id;
    setMessages((prev) => ({
      ...prev,
      [jobId]: updatedMessages.data.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
    }));
    setUnreadCounts((prev) => ({ ...prev, [jobId]: 0 }));
  }
});

  socket.on('chatInitialized', async (data: { jobApplicationId: string }) => {
    console.log('Chat initialized for application:', data.jobApplicationId);
    if (socket.connected) {
      socket.emit('joinChat', { jobApplicationId: data.jobApplicationId });
    } else {
      joinQueue.current.push(data.jobApplicationId);
    }
    try {
      if (currentRole === 'jobseeker') {
        const apps = await getMyApplications();
        setApplications(apps.filter(app => app.status === 'Accepted'));
      } else if (currentRole === 'employer') {
        const posts = await getMyJobPosts();
        const appsArrays = await Promise.all(
          posts.map(post => getApplicationsForJobPost(post.id))
        );
        const appsMap: { [jobPostId: string]: JobApplicationDetails[] } = {};
        posts.forEach((post, index) => {
          appsMap[post.id] = appsArrays[index].filter(app => app.status === 'Accepted');
        });
        setJobPostApplications(appsMap);
      }
    } catch (err) {
      console.error('Error refreshing applications after chat initialization:', err);
    }
  });

  socket.on('connect_error', (err) => {
    console.error('WebSocket connection error in Messages:', err.message);
    setError('Failed to connect to chat server. Retrying...');
    hasJoinedChats.current = false;
  });

  socket.on('connect', () => {
    setError(null); // Clear error
    joinChats(); // Rejoin on connect
    joinQueue.current.forEach(id => {
      socket.emit('joinChat', { jobApplicationId: id });
      if (selectedChat === id) {
        socket.emit('markMessagesAsRead', { jobApplicationId: id });
      }
    });
    joinQueue.current = []; // Clear queue
  });

  joinChats();

  return () => {
    socket.off('chatHistory');
    socket.off('newMessage');
    socket.off('typing');
    socket.off('messagesRead');
    socket.off('chatInitialized');
    socket.off('connect_error');
    socket.off('connect');
    hasJoinedChats.current = false;
  };
}, [profile, currentRole, socket, applications, jobPostApplications, selectedChat]);

const scrollToBottom = useCallback(() => {
  if (messagesEndRef.current) {
    messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }
}, []);

useEffect(() => {
  scrollToBottom();
}, [selectedChat, currentMessages, currentTyping, scrollToBottom]);

const handleSendMessage = (e: React.FormEvent) => {
  e.preventDefault();
  if (!socket || !selectedChat || !newMessage.trim()) return;

  if (typingTimeoutRef.current[selectedChat]) {
    clearTimeout(typingTimeoutRef.current[selectedChat]);
  }
  socket.emit('typing', { jobApplicationId: selectedChat, isTyping: false });

  socket.emit('sendMessage', {
    jobApplicationId: selectedChat,
    content: newMessage.trim(),
  });

  setNewMessage('');
};

const handleSelectChat = (jobApplicationId: string) => {
  setSelectedChat(jobApplicationId);
  setUnreadCounts((prev) => ({
    ...prev,
    [jobApplicationId]: 0,
  }));
  if (socket && socket.connected) { // Changed to socket.connected
    socket.emit('joinChat', { jobApplicationId });
    socket.emit('markMessagesAsRead', { jobApplicationId });
  } else {
    joinQueue.current.push(jobApplicationId);
    setError('Connecting to chat server...');
  }
  // Fetch history if not loaded
  if (!messages[jobApplicationId] || messages[jobApplicationId].length === 0) {
    getChatHistory(jobApplicationId, {}).then((history) => { // Добавил {}
      setMessages((prev) => ({ ...prev, [jobApplicationId]: history.data.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) })); // history.data
    }).catch((err) => {
      setError('Failed to load chat history.');
    });
  }
};

const handleCreateReview = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!reviewForm) return;
  if (reviewForm.rating < 1 || reviewForm.rating > 5) {
    setFormError('Rating must be between 1 and 5.');
    return;
  }
  if (!reviewForm.comment.trim()) {
    setFormError('Comment cannot be empty.');
    return;
  }
  try {
    setFormError(null);
    await createReview({
      job_application_id: reviewForm.applicationId,
      rating: reviewForm.rating,
      comment: reviewForm.comment,
    });
    alert('Review submitted successfully!');
    setReviewForm(null);
  } catch (error: any) {
    setFormError(error.response?.data?.message || 'Failed to submit review.');
  }
};

const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
  if (!socket || !selectedChat) return;

  const content = e.target.value;
  setNewMessage(content);

  socket.emit('typing', { jobApplicationId: selectedChat, isTyping: true });

  if (typingTimeoutRef.current[selectedChat]) {
    clearTimeout(typingTimeoutRef.current[selectedChat]);
  }

  typingTimeoutRef.current[selectedChat] = setTimeout(() => {
    socket.emit('typing', { jobApplicationId: selectedChat, isTyping: false });
  }, 3000);
};

  const getChatPartner = (jobApplicationId: string) => {
    if (currentRole === 'jobseeker') {
      const app = applications.find((a) => a.id === jobApplicationId);
      console.log('Application for jobseeker:', app); // Отладочный лог
      if (app?.job_post?.employer_id) {
        return app.job_post.employer?.username || 'Unknown';
      }
      return 'Unknown';
    } else if (currentRole === 'employer') {
      const app = Object.values(jobPostApplications).flat().find(a => a.applicationId === jobApplicationId);
      return app?.username || 'Unknown';
    }
    return 'Unknown';
  };

const getChatList = () => {
  if (currentRole === 'jobseeker') {
    return applications.map((app) => ({
      id: app.id,
      title: app.job_post?.title || 'Unknown Job',
      partner: getChatPartner(app.id),
      unreadCount: unreadCounts[app.id] || 0,
    }));
  } else if (currentRole === 'employer') {
    return Object.values(jobPostApplications).flat().map(app => ({
      id: app.applicationId,
      title: jobPosts.find(post => post.id === app.job_post_id)?.title || 'Unknown Job',
      partner: app.username,
      unreadCount: unreadCounts[app.applicationId] || 0
    }));
  }
  return [];
};

  if (isLoading) return (
    <div>
      <Header />
      <div className="container">
        <h2>Messages</h2>
        <p>Loading chats...</p>
      </div>
    </div>
  );

  if (getChatList().length === 0 && !isLoading) return (
    <div>
      <Header />
      <div className="container">
        <h2>Messages</h2>
        <p>There are no available chats.</p>
      </div>
      <Footer />
      <Copyright />
    </div>
  );

  if (!profile || !['jobseeker', 'employer'].includes(currentRole || '')) {
    return (
      <div>
        <Header />
        <div className="container">
          <h2>Messages</h2>
          <p>This page is only available for jobseekers and employers.</p>
        </div>
        <Footer />
        <Copyright />
      </div>
    );
  }

  return (
    <div>
      <Header />
      <div className="container messages-container">
        <h2>Messages</h2>
        {error && <p className="error-message">{error}</p>}
        {socketStatus === 'reconnecting' && <p className="error-message">Reconnecting to chat server...</p>}
        <div className="messages-content">
          <div className="chat-list">
            <h3>Chats</h3>
            {getChatList().length > 0 ? (
<ul>
  {getChatList().map((chat) => (
    <li
      key={chat.id}
      className={`chat-item ${selectedChat === chat.id ? 'active' : ''}`}
      onClick={() => handleSelectChat(chat.id)}
    >
      <p>
        <strong>{chat.title}</strong>
      </p>
      <p>{chat.partner}</p>
      {chat.unreadCount > 0 && <span className="unread-count">{chat.unreadCount}</span>}
      {currentRole === 'employer' && ( 
        <button onClick={() => setReviewForm({ applicationId: chat.id, rating: 5, comment: '' })}>
          Leave Review
        </button>
      )}
    </li>
  ))}
</ul>
            ) : (
              <p>No active chats found.</p>
            )}
          </div>
          <div className="chat-window">
            {reviewForm && (
  <div className="modal">
    <div className="modal-content">
      <span className="close" onClick={() => setReviewForm(null)}>×</span>
      <form onSubmit={handleCreateReview}>
        {formError && <p className="error-message">{formError}</p>}
        <div className="form-group">
          <label>Rating:</label>
          <div className="star-rating">
            {[1, 2, 3, 4, 5].map((star) => (
              <span
                key={star}
                className={`star ${star <= reviewForm.rating ? 'filled' : ''}`}
                onClick={() => setReviewForm({ ...reviewForm, rating: star })}
              >
                ★
              </span>
            ))}
          </div>
        </div>
        <div className="form-group">
          <label>Comment:</label>
          <textarea
            value={reviewForm.comment}
            onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
            rows={4}
          />
        </div>
        <button type="submit" className="action-button success">
          Submit Review
        </button>
      </form>
    </div>
  </div>
)}
            {selectedChat ? (
              <>
                <h3>Chat with {getChatPartner(selectedChat)}</h3>
                <div className="messages">
                  {(messages[selectedChat] || []).map((msg) => (
                    <div
                      key={msg.id}
                      className={`message ${msg.sender_id === profile.id ? 'sent' : 'received'}`}
                    >
                      <p>{msg.content}</p>
                      <span>{format(new Date(msg.created_at), 'PPpp')}</span>
                      <span>{msg.is_read ? 'Read' : 'Unread'}</span>
                    </div>
                  ))}
                  {isTyping[selectedChat] && (
                    <div className="typing-indicator">
                      <p>Typing...</p>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
                <form onSubmit={handleSendMessage} className="message-form">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={handleTyping}
                    placeholder="Type a message..."
                  />
                  <button type="submit" className="action-button">
                    Send
                  </button>
                </form>
              </>
            ) : (
              <p>Select a chat to start messaging.</p>
            )}
          </div>
        </div>
      </div>
      <Footer />
      <Copyright />
    </div>
  );
};

export default Messages;