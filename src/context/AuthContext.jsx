import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../services/firebase";
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from "firebase/firestore";

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let unsubUserDoc = null;
        const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
            if (user) {
                setCurrentUser(user);
                const userRef = doc(db, "users", user.uid);
                
                try {
                    const snap = await getDoc(userRef);
                    if (!snap.exists()) {
                        // Create user document if it doesn't exist
                        const uid = "CV-" + Math.random().toString(36).substring(2, 8).toUpperCase();
                        const newUserData = {
                            name: user.displayName || "User",
                            email: user.email,
                            photoURL: user.photoURL || "",
                            uniqueId: uid,
                            friends: [],
                            online: true,
                            about: "Hey there! I am using Chat-Vala",
                            lastSeen: null,
                            createdAt: new Date()
                        };
                        await setDoc(userRef, newUserData);
                    } else {
                        // Update online status
                        await updateDoc(userRef, { online: true });
                    }

                    // Subscribe to realtime updates for this user
                    unsubUserDoc = onSnapshot(userRef, (docSnap) => {
                        if (docSnap.exists()) {
                            setUserData(docSnap.data());
                        }
                    });

                } catch (error) {
                    console.error("Error fetching user data:", error);
                }
            } else {
                setCurrentUser(null);
                setUserData(null);
                if (unsubUserDoc) {
                    unsubUserDoc();
                    unsubUserDoc = null;
                }
            }
            setLoading(false);
        });

        return () => {
            unsubscribeAuth();
            if (unsubUserDoc) unsubUserDoc();
        };
    }, []);

    // Handle online status on window close/hide
    useEffect(() => {
        if (!currentUser) return;

        const handleVisibilityChange = () => {
            if (document.hidden) {
                updateDoc(doc(db, "users", currentUser.uid), { 
                    online: false, 
                    lastSeen: new Date() 
                }).catch(() => {});
            } else {
                updateDoc(doc(db, "users", currentUser.uid), { 
                    online: true 
                }).catch(() => {});
            }
        };

        const handleBeforeUnload = () => {
            updateDoc(doc(db, "users", currentUser.uid), { 
                online: false, 
                lastSeen: new Date() 
            }).catch(() => {});
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        window.addEventListener("beforeunload", handleBeforeUnload);

        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            window.removeEventListener("beforeunload", handleBeforeUnload);
        };
    }, [currentUser]);

    const value = {
        currentUser,
        userData,
        loading
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
