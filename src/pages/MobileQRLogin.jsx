import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { doc, setDoc } from 'firebase/firestore';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { db, auth, googleProvider } from '../services/firebase';
import './Login.css';

const MobileQRLogin = () => {
    const [searchParams] = useSearchParams();
    const session = searchParams.get('session');
    const navigate = useNavigate();
    
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        if (!session) {
            setError('Invalid QR Code. No session found.');
        }
    }, [session]);

    const handleMobileLogin = async () => {
        if (!session) return;
        setLoading(true);
        setError('');
        try {
            const result = await signInWithPopup(auth, googleProvider);
            const credential = GoogleAuthProvider.credentialFromResult(result);
            const idToken = credential.idToken;

            if (idToken) {
                // Write the token to Firestore so the desktop can pick it up
                await setDoc(doc(db, "qr_sessions", session), {
                    idToken: idToken,
                    timestamp: new Date().getTime()
                });
                setSuccess(true);
            } else {
                setError('Failed to securely grab login credential.');
            }
        } catch (err) {
            console.error(err);
            setError('Error: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-wrapper" style={{ padding: '20px', alignItems: 'center' }}>
            <div className="login-top-bar" style={{ height: '100px' }}></div>
            
            <div className="login-card" style={{ maxWidth: '400px', minHeight: 'auto', padding: '30px', margin: '40px 0 0 0', textAlign: 'center' }}>
                <img src="/iconr.png" alt="Logo" style={{ width: '60px', height: '60px', borderRadius: '12px', margin: '0 auto 20px' }} />
                
                {success ? (
                    <div>
                        <h2 style={{ color: '#00a884', marginBottom: '15px' }}>Successfully Linked!</h2>
                        <p style={{ color: '#54656f', fontSize: '15px', lineHeight: '1.5' }}>
                            Your computer is now logged in. You can close this page and start chatting on your desktop!
                        </p>
                        <button 
                            className="google-btn-wa" 
                            style={{ margin: '30px auto 0', background: '#f0f2f5' }}
                            onClick={() => navigate('/')}
                        >
                            Go to Web Dashboard
                        </button>
                    </div>
                ) : (
                    <div>
                        <h2 style={{ color: '#111b21', marginBottom: '15px', fontWeight: 500 }}>Link this Device</h2>
                        <p style={{ color: '#54656f', fontSize: '15px', marginBottom: '30px', lineHeight: '1.5' }}>
                            You just scanned a QR code to link your computer. Sign in with Google to complete the linking process.
                        </p>

                        <button 
                            className="google-btn-wa" 
                            style={{ margin: '0 auto', maxWidth: '100%' }}
                            onClick={handleMobileLogin}
                            disabled={loading || !session}
                        >
                            {loading ? (
                                <div className="spinner-dark"></div>
                            ) : (
                                <>
                                    <svg viewBox="0 0 24 24" width="20" height="20">
                                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"/>
                                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                                    </svg>
                                    Sign in with Google
                                </>
                            )}
                        </button>
                        {error && <p className="error-text-wa" style={{marginTop: '20px'}}>{error}</p>}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MobileQRLogin;
