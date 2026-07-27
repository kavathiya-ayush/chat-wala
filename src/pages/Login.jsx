import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { v4 as uuidv4 } from 'uuid';
import { doc, onSnapshot, deleteDoc } from 'firebase/firestore';
import { signInWithCredential, GoogleAuthProvider } from 'firebase/auth';
import { db, auth, signInWithGoogle } from '../services/firebase';
import './Login.css';

const Login = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [sessionId, setSessionId] = useState('');
    const [qrUrl, setQrUrl] = useState('');

    useEffect(() => {
        const newSessionId = uuidv4();
        setSessionId(newSessionId);
        const url = `${window.location.origin}/qr-login?session=${newSessionId}`;
        setQrUrl(url);

        const unsub = onSnapshot(doc(db, "qr_sessions", newSessionId), async (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.idToken) {
                    try {
                        setLoading(true);
                        const credential = GoogleAuthProvider.credential(data.idToken);
                        await signInWithCredential(auth, credential);
                        await deleteDoc(doc(db, "qr_sessions", newSessionId));
                    } catch (err) {
                        setError('Failed to sign in from mobile. Please try again.');
                        setLoading(false);
                    }
                }
            }
        });

        return () => {
            unsub();
            deleteDoc(doc(db, "qr_sessions", newSessionId)).catch(() => {});
        };
    }, []);

    const handleGoogleLogin = async () => {
        setLoading(true);
        setError('');
        try {
            await signInWithGoogle();
        } catch (err) {
            setError('Failed to sign in. Please try again.');
            setLoading(false);
        }
    };

    return (
        <div className="login-wrapper">
            <div className="login-top-bar">
                <div className="login-header-content">
                    <img src="/iconr.png" alt="Chat-Vala" className="login-logo" />
                    <span>CHAT-VALA WEB</span>
                </div>
            </div>
            
            <div className="login-card">
                <div className="login-content">
                    <div className="login-instructions">
                        <h1>Use Chat-Vala on your computer</h1>
                        <ol>
                            <li>Open Google Lens or your phone's Camera</li>
                            <li>Point your phone to this screen to capture the QR code</li>
                            <li>Sign in with Google on your phone to instantly link this device</li>
                        </ol>
                        <div className="login-link" style={{ marginTop: '30px' }}>
                            <a href="#">Need help to get started?</a>
                        </div>
                    </div>
                    
                    <div className="login-action-area">
                        {loading ? (
                            <div className="spinner-dark" style={{ width: '40px', height: '40px', borderWidth: '4px', margin: '60px auto' }}></div>
                        ) : qrUrl ? (
                            <div className="qr-container-wa">
                                <div className="login-qr-placeholder">
                                    <QRCodeSVG value={qrUrl} size={264} level={"M"} includeMargin={true} />
                                </div>
                                <div className="checkbox-wrap-wa">
                                    <input type="checkbox" id="keepSignedIn" defaultChecked />
                                    <label htmlFor="keepSignedIn">Keep me signed in</label>
                                </div>
                                
                                <div className="divider-wa"><span>OR</span></div>
                                
                                <button 
                                    className="google-btn-wa" 
                                    onClick={handleGoogleLogin}
                                >
                                    <svg viewBox="0 0 24 24" width="20" height="20">
                                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"/>
                                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                                    </svg>
                                    Sign in with Google
                                </button>
                            </div>
                        ) : (
                            <div className="spinner-dark"></div>
                        )}
                        {error && <p className="error-text-wa">{error}</p>}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
