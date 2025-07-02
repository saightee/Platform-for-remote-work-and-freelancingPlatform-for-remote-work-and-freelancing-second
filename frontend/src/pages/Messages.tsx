import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Copyright from '../components/Copyright';
import { useRole } from '../context/RoleContext';
import { getMyApplications, getMyJobPosts, getApplicationsForJobPost } from '../services/api';
import { JobApplication, JobPost } from '@types';
import { format } from 'date-fns';

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
  const [jobPostApplications, setJobPostApplications] = useState<{ [jobPostId: string]: { id: string; userId: string; username: string; email: string; jobDescription: string; appliedAt: string; status: string; job_post_id: string }[] }>({});
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [messages, setMessages] = useState<{ [jobApplicationId: string]: Message[] }>({});
  const [newMessage, setNewMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [unreadCounts, setUnreadCounts] = useState<{ [jobApplicationId: string]: number }>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!profile || !currentRole || !['jobseeker', 'employer'].includes(currentRole)) {
      setError('You must be a jobseeker or employer to view messages.');
      setIsLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        if (currentRole === 'jobseeker') {
          const apps = await getMyApplications();
          setApplications(apps.filter(app => app.status === 'Accepted'));
        } else if (currentRole === 'employer') {
          const posts = await getMyJobPosts();
          setJobPosts(posts);
          const appsPromises = posts.map(post => getApplicationsForJobPost(post.id));
          const appsArrays = await Promise.all(appsPromises);
          const appsMap: { [jobPostId: string]: typeof appsArrays[0] } = {};
          posts.forEach((post, index) => {
            appsMap[post.id] = appsArrays[index].filter(app => app.status === 'Accepted');
          });
          setJobPostApplications(appsMap);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load chats. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [profile, currentRole]);

  useEffect(() => {
    if (!profile || !currentRole || !['jobseeker', 'employer'].includes(currentRole) || !socket) {
      setUnreadCounts({});
      return;
    }

    socket.on('connect', () => {
      console.log('Connected to WebSocket server');
      if (currentRole === 'jobseeker') {
        applications.forEach(app => {
          socket.emit('joinChat', { jobApplicationId: app.id });
        });
      } else if (currentRole === 'employer') {
        Object.values(jobPostApplications).flat().forEach(app => {
          socket.emit('joinChat', { jobApplicationId: app.id });
        });
      }
    });

    socket.on('chatHistory', (history: Message[]) => {
      if (history.length > 0) {
        const jobApplicationId = history[0].job_application_id;
        setMessages(prev => ({
          ...prev,
          [jobApplicationId]: history.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        }));
        setUnreadCounts(prevCounts => ({
          ...prevCounts,
          [jobApplicationId]: selectedChat === jobApplicationId ? 0 : history.filter(msg => msg.recipient_id === profile.id && !msg.is_read).length
        }));
      }
    });

    socket.on('newMessage', (message: Message) => {
      setMessages(prev => ({
        ...prev,
        [message.job_application_id]: [...(prev[message.job_application_id] || []), message]
      }));
      if (message.recipient_id === profile.id && !message.is_read && selectedChat !== message.job_application_id) {
        setUnreadCounts(prevCounts => ({
          ...prevCounts,
          [message.job_application_id]: (prevCounts[message.job_application_id] || 0) + 1
        }));
      }
    });

    socket.on('connect_error', (err) => {
      console.error('WebSocket connection error:', err);
      setError('Failed to connect to chat server. Retrying...');
    });

    return () => {
      socket.off('chatHistory');
      socket.off('newMessage');
      socket.off('connect');
      socket.off('connect_error');
      setUnreadCounts({});
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
      content: newMessage.trim()
    });

    setNewMessage('');
  };

  const handleSelectChat = (jobApplicationId: string) => {
    setSelectedChat(jobApplicationId);
    setUnreadCounts(prev => ({
      ...prev,
      [jobApplicationId]: 0
    }));
  };

  const getChatPartner = (jobApplicationId: string) => {
    if (currentRole === 'jobseeker') {
      const app = applications.find(a => a.id === jobApplicationId);
      return app?.job_post?.employer?.username || 'Unknown';
    } else if (currentRole === 'employer') {
      const app = Object.values(jobPostApplications).flat().find(a => a.id === jobApplicationId);
      return app?.username || 'Unknown';
    }
    return 'Unknown';
  };

  const getChatList = () => {
    if (currentRole === 'jobseeker') {
      return applications.map(app => ({
        id: app.id,
        title: app.job_post?.title || 'Unknown Job',
        partner: getChatPartner(app.id),
        unreadCount: unreadCounts[app.id] || 0
      }));
    } else if (currentRole === 'employer') {
      return Object.values(jobPostApplications).flat().map(app => ({
        id: app.id,
        title: jobPosts.find(post => post.id === app.job_post_id)?.title || 'Unknown Job',
        partner: app.username,
        unreadCount: unreadCounts[app.id] || 0
      }));
    }
    return [];
  };

  if (isLoading) {
    return (
      <div className="container">
        <Header />
        <h2>Messages</h2>
        <p>Loading...</p>
        <Footer />
        <Copyright />
      </div>
    );
  }

  if (!profile || !['jobseeker', 'employer'].includes(currentRole || '')) {
    return (
      <div className="container">
        <Header />
        <h2>Messages</h2>
        <p>This page is only available for jobseekers and employers.</p>
        <Footer />
        <Copyright />
      </div>
    );
  }

  return (
    <div className="container messages-container">
      <Header />
      <h2>Messages</h2>
      {error && <p className="error-message">{error}</p>}
      {socketStatus === 'reconnecting' && <p className="error-message">Reconnecting to chat server...</p>}
      <div className="messages-content">
        <div className="chat-list">
          <h3>Chats</h3>
          {getChatList().length > 0 ? (
            <ul>
              {getChatList().map(chat => (
                <li
                  key={chat.id}
                  className={`chat-item ${selectedChat === chat.id ? 'active' : ''}`}
                  onClick={() => handleSelectChat(chat.id)}
                >
                  <p><strong>{chat.title}</strong></p>
                  <p>{chat.partner}</p>
                  {chat.unreadCount > 0 && (
                    <span className="unread-count">{chat.unreadCount}</span>
                  )}
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
                <div ref={messagesEndRef} />
              </div>
              <form onSubmit={handleSendMessage} className="message-form">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                />
                <button type="submit" className="action-button">Send</button>
              </form>
            </>
          ) : (
            <p>Select a chat to start messaging.</p>
          )}
        </div>
      </div>
      <Footer />
      <Copyright />
    </div>
  );
};

export default Messages;