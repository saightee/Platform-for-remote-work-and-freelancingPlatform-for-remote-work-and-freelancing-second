import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Copyright from '../components/Copyright';
import { useRole } from '../context/RoleContext';
import { getMyApplications, getMyJobPosts, getApplicationsForJobPost } from '../services/api';
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
      if (currentRole === 'jobseeker') {
        applications.forEach((app) => {
          socket.emit('joinChat', { jobApplicationId: app.id });
        });
      } else if (currentRole === 'employer') {
        Object.values(jobPostApplications).flat().forEach(app => {
          socket.emit('joinChat', { jobApplicationId: app.applicationId });
        });
      }
    };

    socket.on('chatHistory', (history: Message[]) => {
      if (history.length > 0) {
        const jobApplicationId = history[0].job_application_id;
        setMessages((prev) => ({
          ...prev,
          [jobApplicationId]: history.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
        }));
        setUnreadCounts((prevCounts) => ({
          ...prevCounts,
          [jobApplicationId]: selectedChat === jobApplicationId ? 0 : history.filter((msg) => msg.recipient_id === profile.id && !msg.is_read).length,
        }));
      }
    });

    socket.on('newMessage', (message: Message) => {
      setMessages((prev) => ({
        ...prev,
        [message.job_application_id]: [...(prev[message.job_application_id] || []), message],
      }));
      if (message.recipient_id === profile.id && !message.is_read && selectedChat !== message.job_application_id) {
        setUnreadCounts((prevCounts) => ({
          ...prevCounts,
          [message.job_application_id]: (prevCounts[message.job_application_id] || 0) + 1,
        }));
      }
    });

    socket.on('chatInitialized', async (data: { jobApplicationId: string }) => {
      console.log('Chat initialized for application:', data.jobApplicationId);
      socket.emit('joinChat', { jobApplicationId: data.jobApplicationId });
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
    });

    joinChats();

    return () => {
      socket.off('chatHistory');
      socket.off('newMessage');
      socket.off('chatInitialized');
      socket.off('connect_error');
    };
  }, [profile, currentRole, socket, applications, jobPostApplications, selectedChat]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, selectedChat]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!socket || !selectedChat || !newMessage.trim()) return;

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
  if (socket && socketStatus === 'connected') {
    socket.emit('joinChat', { jobApplicationId });
    socket.emit('markMessagesAsRead', { jobApplicationId });
  } else {
    console.warn('WebSocket not connected, cannot join chat or mark messages as read');
    setError('Chat server not connected. Please try again later.');
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
    }, 1000);
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

  if (isLoading) {
    return (
    <div>
      <Header />
      <div className="container">
        <h2>Messages</h2>
        <Loader />
      </div>
      </div>
    );
  }

  if (!profile || !['jobseeker', 'employer'].includes(currentRole || '')) {
    return (
      <div>
      <Header />
      <div className="container">
        <Header />
        <h2>Messages</h2>
        <p>This page is only available for jobseekers and employers.</p>
      </div>
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
                </li>
              ))}
            </ul>
          ) : (
            <p>No active chats found.</p>
          )}
        </div>
        <div className="chat-window">
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
