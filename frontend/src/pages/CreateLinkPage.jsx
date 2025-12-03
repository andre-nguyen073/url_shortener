import { useState } from 'react'
import { API_URL } from '../api'

export default function CreateLinkPage({ session, switchToAnalytics }) {
    const [urlInput, setUrlInput] = useState('')
    const [isCreating, setIsCreating] = useState(false)
    const [result, setResult] = useState(null)

    const createLink = async (e) => {
        e.preventDefault()
        if (!urlInput) return
        setIsCreating(true)
        setResult(null)

        try {
            const linkRes = await fetch(`${API_URL}/shorten_url`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ link: urlInput, user_id: session.user.id }),
            })
            const linkData = await linkRes.json()

            if (!linkRes.ok) throw new Error(linkData.detail)

            const qrRes = await fetch(`${API_URL}/create_qrcode`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ link: linkData.short_url })
            })
            const qrData = await qrRes.json()

            if (!qrRes.ok) throw new Error(qrData.detail || 'Failed to generate QR code')

            setResult({
                ...linkData,
                qrcode_base64: qrData.qrcode_base64
            })
            setUrlInput('')

        } catch (error) {
            alert('Error: ' + error.message)
        }
        setIsCreating(false)
    }

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text)
        alert('Copied to clipboard!')
    }

    return (
        <div className="page-container center-content">
            <div className="hero-section">
                <h1>Create a new connection</h1>
                <p>Paste your long URL below to generate a short link and QR code instantly.</p>
            </div>

            <div className="creation-card-large">
                <form onSubmit={createLink} className="create-form-stacked">
                    <div className="input-wrapper">
                        <input
                            type="url"
                            placeholder="https://example.com/your-long-link..."
                            value={urlInput}
                            onChange={(e) => setUrlInput(e.target.value)}
                            required
                            autoFocus
                            className="big-input"
                        />
                    </div>
                    <button type="submit" className="button primary large-btn full-width-btn" disabled={isCreating}>
                        {isCreating ? 'Generating...' : 'Shorten & Generate QR'}
                    </button>
                </form>
            </div>

            {result && (
                <div className="result-reveal fade-in">
                    <div className="result-card">
                        <div className="qr-preview">
                            <img src={`data:image/png;base64,${result.qrcode_base64}`} alt="QR Code" />
                            <button className="button secondary small" onClick={() => {
                                const link = document.createElement('a');
                                link.href = `data:image/png;base64,${result.qrcode_base64}`;
                                link.download = `qr-${result.short_hash}.png`;
                                link.click();
                            }}>Download PNG</button>
                        </div>

                        <div className="link-details">
                            <h3>Successfully Created! 🎉</h3>

                            <div className="detail-group">
                                <label>Short Link</label>
                                <div className="copy-row">
                                    <input type="text" readOnly value={result.short_url} className="highlight-result" />
                                    <button onClick={() => copyToClipboard(result.short_url)} className="button secondary icon-btn">📋</button>
                                </div>
                            </div>

                            <div className="detail-group">
                                <label>Original URL</label>
                                <div className="copy-row">
                                    <input type="text" readOnly value={result.original_url} className="muted-input" />
                                </div>
                            </div>

                            <div className="action-row">
                                <button onClick={() => switchToAnalytics()} className="link-button">View Analytics →</button>
                                <button onClick={() => setResult(null)} className="link-button">Create Another</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
