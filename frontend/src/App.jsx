import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

// ------------------------------------------------------------------
// REAL SUPABASE CLIENT (Active)
// Ensure your .env.local file has:
// VITE_SUPABASE_URL=...
// VITE_SUPABASE_ANON_KEY=...
// ------------------------------------------------------------------

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export default function App() {
  const [session, setSession] = useState(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [view, setView] = useState('login') // 'login', 'signup', 'forgot_password'
  const [message, setMessage] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleAuth = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    let result
    if (view === 'signup') {
      result = await supabase.auth.signUp({ email, password })
    } else {
      result = await supabase.auth.signInWithPassword({ email, password })
    }

    const { error, data } = result

    if (error) {
      setMessage(error.message)
    } else {
      if (view === 'signup') {
        if (data?.user && !data?.session) {
           setMessage('Account created! Please check your email to confirm.')
           setTimeout(() => setView('login'), 2000)
        } else {
           setMessage('Account created! Logging you in...')
        }
      } else if (data?.session) {
        setSession(data.session)
      }
    }
    setLoading(false)
  }

  const handlePasswordReset = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    })

    if (error) {
      setMessage(error.message)
    } else {
      setMessage('Password reset link sent! Check your email.')
    }
    setLoading(false)
  }

  const handleLogout = async () => {
    setLoading(true)
    await supabase.auth.signOut()
    setSession(null)
    setEmail('')
    setPassword('')
    setLoading(false)
  }

  const switchView = (newView) => {
    setView(newView)
    setMessage('')
  }

  // ------------------------------------------------------------------
  // LOGGED IN VIEW
  // ------------------------------------------------------------------
  if (session) {
    return (
      <div className="layout">
        <div className="visual-side">
           <div className="visual-content">
              <h1>🔗 QRLinx</h1>
              <p>Manage your links & QR codes with ease.</p>
           </div>
        </div>
        <div className="form-side">
          <div className="form-container">
            <h2 className="title">Welcome Back</h2>
            <p className="subtitle">Logged in as <strong style={{color: '#fff'}}>{session.user.email}</strong></p>
            <div style={{marginTop: '40px'}}>
               <button onClick={handleLogout} className="button secondary">
                {loading ? 'Signing out...' : 'Sign Out'}
              </button>
            </div>
          </div>
        </div>
        <StyleSheet />
      </div>
    )
  }

  // ------------------------------------------------------------------
  // AUTH FORMS
  // ------------------------------------------------------------------
  return (
    <div className="layout">
      
      {/* LEFT: BRANDING */}
      <div className="visual-side">
        <div className="visual-content">
          <h1>Shorten Links.<br/>Generate QRs.<br/>Track All.</h1>
          <p>The all-in-one platform for your digital connections.</p>
        </div>
        <div className="floating-shape"></div>
      </div>

      {/* RIGHT: FORM */}
      <div className="form-side">
        <div className="form-container">
          
          <div className="form-brand">
            🔗 QRLinx
          </div>

          <div className="header-section">
            <h2 className="title">
              {view === 'signup' && 'Create Account'}
              {view === 'login' && 'Welcome Back'}
              {view === 'forgot_password' && 'Reset Password'}
            </h2>
            <p className="subtitle">
              {view === 'signup' && "Get started for free in seconds."}
              {view === 'login' && "Enter your details to access your account."}
              {view === 'forgot_password' && "We'll email you instructions."}
            </p>
          </div>
          
          {message && (
            <div className={`alert ${message.includes('sent') || message.includes('created') ? 'success' : 'error'}`}>
              {message}
            </div>
          )}

          {view === 'forgot_password' ? (
            <form onSubmit={handlePasswordReset} className="form">
              <div className="input-group">
                <label htmlFor="email">Email Address</label>
                <input
                  id="email"
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <button type="submit" disabled={loading} className="button primary">
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
              <button type="button" onClick={() => switchView('login')} className="link-button back-link">
                 ← Back to Login
              </button>
            </form>
          ) : (
            <form onSubmit={handleAuth} className="form">
              <div className="input-group">
                <label htmlFor="email">Email Address</label>
                <input
                  id="email"
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              
              <div className="input-group">
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                {view === 'login' && (
                  <button type="button" onClick={() => switchView('forgot_password')} className="forgot-password">
                    Forgot password?
                  </button>
                )}
              </div>

              <button type="submit" disabled={loading} className="button primary">
                {loading ? 'Processing...' : (view === 'signup' ? 'Create Account' : 'Log In')}
              </button>
            </form>
          )}

          {view !== 'forgot_password' && (
            <div className="footer-text">
              <span className="text-muted">
                {view === 'signup' ? 'Already have an account?' : 'Don\'t have an account?'}
              </span>
              <button 
                type="button" 
                className="link-button" 
                onClick={() => switchView(view === 'login' ? 'signup' : 'login')}
              >
                {view === 'login' ? 'Sign up for free' : 'Log in'}
              </button>
            </div>
          )}
        </div>
      </div>
      <StyleSheet />
    </div>
  )
}

// ------------------------------------------------------------------
// CSS STYLES (Scaled Up)
// ------------------------------------------------------------------
const StyleSheet = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');

    :root {
      --bg-form: #111827; 
      --bg-visual: #1e1b4b;
      --text-main: #ffffff;
      --text-muted: #9ca3af;
      --input-bg: #1f2937;
      --input-border: #374151;
      --input-focus: #6366f1;
      --primary: #6366f1;
      --primary-hover: #4f46e5;
      --primary-text: #ffffff;
      --gradient-visual: linear-gradient(135deg, #4338ca 0%, #0e7490 100%);
    }

    body, html {
      margin: 0;
      padding: 0;
      height: 100%;
      font-family: 'Inter', sans-serif;
      overflow: hidden;
      background-color: var(--bg-form);
      -webkit-font-smoothing: antialiased;
    }

    .layout {
      display: flex;
      width: 100vw;
      height: 100vh;
    }

    /* --- LEFT SIDE --- */
    .visual-side {
      width: 50%;
      background: var(--gradient-visual);
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }

    .visual-side::before {
      content: "";
      position: absolute;
      top: 0; left: 0; width: 100%; height: 100%;
      background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
    }

    .floating-shape {
      position: absolute;
      width: 100%;
      height: 100%;
      background: radial-gradient(circle at top right, rgba(255,255,255,0.1), transparent 60%);
      pointer-events: none;
    }

    .visual-content {
      position: relative;
      z-index: 2;
      padding: 80px;
      color: white;
      text-align: left;
      max-width: 700px; /* Increased */
    }

    .visual-content h1 {
      font-size: 5.5rem; /* Large and bold */
      font-weight: 800;
      line-height: 1.1;
      margin-bottom: 30px;
      letter-spacing: -0.03em;
      text-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }

    .visual-content p {
      font-size: 1.75rem; /* Larger visual text */
      opacity: 0.9;
      line-height: 1.6;
      font-weight: 400;
    }

    /* --- RIGHT SIDE --- */
    .form-side {
      width: 50%;
      background-color: var(--bg-form);
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
    }

    .form-container {
      width: 100%;
      max-width: 600px; /* Increased Form Width */
      padding: 60px;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }

    .form-brand {
      font-size: 1.5rem; /* Larger Brand */
      font-weight: 700;
      color: var(--primary);
      margin-bottom: 40px;
      display: block;
      letter-spacing: -0.01em;
    }

    .header-section {
      margin-bottom: 48px;
      text-align: left;
    }

    .title {
      color: var(--text-main);
      font-size: 2.75rem; /* Much larger title */
      font-weight: 700;
      margin: 0 0 16px 0;
      letter-spacing: -0.02em;
    }

    .subtitle {
      color: var(--text-muted);
      font-size: 1.2rem; /* Larger subtitle */
      margin: 0;
      line-height: 1.6;
    }

    .form {
      display: flex;
      flex-direction: column;
      gap: 28px; /* More spacing */
    }

    .input-group {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    label {
      color: var(--text-main);
      font-size: 1.1rem; /* Larger labels */
      font-weight: 600;
    }

    input {
      background-color: var(--input-bg);
      border: 1px solid var(--input-border);
      border-radius: 12px;
      padding: 20px 24px; /* Big click area */
      color: white;
      font-size: 1.15rem; /* Larger input text */
      transition: all 0.2s ease;
    }

    input::placeholder {
      color: #6b7280;
    }

    input:focus {
      outline: none;
      border-color: var(--input-focus);
      background-color: #374151;
      box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.2);
    }

    .forgot-password {
      color: var(--text-muted);
      font-size: 1rem;
      text-decoration: none;
      align-self: flex-end;
      background: none;
      border: none;
      padding: 0;
      cursor: pointer;
      transition: color 0.2s;
    }
    
    .forgot-password:hover {
      color: var(--primary);
      text-decoration: underline;
    }

    .button {
      background: var(--primary);
      color: var(--primary-text);
      border: none;
      border-radius: 12px;
      font-size: 1.25rem; /* Larger button text */
      font-weight: 600;
      height: 64px; /* Big button height */
      cursor: pointer;
      transition: all 0.2s;
      width: 100%;
      margin-top: 16px;
    }

    .button:hover:not(:disabled) {
      background: var(--primary-hover);
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
    }
    
    .button:active:not(:disabled) {
      transform: translateY(0);
    }
    
    .button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .button.secondary {
      background: transparent;
      border: 2px solid var(--input-border);
      color: var(--text-main);
    }
    
    .button.secondary:hover {
      border-color: var(--text-main);
      background: rgba(255,255,255,0.05);
    }

    .footer-text {
      margin-top: 40px;
      font-size: 1.1rem; /* Larger footer text */
      color: var(--text-muted);
      display: flex;
      gap: 8px;
      justify-content: center;
    }

    .link-button {
      background: none;
      border: none;
      color: var(--primary);
      cursor: pointer;
      font-size: 1.1rem;
      font-weight: 600;
      padding: 0;
      text-decoration: none;
      transition: color 0.2s;
    }
    
    .link-button:hover {
      color: var(--primary-hover);
      text-decoration: underline;
    }
    
    .back-link {
      width: auto;
      margin-top: 20px;
      display: block;
      margin-left: auto;
      margin-right: auto;
      text-decoration: none;
    }

    .alert {
      padding: 16px;
      border-radius: 8px;
      font-size: 1rem;
      margin-bottom: 24px;
    }
    
    .alert.error {
      background: rgba(220, 38, 38, 0.2);
      color: #fca5a5;
      border: 1px solid rgba(220, 38, 38, 0.3);
    }

    .alert.success {
      background: rgba(16, 185, 129, 0.2);
      color: #6ee7b7;
      border: 1px solid rgba(16, 185, 129, 0.3);
    }

    /* RESPONSIVE */
    @media (max-width: 1000px) {
      .visual-side {
        display: none;
      }
      .form-side {
        width: 100%;
      }
      .form-brand {
        text-align: center;
      }
      .header-section {
        text-align: center;
      }
    }
  `}</style>
)