import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useMessages } from '../hooks/useMessages';
import { db } from '../services/firebase';
import { collection, addDoc, serverTimestamp, setDoc, doc, writeBatch, getDocs } from 'firebase/firestore';
import { formatMsgTime, formatLastSeen } from '../utils/formatters';
import './ChatPanel.css';

const DEFAULT_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='50' fill='%23DFE5E7'/%3E%3Ccircle cx='50' cy='38' r='16' fill='%23A0AEB4'/%3E%3Cpath d='M20 85a30 25 0 0160 0' fill='%23A0AEB4'/%3E%3C/svg%3E";
const EMOJIS = ['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃','😉','😊','😇','🥰','😍','🤩','😘','😗','😚','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','🤐','🤨','😐','😑','😶','😏','😒','🙄','😬','😌','😔','😪','😴','😷','🤒','🤕','🤢','🤮','🥵','🥶','🥴','😵','🤯','🤠','🥳','😎','🤓','🧐','😟','🙁','😮','😲','😳','🥺','😢','😭','😱','😤','😡','😠','🤬','😈','👿','💀','👻','👽','🤖','😺','😸','😻','😼','😽','🙀','💪','👍','👎','👋','🤝','✌️','🤞','🤟','🤘','👏','🙏','❤️','🧡','💛','💚','💙','💜','🖤','🤍','💔','❣️','💕','💞','💗','💖','🔥','⭐','✨','🎉','🎊','💯','✅','❌','⚡','💥','🌟','🎯','👀','💬','💭'];

const ChatPanel = ({ activeChat, onClose }) => {
    const { currentUser } = useAuth();
    const { messages, loading } = useMessages(activeChat?.chatId, currentUser?.uid);
    const [msgText, setMsgText] = useState('');
    const [showEmojis, setShowEmojis] = useState(false);
    const [isNearBottom, setIsNearBottom] = useState(true);
    const [showMenu, setShowMenu] = useState(false);
    
    const bodyRef = useRef(null);
    const typingTimeout = useRef(null);
    const inputRef = useRef(null);

    const scrollToBottom = () => {
        if (bodyRef.current) {
            bodyRef.current.scrollTo({ top: bodyRef.current.scrollHeight, behavior: 'smooth' });
        }
    };

    useEffect(() => {
        if (isNearBottom) {
            scrollToBottom();
        }
    }, [messages]);

    const handleScroll = (e) => {
        const { scrollHeight, scrollTop, clientHeight } = e.target;
        setIsNearBottom(scrollHeight - scrollTop - clientHeight < 150);
    };

    const handleInputChange = (e) => {
        setMsgText(e.target.value);
        
        // Auto-resize
        e.target.style.height = 'auto';
        e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';

        if (!activeChat?.chatId) return;
        
        setDoc(doc(db, "chats", activeChat.chatId), {
            typing: { [currentUser.uid]: true }
        }, { merge: true });

        clearTimeout(typingTimeout.current);
        typingTimeout.current = setTimeout(() => {
            setDoc(doc(db, "chats", activeChat.chatId), {
                typing: { [currentUser.uid]: false }
            }, { merge: true });
        }, 2000);
    };

    const handleSend = async () => {
        if (!msgText.trim() || !activeChat) return;

        const text = msgText.trim();
        setMsgText('');
        if (inputRef.current) {
            inputRef.current.style.height = 'auto';
            inputRef.current.focus();
        }
        setShowEmojis(false);

        clearTimeout(typingTimeout.current);
        await setDoc(doc(db, "chats", activeChat.chatId), {
            typing: { [currentUser.uid]: false }
        }, { merge: true });

        await addDoc(collection(db, "chats", activeChat.chatId, "messages"), {
            sender: currentUser.uid,
            text: text,
            timestamp: serverTimestamp(),
            status: 'sent'
        });

        await setDoc(doc(db, "chats", activeChat.chatId), {
            lastMessage: text,
            lastMessageTime: serverTimestamp(),
            lastMessageSender: currentUser.uid,
            unread: { [activeChat.uid]: (activeChat.unread || 0) + 1 }
        }, { merge: true });

        scrollToBottom();
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleClearChat = async () => {
        if (!confirm("Clear all messages in this chat?")) return;
        const snap = await getDocs(collection(db, "chats", activeChat.chatId, "messages"));
        const batch = writeBatch(db);
        snap.forEach(d => batch.delete(d.ref));
        await batch.commit();
        await setDoc(doc(db, "chats", activeChat.chatId), {
            lastMessage: '', lastMessageTime: null
        }, { merge: true });
    };

    if (!activeChat) {
        return (
            <div className="chat-panel-empty">
                <div className="empty-chat-wa">
                    <div className="empty-illustration">
                        <img src="https://static.whatsapp.net/rsrc.php/v3/y6/r/wa669aeJeom.png" alt="WhatsApp Web" style={{width: 320, opacity: 1, marginBottom: 30}}/>
                    </div>
                    <h2>Download WhatsApp for Windows</h2>
                    <p>Make calls, share your screen and get a faster experience when you download the Windows app.</p>
                    <div className="empty-encryption-wa">
                        <svg viewBox="0 0 10 12" width="10" height="12"><path fill="currentColor" d="M5.008 1.455c-1.348 0-2.445 1.053-2.498 2.378l-.002.138v1.658h-.446a.82.82 0 0 0-.82.784l-.003.04v4.437a.82.82 0 0 0 .783.82l.04.002H8.05a.82.82 0 0 0 .82-.783l.002-.04V6.453a.82.82 0 0 0-.783-.82l-.04-.002h-.444V3.971c0-1.39-1.127-2.516-2.516-2.516zM6.355 5.63H3.765V3.971a1.248 1.248 0 0 1 1.205-1.246l.04-.001a1.247 1.247 0 0 1 1.247 1.205l.001.042V5.63z"></path></svg>
                        Your personal messages are end-to-end encrypted
                    </div>
                </div>
            </div>
        );
    }

    return (
        <section className="chat-panel-wa active">
            <div className="chat-header-wa">
                <div className="chat-header-left">
                    <button className="back-btn-wa" onClick={onClose}>←</button>
                    <img className="chat-avatar-wa" src={activeChat.photoURL || DEFAULT_AVATAR} alt={activeChat.name} />
                    <div className="chat-info-wa">
                        <div className="chat-name-wa">{activeChat.name}</div>
                        <div className="chat-status-wa">
                            {activeChat.isTyping ? 'typing...' : (activeChat.online ? 'Online' : formatLastSeen(activeChat.lastSeen))}
                        </div>
                    </div>
                </div>
                
                <div className="chat-header-right" style={{position: 'relative'}}>
                    <button className="icon-btn-wa" title="Search">
                        <svg viewBox="0 0 24 24" width="24" height="24">
                            <path fill="currentColor" d="M15.009 13.805h-.636l-.22-.219a5.184 5.184 0 0 0 1.256-3.386 5.207 5.207 0 1 0-5.207 5.208 5.183 5.183 0 0 0 3.385-1.255l.221.22v.635l4.004 3.999 1.194-1.195-3.997-4.007zm-4.808 0a3.605 3.605 0 1 1 0-7.21 3.605 3.605 0 0 1 0 7.21z"></path>
                        </svg>
                    </button>
                    <button className="icon-btn-wa" onClick={() => setShowMenu(!showMenu)} title="Menu">
                        <svg viewBox="0 0 24 24" width="24" height="24">
                            <path fill="currentColor" d="M12 7a2 2 0 1 0-.001-4.001A2 2 0 0 0 12 7zm0 2a2 2 0 1 0-.001 3.999A2 2 0 0 0 12 9zm0 6a2 2 0 1 0-.001 3.999A2 2 0 0 0 12 15z"></path>
                        </svg>
                    </button>
                    {showMenu && (
                        <>
                            <div className="dropdown-overlay" onClick={() => setShowMenu(false)}></div>
                            <div className="dropdown-menu-wa">
                                <div className="dropdown-item-wa" onClick={() => { setShowMenu(false); handleClearChat(); }}>Clear chat</div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            <div className="chat-body-wa" ref={bodyRef} onScroll={handleScroll}>
                {messages.map((m, index) => {
                    const isMe = m.sender === currentUser.uid;
                    const prevM = index > 0 ? messages[index - 1] : null;
                    const isGrouped = prevM && prevM.sender === m.sender;
                    
                    return (
                        <div key={m.id} className={`message-wa ${isMe ? 'sent' : 'received'} ${isGrouped ? 'grouped' : ''}`}>
                            <span className="msg-text-wa">{m.text}</span>
                            <span className="msg-meta-wa">
                                <span className="msg-time-wa">{formatMsgTime(m.timestamp)}</span>
                                {isMe && (
                                    <span className={`msg-ticks-wa ${m.status === 'read' ? 'read' : 'sent'}`}>
                                        {m.status === 'read' ? (
                                            <svg viewBox="0 0 16 15" width="16" height="15"><path fill="currentColor" d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.064-.512zm-4.1 0l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L1.891 7.769a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.048a.365.365 0 0 0-.063-.51z"/></svg>
                                        ) : (
                                            <svg viewBox="0 0 11 14" width="11" height="14"><path fill="currentColor" d="M3.486 11.233L.266 8.013a.584.584 0 0 0-.825 0l-.25.25a.584.584 0 0 0 0 .825l3.883 3.883a.584.584 0 0 0 .825 0l7.25-7.25a.584.584 0 0 0 0-.825l-.25-.25a.584.584 0 0 0-.825 0l-6.588 6.587z"/></svg>
                                        )}
                                    </span>
                                )}
                            </span>
                        </div>
                    );
                })}
                
                {activeChat.isTyping && (
                    <div className="typing-bubble-wa">
                        <div className="typing-dots-wa"><span></span><span></span><span></span></div>
                    </div>
                )}
            </div>

            <button 
                className={`scroll-btn-wa ${!isNearBottom ? 'visible' : ''}`} 
                onClick={scrollToBottom}
            >
                <svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M12 17l6-6-1.4-1.4-4.6 4.6-4.6-4.6L6 11z"/></svg>
            </button>

            {showEmojis && (
                <div className="emoji-picker-wa open">
                    {EMOJIS.map(emoji => (
                        <span 
                            key={emoji} 
                            className="emoji-item-wa" 
                            onClick={() => {
                                setMsgText(prev => prev + emoji);
                                if (inputRef.current) inputRef.current.focus();
                            }}
                        >
                            {emoji}
                        </span>
                    ))}
                </div>
            )}

            <div className="chat-footer-wa">
                <button className="emoji-btn-wa" onClick={() => setShowEmojis(!showEmojis)}>
                    <svg viewBox="0 0 24 24" width="26" height="26"><path fill="currentColor" d="M9.153 11.603c.795 0 1.439-.879 1.439-1.962s-.644-1.962-1.439-1.962-1.439.879-1.439 1.962.644 1.962 1.439 1.962zm-3.204 1.362c-.026-.307-.132 5.218 6.062 5.551 6.066-.25 6.066-5.551 6.066-5.551-6.078 1.416-12.128 0-12.128 0zm11.363 1.108s-.669 1.959-5.051 1.959c-3.505 0-5.388-1.164-5.607-1.959H6.012c.189 1.56 3.197 3.593 6.062 3.593 2.914 0 5.688-2.146 5.864-3.593h-1.527zM14.846 11.603c.795 0 1.439-.879 1.439-1.962s-.644-1.962-1.439-1.962-1.439.879-1.439 1.962.644 1.962 1.439 1.962z"></path></svg>
                </button>
                <div className="input-wrap-wa">
                    <textarea 
                        ref={inputRef}
                        className="msg-input-wa" 
                        placeholder="Type a message" 
                        rows="1"
                        value={msgText}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                    />
                </div>
                {msgText.trim() ? (
                    <button className="send-btn-wa active" onClick={handleSend}>
                        <svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M1.101 21.757 23.8 12.028 1.101 2.3l.011 7.912 13.623 1.816-13.623 1.817-.011 7.912z"/></svg>
                    </button>
                ) : (
                    <button className="send-btn-wa" disabled>
                        <svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M11.999 14.942c2.001 0 3.531-1.53 3.531-3.531V4.35c0-2.001-1.53-3.531-3.531-3.531S8.469 2.349 8.469 4.35v7.061c0 2.001 1.53 3.531 3.531 3.531zm6.238-3.53c0 3.531-2.942 6.002-6.237 6.002s-6.237-2.471-6.237-6.002H3.761c0 4.001 3.178 7.297 7.061 7.885v3.884h2.354v-3.884c3.884-.588 7.061-3.884 7.061-7.885h-2.001z"></path></svg>
                    </button>
                )}
            </div>
        </section>
    );
};

export default ChatPanel;
