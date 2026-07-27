import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useFriends } from '../hooks/useFriends';
import Sidebar from '../components/Sidebar';
import ChatPanel from '../components/ChatPanel';
import './Dashboard.css';

const Dashboard = () => {
    const { userData, currentUser } = useAuth();
    const { friends, loading: friendsLoading } = useFriends(currentUser?.uid, userData?.friends || []);
    const [activeChatId, setActiveChatId] = useState(null);
    const [isMobileChatOpen, setIsMobileChatOpen] = useState(false);

    // Initialize Theme
    useEffect(() => {
        const savedTheme = localStorage.getItem('cv-theme') || 'light';
        document.body.setAttribute('data-theme', savedTheme);
    }, []);

    const handleSelectChat = (friend) => {
        setActiveChatId(friend.uid);
        setIsMobileChatOpen(true);
    };

    const handleCloseChat = () => {
        setIsMobileChatOpen(false);
        setTimeout(() => setActiveChatId(null), 300);
    };

    const activeChat = friends.find(f => f.uid === activeChatId) || null;

    return (
        <div className="dashboard-wrapper">
            {/* The green strip behind the main app container on desktop */}
            <div className="dashboard-top-bar"></div>
            
            <div className={`app-container ${isMobileChatOpen ? 'chat-open' : ''}`}>
                {userData && (
                    <>
                        <Sidebar 
                            friends={friends}
                            friendsLoading={friendsLoading}
                            activeChatId={activeChatId} 
                            onSelectChat={handleSelectChat} 
                        />
                        <ChatPanel 
                            activeChat={activeChat} 
                            onClose={handleCloseChat} 
                        />
                    </>
                )}
            </div>
        </div>
    );
};

export default Dashboard;
