import React from 'react'

// Simple SVG Icons
const PlusIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
)

const ChartIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
)

const LinkIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
)

const LogoutIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
)

export default function Layout({ session, handleLogout, currentView, setView, children }) {
  return (
    <div className="layout dashboard-layout">
      {/* NEW COMPACT SIDEBAR */}
      <div className="mini-sidebar">
        <div className="mini-brand">
          <LinkIcon />
        </div>

        <div className="mini-nav">
          <button
            className={`mini-nav-item ${currentView === 'create' ? 'active' : ''}`}
            onClick={() => setView('create')}
            title="Create New Link"
          >
            <PlusIcon />
          </button>
          <button
            className={`mini-nav-item ${currentView === 'analytics' ? 'active' : ''}`}
            onClick={() => setView('analytics')}
            title="Dashboard"
          >
            <ChartIcon />
          </button>
        </div>

        <div className="mini-profile">
          <div className="avatar-mini">{session.user.email[0].toUpperCase()}</div>
          <button onClick={handleLogout} className="logout-mini" title="Sign Out">
            <LogoutIcon />
          </button>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="main-content">
        <div className="content-container">
          {children}
        </div>
      </div>
    </div>
  )
}
