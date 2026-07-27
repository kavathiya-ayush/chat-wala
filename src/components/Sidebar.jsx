import { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firebase';
import { collection, query, where, getDocs, updateDoc, doc, arrayUnion } from 'firebase/firestore';
import { formatSidebarTime } from '../utils/formatters';
import { logout } from '../services/firebase';
import { createPortal } from 'react-dom';
import './Sidebar.css';

const DEFAULT_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='50' fill='%23DFE5E7'/%3E%3Ccircle cx='50' cy='38' r='16' fill='%23A0AEB4'/%3E%3Cpath d='M20 85a30 25 0 0160 0' fill='%23A0AEB4'/%3E%3C/svg%3E";

const Sidebar = ({ activeChatId, onSelectChat, friends, friendsLoading }) => {
    const { currentUser, userData } = useAuth();
    
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showProfileModal, setShowProfileModal] = useState(false);
    
    const [editName, setEditName] = useState(userData?.name || '');
    const [editAbout, setEditAbout] = useState(userData?.about || '');
    const [addIdInput, setAddIdInput] = useState('');
    const [addEmailInput, setAddEmailInput] = useState('');
    const [copied, setCopied] = useState(false);

    const firstLetter = userData?.email ? userData.email.charAt(0).toUpperCase() : '?';

    const filteredFriends = useMemo(() => {
        if (!searchQuery) return friends;
        const lower = searchQuery.toLowerCase();
        return friends.filter(f => 
            (f.name || '').toLowerCase().includes(lower) || 
            (f.email || '').toLowerCase().includes(lower)
        );
    }, [friends, searchQuery]);

    const toggleTheme = () => {
        const current = document.body.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        document.body.setAttribute('data-theme', next);
        localStorage.setItem('cv-theme', next);
    };

    const handleSaveProfile = async () => {
        if (!editName.trim()) return alert("Name can't be empty");
        await updateDoc(doc(db, "users", currentUser.uid), {
            name: editName.trim(),
            about: editAbout.trim()
        });
        setShowProfileModal(false);
    };

    const handleCopyId = () => {
        navigator.clipboard.writeText(userData?.uniqueId);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleAddFriend = async () => {
        const idVal = addIdInput.trim().toUpperCase();
        const emailVal = addEmailInput.trim().toLowerCase();

        if (!idVal && !emailVal) return alert("Enter Chat ID or Email");

        let targetUID = null;
        if (idVal) {
            const q = query(collection(db, "users"), where("uniqueId", "==", idVal));
            const snap = await getDocs(q);
            if (snap.empty) return alert("Chat ID not found!");
            targetUID = snap.docs[0].id;
        } else if (emailVal) {
            const q = query(collection(db, "users"), where("email", "==", emailVal));
            const snap = await getDocs(q);
            if (snap.empty) return alert("Email not found!");
            targetUID = snap.docs[0].id;
        }

        if (targetUID === currentUser.uid) return alert("Can't add yourself!");

        await updateDoc(doc(db, "users", currentUser.uid), { friends: arrayUnion(targetUID) });
        await updateDoc(doc(db, "users", targetUID), { friends: arrayUnion(currentUser.uid) });

        setAddIdInput('');
        setAddEmailInput('');
        setShowAddModal(false);
        
        // Auto open the new chat
        onSelectChat({ uid: targetUID });
    };

    return (
        <aside className="sidebar">
            {/* Main Sidebar Content */}
            <div className="sidebar-header">
                <div 
                    className="header-text-avatar" 
                    onClick={() => {
                        setEditName(userData?.name || '');
                        setEditAbout(userData?.about || '');
                        setShowProfileModal(true);
                    }}
                    title="Profile"
                >
                    {firstLetter}
                </div>
                <div className="header-actions">
                    <button className="icon-btn-wa" onClick={toggleTheme} title="Toggle Theme">
                        <svg viewBox="0 0 24 24" width="24" height="24">
                            <path fill="currentColor" d="M12 21c-4.97 0-9-4.03-9-9s4.03-9 9-9 9 4.03 9 9-4.03 9-9 9zm0-16c-3.86 0-7 3.14-7 7s3.14 7 7 7 7-3.14 7-7-3.14-7-7-7z"/>
                        </svg>
                    </button>
                    <button className="icon-btn-wa" onClick={() => setShowAddModal(true)} title="New Chat">
                        <svg viewBox="0 0 24 24" height="24" width="24">
                            <path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                        </svg>
                    </button>
                </div>
            </div>

            <div className={`search-wrap-wa ${isSearchFocused ? 'focused' : ''}`}>
                <div className="search-box">
                    <button 
                        className="search-icon"
                        onClick={() => {
                            if (isSearchFocused) {
                                setIsSearchFocused(false);
                                setSearchQuery('');
                            }
                        }}
                    >
                        {isSearchFocused ? (
                            <svg viewBox="0 0 24 24" width="24" height="24" className="search-icon-back">
                                <path fill="var(--green)" d="M12 4l1.4 1.4L7.8 11H20v2H7.8l5.6 5.6L12 20l-8-8 8-8z"></path>
                            </svg>
                        ) : (
                            <svg viewBox="0 0 24 24" width="24" height="24">
                                <path fill="currentColor" d="M15.009 13.805h-.636l-.22-.219a5.184 5.184 0 0 0 1.256-3.386 5.207 5.207 0 1 0-5.207 5.208 5.183 5.183 0 0 0 3.385-1.255l.221.22v.635l4.004 3.999 1.194-1.195-3.997-4.007zm-4.808 0a3.605 3.605 0 1 1 0-7.21 3.605 3.605 0 0 1 0 7.21z"></path>
                            </svg>
                        )}
                    </button>
                    <input 
                        placeholder="Search or start new chat" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onFocus={() => setIsSearchFocused(true)}
                        onBlur={() => { if(!searchQuery) setIsSearchFocused(false) }}
                    />
                </div>
            </div>

            <div className="chat-list">
                {friendsLoading ? (
                    <div className="empty-list-wa"><p>Loading...</p></div>
                ) : filteredFriends.length === 0 ? (
                    <div className="empty-list-wa">
                        <p>No chats found</p>
                    </div>
                ) : (
                    filteredFriends.map(f => (
                        <div 
                            key={f.uid} 
                            className={`friend-item-wa ${activeChatId === f.uid ? 'active' : ''}`}
                            onClick={() => onSelectChat(f)}
                        >
                            <div className="friend-avatar-wrap">
                                <img className="friend-avatar" src={f.photoURL || DEFAULT_AVATAR} alt={f.name} />
                            </div>
                            <div className="friend-info-wa">
                                <div className="friend-row-wa">
                                    <span className="friend-name-wa">{f.name}</span>
                                    <span className={`friend-time-wa ${f.unread > 0 ? 'unread' : ''}`}>{formatSidebarTime(f.lastMessageTime)}</span>
                                </div>
                                <div className="friend-row-wa">
                                    <span className="friend-last-msg-wa">
                                        {f.isTyping ? <span style={{color: 'var(--green)', fontWeight: 500}}>typing...</span> : (f.lastMessage || '')}
                                    </span>
                                    <div className="friend-meta-wa">
                                        {f.unread > 0 && <span className="unread-badge-wa">{f.unread}</span>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
                {!friendsLoading && (
                    <div style={{padding: '20px', textAlign: 'center'}}>
                        <button className="btn-primary" onClick={() => setShowAddModal(true)} style={{borderRadius: '24px', padding: '10px 24px', display: 'inline-flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 10px rgba(0, 168, 132, 0.3)'}}>
                            <svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" /></svg>
                            Start New Chat
                        </button>
                    </div>
                )}
            </div>

            {/* Profile Centered Modal */}
            {showProfileModal && createPortal(
                <div className="modal-overlay-wa" onClick={() => setShowProfileModal(false)}>
                    <div className="modal-content-wa profile-modal-wa" onClick={e => e.stopPropagation()}>
                        <div className="modal-header-wa">
                            <h2>Profile</h2>
                            <button className="close-btn-wa" onClick={() => setShowProfileModal(false)}>
                                <svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M19.1 17.2l-5.3-5.3 5.3-5.3-1.8-1.8-5.3 5.3-5.3-5.3-1.8 1.8 5.3 5.3-5.3 5.3 1.8 1.8 5.3-5.3 5.3 5.3z"/></svg>
                            </button>
                        </div>
                        <div className="modal-body-wa">
                            <div className="modal-avatar-lg-wrap">
                                <div className="modal-text-avatar-lg">{firstLetter}</div>
                            </div>
                            
                            <div className="modal-input-group-wa">
                                <label>Your name</label>
                                <input value={editName} onChange={e => setEditName(e.target.value)} placeholder="Name" />
                            </div>
                            <div className="modal-info-text-wa">
                                This is not your username or pin. This name will be visible to your contacts.
                            </div>

                            <div className="modal-input-group-wa">
                                <label>About</label>
                                <input value={editAbout} onChange={e => setEditAbout(e.target.value)} placeholder="About you" />
                            </div>

                            <div className="modal-input-group-wa id-copy-group">
                                <label>Your Chat ID</label>
                                <div className="copy-id-wrap" onClick={handleCopyId}>
                                    <input value={userData?.uniqueId || ''} readOnly />
                                    <button className="copy-icon-btn" title="Copy ID">
                                        {copied ? (
                                            <svg viewBox="0 0 24 24" width="20" height="20"><path fill="#00a884" d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/></svg>
                                        ) : (
                                            <svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
                                        )}
                                    </button>
                                </div>
                            </div>

                            <div className="modal-actions-wa">
                                <button className="btn-primary" onClick={handleSaveProfile}>Save Changes</button>
                                <button className="btn-danger" onClick={logout}>Log out</button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Add Friend Centered Modal */}
            {showAddModal && createPortal(
                <div className="modal-overlay-wa" onClick={() => setShowAddModal(false)}>
                    <div className="modal-content-wa profile-modal-wa" onClick={e => e.stopPropagation()}>
                        <div className="modal-header-wa">
                            <h2>New Chat</h2>
                            <button className="close-btn-wa" onClick={() => setShowAddModal(false)}>
                                <svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M19.1 17.2l-5.3-5.3 5.3-5.3-1.8-1.8-5.3 5.3-5.3-5.3-1.8 1.8 5.3 5.3-5.3 5.3 1.8 1.8 5.3-5.3 5.3 5.3z"/></svg>
                            </button>
                        </div>
                        <div className="modal-body-wa">
                            <div className="modal-info-text-wa" style={{marginBottom: '20px'}}>
                                Enter your friend's Chat ID or Email Address to start a secure conversation.
                            </div>
                            
                            <div className="modal-input-group-wa">
                                <label>Chat ID</label>
                                <input placeholder="e.g. CV-AB12CD" value={addIdInput} onChange={e => setAddIdInput(e.target.value)} />
                            </div>
                            
                            <div style={{textAlign: 'center', margin: '15px 0', color: 'var(--text-muted)', fontSize: '13px', fontWeight: '500'}}>OR</div>

                            <div className="modal-input-group-wa">
                                <label>Email Address</label>
                                <input placeholder="friend@example.com" value={addEmailInput} onChange={e => setAddEmailInput(e.target.value)} />
                            </div>

                            <div className="modal-actions-wa" style={{marginTop: '30px'}}>
                                <button className="btn-primary" onClick={handleAddFriend} style={{width: '100%'}}>Add & Start Chat</button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </aside>
    );
};

export default Sidebar;
