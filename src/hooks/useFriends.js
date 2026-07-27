import { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';

export const useFriends = (currentUserUid, friendIds) => {
    const [friends, setFriends] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!currentUserUid || !friendIds || friendIds.length === 0) {
            setFriends([]);
            setLoading(false);
            return;
        }

        let isMounted = true;
        const unsubscribes = [];

        const fetchFriends = async () => {
            const friendsData = [];
            
            for (const fuid of friendIds) {
                try {
                    const fSnap = await getDoc(doc(db, "users", fuid));
                    if (fSnap.exists()) {
                        const fData = fSnap.data();
                        const chatId = [currentUserUid, fuid].sort().join("_");
                        
                        const friendObj = {
                            uid: fuid,
                            chatId,
                            ...fData,
                            lastMessage: '',
                            lastMessageTime: null,
                            unread: 0,
                            isTyping: false
                        };
                        friendsData.push(friendObj);
                    }
                } catch (e) {
                    console.error("Error fetching friend:", fuid, e);
                }
            }

            if (isMounted) {
                setFriends(friendsData);
                setLoading(false);
            }

            // Setup real-time listeners for chat meta (last message, typing) and user meta (online, lastSeen, profile changes)
            friendsData.forEach((f, idx) => {
                const unsubChat = onSnapshot(doc(db, "chats", f.chatId), (snap) => {
                    if (snap.exists() && isMounted) {
                        const meta = snap.data();
                        setFriends(prev => {
                            const updated = [...prev];
                            const i = updated.findIndex(u => u.uid === f.uid);
                            if (i > -1) {
                                updated[i] = {
                                    ...updated[i],
                                    lastMessage: meta.lastMessage || '',
                                    lastMessageTime: meta.lastMessageTime || null,
                                    unread: (meta.unread && meta.unread[currentUserUid]) || 0,
                                    isTyping: meta.typing && meta.typing[f.uid]
                                };
                            }
                            // Sort by lastMessageTime descending
                            return updated.sort((a, b) => {
                                const tA = a.lastMessageTime ? (a.lastMessageTime.toDate ? a.lastMessageTime.toDate() : new Date(a.lastMessageTime)) : new Date(0);
                                const tB = b.lastMessageTime ? (b.lastMessageTime.toDate ? b.lastMessageTime.toDate() : new Date(b.lastMessageTime)) : new Date(0);
                                return tB - tA;
                            });
                        });
                    }
                });
                unsubscribes.push(unsubChat);

                const unsubUser = onSnapshot(doc(db, "users", f.uid), (snap) => {
                    if (snap.exists() && isMounted) {
                        const uData = snap.data();
                        setFriends(prev => {
                            const updated = [...prev];
                            const i = updated.findIndex(u => u.uid === f.uid);
                            if (i > -1) {
                                updated[i] = {
                                    ...updated[i],
                                    ...uData
                                };
                            }
                            return updated;
                        });
                    }
                });
                unsubscribes.push(unsubUser);
            });
        };

        fetchFriends();

        return () => {
            isMounted = false;
            unsubscribes.forEach(unsub => unsub());
        };
    }, [currentUserUid, friendIds]);

    return { friends, loading };
};
