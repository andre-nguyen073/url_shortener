import { useState, useEffect } from 'react'
import { supabase, API_URL } from '../api'

export default function Dashboard({ session, handleLogout }) {
  const [links, setLinks] = useState([])
  const [urlInput, setUrlInput] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [selectedLink, setSelectedLink] = useState(null)
  const [analytics, setAnalytics] = useState(null)
  const [qrCode, setQrCode] = useState(null)

  // Fetch User's Links on Load
  useEffect(() => {
    if (session?.user?.id) {
      fetchLinks()
    }
  }, [session])

  const fetchLinks = async () => {
    const { data, error } = await supabase
      .from('links')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
    
    if (!error) setLinks(data || [])
  }

  const createLink = async (e) => {
    e.preventDefault()
    if (!urlInput) return
    setIsCreating(true)
    
    try {
      const response = await fetch(`${API_URL}/shorten_url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ link: urlInput, user_id: session.user.id }),
      })
      const data = await response.json()
      
      if (response.ok) {
        setUrlInput('')
        fetchLinks() // Refresh list
      } else {
        alert('Error creating link: ' + (data.detail || 'Unknown error'))
      }
    } catch (error) {
      console.error(error)
      alert('Network error')
    }
    setIsCreating(false)
  }

  const fetchAnalytics = async (link) => {
    setSelectedLink(link)
    setAnalytics(null) // Reset while loading
    setQrCode(null)

    // Get Analytics
    try {
      const res = await fetch(`${API_URL}/analytics/${link.short_hash}`)
      if (res.ok) {
        setAnalytics(await res.json())
      }
    } catch (e) {
      console.error(e)
    }

    // Get QR Code
    try {
        const res = await fetch(`${API_URL}/create_qrcode`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ link: `${API_URL}/${link.short_hash}` })
        })
        if (res.ok) {
            const data = await res.json()
            setQrCode(data.qrcode_base64)
        }
    } catch (e) {
        console.error(e)
    }
  }

  return (
    <div className="layout dashboard-layout">
      <div className="sidebar">
        <div className="brand">🔗 QRLinx</div>
        <div className="user-info">
            <div className="avatar">{session.user.email[0].toUpperCase()}</div>
            <div className="email">{session.user.email}</div>
        </div>
        <button onClick={handleLogout} className="button secondary small">Sign Out</button>
      </div>

      <div className="main-content">
        <div className="content-container">
            
            {/* CREATE LINK SECTION */}
            <div className="card create-card">
                <h2>Create New Link</h2>
                <form onSubmit={createLink} className="create-form">
                    <input 
                        type="url" 
                        placeholder="Paste your long URL here (https://...)" 
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        required
                    />
                    <button type="submit" className="button primary" disabled={isCreating}>
                        {isCreating ? 'Shortening...' : 'Shorten URL'}
                    </button>
                </form>
            </div>

            <div className="split-view">
                {/* LINKS LIST */}
                <div className="links-list">
                    <h3>Your Links</h3>
                    {links.length === 0 && <p className="text-muted">No links yet. Create one above!</p>}
                    {links.map(link => (
                        <div 
                            key={link.id} 
                            className={`link-item ${selectedLink?.id === link.id ? 'active' : ''}`}
                            onClick={() => fetchAnalytics(link)}
                        >
                            <div className="link-info">
                                <div className="short-url">/{link.short_hash}</div>
                                <div className="original-url">{link.original_url}</div>
                            </div>
                            <div className="arrow">→</div>
                        </div>
                    ))}
                </div>

                {/* ANALYTICS PANEL */}
                <div className="analytics-panel">
                    {selectedLink ? (
                        <>
                            <div className="analytics-header">
                                <h2>Analytics for /{selectedLink.short_hash}</h2>
                                <div className="links-actions">
                                    <a href={`${API_URL}/${selectedLink.short_hash}`} target="_blank" rel="noreferrer" className="visit-link">
                                        Visit Link ↗
                                    </a>
                                </div>
                            </div>

                            {qrCode && (
                                <div className="qr-section">
                                    <img src={`data:image/png;base64,${qrCode}`} alt="QR Code" />
                                    <p>Scan to visit</p>
                                </div>
                            )}

                            {analytics ? (
                                <div className="metrics-grid">
                                    <div className="metric-card">
                                        <div className="metric-value">{analytics.total_clicks}</div>
                                        <div className="metric-label">Total Clicks</div>
                                    </div>
                                    <div className="metric-card">
                                        <div className="metric-value">{analytics.unique_clicks}</div>
                                        <div className="metric-label">Unique Clicks</div>
                                    </div>
                                    
                                    {/* Device Types */}
                                    <div className="metric-card full-width">
                                        <h4>Device Types</h4>
                                        <div className="bar-chart">
                                            {Object.entries(analytics.device_type).map(([key, val]) => (
                                                <div key={key} className="bar-row">
                                                    <span>{key}</span>
                                                    <div className="bar-container">
                                                        <div className="bar-fill" style={{width: `${(val / analytics.total_clicks) * 100}%`}}></div>
                                                    </div>
                                                    <span>{val}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Browser */}
                                    <div className="metric-card full-width">
                                        <h4>Browsers</h4>
                                        <div className="bar-chart">
                                            {Object.entries(analytics.browser).map(([key, val]) => (
                                                <div key={key} className="bar-row">
                                                    <span>{key}</span>
                                                    <div className="bar-container">
                                                        <div className="bar-fill" style={{width: `${(val / analytics.total_clicks) * 100}%`}}></div>
                                                    </div>
                                                    <span>{val}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Countries */}
                                    <div className="metric-card full-width">
                                        <h4>Locations</h4>
                                        <div className="bar-chart">
                                            {Object.entries(analytics.country).map(([key, val]) => (
                                                <div key={key} className="bar-row">
                                                    <span>{key === 'None' ? 'Unknown' : key}</span>
                                                    <div className="bar-container">
                                                        <div className="bar-fill" style={{width: `${(val / analytics.total_clicks) * 100}%`}}></div>
                                                    </div>
                                                    <span>{val}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="loading">Loading metrics...</div>
                            )}
                        </>
                    ) : (
                        <div className="empty-state">
                            Select a link to view details and analytics.
                        </div>
                    )}
                </div>
            </div>
        </div>
      </div>
    </div>
  )
}

