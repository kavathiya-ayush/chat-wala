import { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, query, orderBy, onSnapshot, writeBatch, doc, setDoc } from 'firebase/firestore';

export const useMessages = (chatId, currentUserUid) => {
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!chatId) {
            setMessages([]);
            setLoading(false);
            return;
        }

        const q = query(collection(db, "chats", chatId, "messages"), orderBy("timestamp", "asc"));
        
        const unsubscribe = onSnapshot(q, async (snap) => {
            const msgs = [];
            const unreadRefs = [];

            snap.forEach(d => {
                const m = d.data();
                msgs.push({ id: d.id, ...m });
                
                if (m.sender !== currentUserUid && m.status === 'sent') {
                    unreadRefs.push(d.ref);
                }
            });

            setMessages(msgs);
            setLoading(false);

            // Mark unread as read
            if (unreadRefs.length > 0) {
                const batch = writeBatch(db);
                unreadRefs.forEach(ref => batch.update(ref, { status: 'read' }));
                await batch.commit();
                
                await setDoc(doc(db, "chats", chatId), {
                    unread: { [currentUserUid]: 0 }
                }, { merge: true });
            }
        });

        return () => unsubscribe();
    }, [chatId, currentUserUid]);

    return { messages, loading };
};
