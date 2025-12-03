import { useState, useEffect } from 'react'
import { supabase } from './api'
import AuthPage from './pages/AuthPage'
import CreateLinkPage from './pages/CreateLinkPage'
import AnalyticsDashboardPage from './pages/AnalyticsDashboardPage'
import Layout from './components/Layout'
import './App.css'

function App() {
  const [session, setSession] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [currentView, setCurrentView] = useState('create') // 'create' | 'analytics'

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setIsLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setIsLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setSession(null)
  }

  if (isLoading) {
    return <div className="layout center-all"><div className="spinner"></div></div>
  }

  if (!session) {
    return <AuthPage onLogin={setSession} />
  }

  return (
    <Layout 
        session={session} 
        handleLogout={handleLogout} 
        currentView={currentView} 
        setView={setCurrentView}
    >
        {currentView === 'create' && (
            <CreateLinkPage 
                session={session} 
                switchToAnalytics={() => setCurrentView('analytics')} 
            />
        )}
        {currentView === 'analytics' && (
            <AnalyticsDashboardPage session={session} />
        )}
    </Layout>
  )
}

export default App
