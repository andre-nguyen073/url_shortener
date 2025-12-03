import { useState, useEffect } from 'react'
import { supabase, API_URL } from '../api'

export default function AnalyticsDashboardPage({ session }) {
  const [links, setLinks] = useState([])
  const [selectedLink, setSelectedLink] = useState(null)
  const [analytics, setAnalytics] = useState(null)
  const [loadingMetrics, setLoadingMetrics] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchLinks()
  }, [session])

  const fetchLinks = async () => {
    const { data, error } = await supabase
      .from('links')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
    
    if (!error) {
        setLinks(data || [])
    }
  }

  const deleteLink = async (e, linkId) => {
    e.stopPropagation() // Prevent triggering selection
    if (!confirm('Are you sure you want to delete this link? This action cannot be undone.')) return

    const { error } = await supabase
        .from('links')
        .delete()
        .eq('id', linkId)
    
    if (!error) {
        // Remove from local state
        setLinks(links.filter(l => l.id !== linkId))
        // If deleting selected link, clear selection
        if (selectedLink?.id === linkId) {
            setSelectedLink(null)
            setAnalytics(null)
        }
    } else {
        alert('Failed to delete link')
    }
  }

  const fetchAnalytics = async (link) => {
    setSelectedLink(link)
    setAnalytics(null)
    setLoadingMetrics(true)

    const query = `
      query GetAnalytics($shortHash: String!) {
        analytics(shortHash: $shortHash) {
          totalClicks
          uniqueClicks
          deviceBreakdown
          browserBreakdown
          countryBreakdown
          clicks {
            createdAt
            ipAddress
            country
            city
            referrer
            deviceType
          }
        }
      }
    `

    try {
      const res = await fetch(`${API_URL}/graphql`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            query,
            variables: { shortHash: link.short_hash }
        })
      })
      
      const { data, errors } = await res.json()
      
      if (errors) {
          console.error(errors)
          setAnalytics(null)
      } else if (data && data.analytics) {
          // Process Timeline
          const clicks = data.analytics.clicks || [];
          const clicksByDate = {};
          clicks.forEach(c => {
              const date = new Date(c.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
              clicksByDate[date] = (clicksByDate[date] || 0) + 1;
          });

          // Recent Activity Log (Last 10)
          const recentActivity = clicks
            .sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 10);

          const parsedAnalytics = {
              total_clicks: data.analytics.totalClicks,
              unique_clicks: data.analytics.uniqueClicks,
              device_type: JSON.parse(data.analytics.deviceBreakdown),
              browser: JSON.parse(data.analytics.browserBreakdown),
              country: JSON.parse(data.analytics.countryBreakdown),
              timeline: clicksByDate,
              recent_activity: recentActivity
          }
          setAnalytics(parsedAnalytics)
      }
    } catch (e) {
      console.error(e)
    }
    setLoadingMetrics(false)
  }

  // Sort links by Original URL Hostname for clarity
  const getHostname = (url) => {
      try { return new URL(url).hostname } catch { return url }
  }

  const filteredLinks = links
    .filter(l => l.original_url.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => getHostname(a.original_url).localeCompare(getHostname(b.original_url)));

  return (
    <div className="dashboard-container">
        {/* SIDEBAR */}
        <div className="links-sidebar">
            <div className="sidebar-header">
                <h3>Your Links</h3>
                <div className="search-wrapper">
                    <span className="search-icon">🔍</span>
                    <input 
                        type="text" 
                        placeholder="Search links..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>
            <div className="links-list-content">
                {filteredLinks.length === 0 ? (
                    <div className="no-links">No links found</div>
                ) : (
                    filteredLinks.map(link => (
                        <div 
                            key={link.id} 
                            className={`sidebar-link-item ${selectedLink?.id === link.id ? 'selected' : ''}`}
                            onClick={() => fetchAnalytics(link)}
                        >
                            <div className="link-item-content">
                                <div className="link-item-main">
                                    <span className="link-title">{getHostname(link.original_url)}</span>
                                    <span className="link-sub">/{link.short_hash}</span>
                                </div>
                                <div className="link-item-url" title={link.original_url}>
                                    {link.original_url}
                                </div>
                            </div>
                            <button 
                                className="delete-btn" 
                                onClick={(e) => deleteLink(e, link.id)}
                                title="Delete Link"
                            >
                                🗑
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>

        {/* MAIN CONTENT */}
        <div className="analytics-main">
            {selectedLink ? (
                <div className="analytics-content fade-in">
                    <div className="analytics-header-bar">
                        <div className="header-info">
                            <h1>{getHostname(selectedLink.original_url)}</h1>
                            <div className="header-sub">
                                <span className="full-url">{selectedLink.original_url}</span>
                            </div>
                        </div>
                        <div className="header-actions-column">
                            <div className="short-link-display">
                                <span className="hash-val">/{selectedLink.short_hash}</span>
                            </div>
                            <a href={`${API_URL}/${selectedLink.short_hash}`} target="_blank" rel="noreferrer" className="visit-btn">
                                Open Link ↗
                            </a>
                        </div>
                    </div>

                    {loadingMetrics ? (
                        <div className="loading-skeleton">
                            <div className="sk-card"></div>
                            <div className="sk-graph"></div>
                        </div>
                    ) : analytics ? (
                        <div className="metrics-body">
                            {/* 1. OVERVIEW CARDS */}
                            <div className="kpi-grid">
                                <div className="kpi-card">
                                    <div className="kpi-label">Total Clicks</div>
                                    <div className="kpi-value">{analytics.total_clicks}</div>
                                </div>
                                <div className="kpi-card">
                                    <div className="kpi-label">Unique Visitors</div>
                                    <div className="kpi-value">{analytics.unique_clicks}</div>
                                </div>
                                <div className="kpi-card">
                                    <div className="kpi-label">Top Location</div>
                                    <div className="kpi-value text-sm">
                                        {Object.entries(analytics.country).sort((a,b) => b[1] - a[1])[0]?.[0] || '-'}
                                    </div>
                                </div>
                            </div>

                            {/* 2. TIMELINE GRAPH */}
                            <div className="section-container">
                                <h4>Traffic Trend</h4>
                                <TimelineChart data={analytics.timeline} />
                            </div>

                            {/* 3. DETAILED LOG TABLE (Admin View) */}
                            <div className="section-container">
                                <h4>Recent Activity Log</h4>
                                <div className="table-wrapper">
                                    <table className="data-table">
                                        <thead>
                                            <tr>
                                                <th>Time</th>
                                                <th>Location</th>
                                                <th>Device</th>
                                                <th>Referrer</th>
                                                <th>IP Address</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {analytics.recent_activity.length === 0 && (
                                                <tr><td colSpan="5" className="text-center">No recent clicks</td></tr>
                                            )}
                                            {analytics.recent_activity.map((click, i) => (
                                                <tr key={i}>
                                                    <td>{new Date(click.createdAt).toLocaleString()}</td>
                                                    <td>{click.city || '-'}, {click.country || 'Unknown'}</td>
                                                    <td>{click.deviceType}</td>
                                                    <td>{click.referrer ? new URL(click.referrer).hostname : 'Direct'}</td>
                                                    <td className="mono">{click.ipAddress}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* 4. BREAKDOWNS */}
                            <div className="charts-grid">
                                <div className="chart-panel">
                                    <h4>Browsers</h4>
                                    <BarList data={analytics.browser} total={analytics.total_clicks} />
                                </div>
                                <div className="chart-panel">
                                    <h4>Devices</h4>
                                    <BarList data={analytics.device_type} total={analytics.total_clicks} />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="error-state">Unable to load data</div>
                    )}
                </div>
            ) : (
                <div className="empty-dashboard">
                    <div className="empty-icon">📊</div>
                    <h2>Select a link to analyze</h2>
                    <p>Select a URL from the sidebar to view detailed metrics and logs.</p>
                </div>
            )}
        </div>
    </div>
  )
}

function BarList({ data, total }) {
    const items = Object.entries(data).sort((a,b) => b[1] - a[1]);
    if (items.length === 0) return <p className="no-data">No data yet</p>

    return (
        <div className="bar-list">
            {items.map(([label, count]) => (
                <div key={label} className="bar-item">
                    <div className="bar-info">
                        <span className="bar-label">{label === 'None' ? 'Unknown' : label}</span>
                        <span className="bar-count">{count} ({Math.round((count/total)*100)}%)</span>
                    </div>
                    <div className="progress-bg">
                        <div className="progress-fill" style={{width: `${(count/total)*100}%`}}></div>
                    </div>
                </div>
            ))}
        </div>
    )
}

function TimelineChart({ data }) {
    const dates = Object.keys(data).sort((a,b) => new Date(a) - new Date(b));
    if (dates.length === 0) return <div className="no-data-chart">No activity recorded yet</div>
    
    const max = Math.max(...Object.values(data));

    return (
        <div className="timeline-wrapper">
            {dates.map(date => (
                <div key={date} className="timeline-col">
                    <div className="timeline-bar-track">
                        <div 
                            className="timeline-bar-fill" 
                            style={{height: `${(data[date] / max) * 100}%`}}
                            title={`${date}: ${data[date]} clicks`}
                        ></div>
                    </div>
                    <span className="timeline-date">{date}</span>
                </div>
            ))}
        </div>
    )
}
