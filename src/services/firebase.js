import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyBM7RX6ruJoA5QeOG78briw2sjxgvnqLqc",
    authDomain: "chat-vala.firebaseapp.com",
    projectId: "chat-vala",
    storageBucket: "chat-vala.firebasestorage.app",
    messagingSenderId: "134314086464",
    appId: "1:134314086464:web:b06ab2548270ebbf8f8fa5"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = async () => {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        return result.user;
    } catch (error) {
        console.error("Error signing in with Google", error);
        throw error;
    }
};

export const logout = async () => {
    try {
        await signOut(auth);
    } catch (error) {
        console.error("Error signing out", error);
    }
};
