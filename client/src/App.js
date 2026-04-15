import axios from "axios";
import { useMemo, useState } from "react";

function resolveApiBaseUrl() {
  if (process.env.REACT_APP_API_BASE_URL) {
    return process.env.REACT_APP_API_BASE_URL;
  }

  const hostname = window.location.hostname || "localhost";
  return `http://${hostname}:5000`;
}

function formatBytes(bytes) {
  if (!bytes) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size.toFixed(size >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function fallbackCopyText(text) {
  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.setAttribute("readonly", "");
  textArea.style.position = "fixed";
  textArea.style.left = "-9999px";
  document.body.appendChild(textArea);
  textArea.select();

  const didCopy = document.execCommand("copy");
  document.body.removeChild(textArea);
  return didCopy;
}

function getFileExtension(filename = "") {
  const parts = filename.split(".");
  if (parts.length < 2) {
    return "FILE";
  }

  return parts.pop().toUpperCase();
}

function formatShareLink(url) {
  if (!url) {
    return "";
  }

  try {
    const parsedUrl = new URL(url);
    return `${parsedUrl.origin}${parsedUrl.pathname}`;
  } catch (_error) {
    return url;
  }
}

export default function App() {
  const apiBaseUrl = useMemo(resolveApiBaseUrl, []);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState("");
  const [error, setError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [copyState, setCopyState] = useState("Copy link");
  const shareLink = formatShareLink(downloadUrl);
  const fileExtension = getFileExtension(selectedFile?.name);

  const handleFileSelection = (file) => {
    if (!file) {
      return;
    }

    setSelectedFile(file);
    setDownloadUrl("");
    setError("");
    setUploadProgress(0);
    setCopyState("Copy link");
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    handleFileSelection(event.dataTransfer.files[0]);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError("Choose a file before uploading.");
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);

    setIsUploading(true);
    setError("");
    setDownloadUrl("");
    setCopyState("Copy link");

    try {
      const response = await axios.post(`${apiBaseUrl}/upload`, formData, {
        headers: {
          "Content-Type": "multipart/form-data"
        },
        onUploadProgress: (event) => {
          if (!event.total) {
            return;
          }

          const percent = Math.round((event.loaded * 100) / event.total);
          setUploadProgress(percent);
        }
      });

      setDownloadUrl(response.data.downloadUrl);
      setUploadProgress(100);
    } catch (uploadError) {
      const message =
        uploadError.response?.data?.error ||
        "Upload failed. Please try again.";
      setError(message);
      setUploadProgress(0);
    } finally {
      setIsUploading(false);
    }
  };

  const handleCopyLink = async () => {
    if (!downloadUrl) {
      return;
    }

    try {
      if (navigator.clipboard?.writeText && window.isSecureContext) {
        await navigator.clipboard.writeText(downloadUrl);
      } else {
        const didCopy = fallbackCopyText(downloadUrl);

        if (!didCopy) {
          throw new Error("Fallback copy failed");
        }
      }

      setCopyState("Copied");
    } catch (_error) {
      setCopyState("Copy failed");
    }
  };

  return (
    <main className="app-shell">
      <header className="page-header">
        <div className="brand">
          <div className="brand-mark">S</div>
          <div>
            <p className="brand-name">Sharelane</p>
            <span className="brand-tag">Local file delivery</span>
          </div>
        </div>

        <nav className="nav-links">
          <a href="#upload">Upload</a>
          <a href="#features">Features</a>
          <a href="#steps">How it works</a>
        </nav>
      </header>

      <section className="hero-panel">
        <section className="hero-copy">
          <p className="eyebrow">Secure local sharing</p>
          <h1>File transfers that feel like a polished product.</h1>
          <p className="intro">
            Share files inside your network with a sleek upload experience, clear status,
            and one-click sharing that looks and feels production-ready.
          </p>

          <div className="hero-highlights">
            <div className="highlight-card">
              <span className="highlight-value">100% Local</span>
              <span className="highlight-label">No cloud dependencies, no extra steps.</span>
            </div>
            <div className="highlight-card">
              <span className="highlight-value">Instant Link</span>
              <span className="highlight-label">Copy and send in seconds.</span>
            </div>
            <div className="highlight-card">
              <span className="highlight-value">Minimal UI</span>
              <span className="highlight-label">Fast access for every user.</span>
            </div>
          </div>
        </section>

        <section className="card upload-card" id="upload">
          <div className="card-header">
            <div>
              <p className="panel-label">Upload console</p>
              <h2>Share a file</h2>
            </div>
            <span className="status-pill">Live</span>
          </div>

          <div
            className={`dropzone ${isDragging ? "dragging" : ""} ${
              selectedFile ? "has-file" : ""
            }`}
            onDragEnter={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={(event) => {
              event.preventDefault();
              setIsDragging(false);
            }}
            onDrop={handleDrop}
          >
            <input
              id="file-input"
              className="file-input"
              type="file"
              onChange={(event) => handleFileSelection(event.target.files?.[0])}
            />
            <label htmlFor="file-input" className="dropzone-content">
              <span className="dropzone-badge">{selectedFile ? fileExtension : "DROP"}</span>
              <span className="dropzone-title">
                {selectedFile ? selectedFile.name : "Drag and drop a file here"}
              </span>
              <span className="dropzone-subtitle">
                {selectedFile
                  ? `${formatBytes(selectedFile.size)} ready to upload`
                  : "or click to browse from your device"}
              </span>
            </label>
          </div>

          <div className="file-meta">
            <div className="meta-item">
              <span className="meta-label">Selected file</span>
              <span className="meta-value">
                {selectedFile ? selectedFile.name : "Nothing selected yet"}
              </span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Size</span>
              <span className="meta-value">
                {selectedFile ? formatBytes(selectedFile.size) : "0 B"}
              </span>
            </div>
          </div>

          <button className="upload-button" onClick={handleUpload} disabled={isUploading}>
            {isUploading ? "Uploading..." : "Upload file"}
          </button>

          {(isUploading || uploadProgress > 0) && (
            <div className="progress-block" aria-live="polite">
              <div className="progress-label">
                <span>Upload progress</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="progress-bar">
                <div className="progress-value" style={{ width: `${uploadProgress}%` }} />
              </div>
            </div>
          )}

          {error && <p className="status error">{error}</p>}

          {downloadUrl && (
            <div className="result">
              <div className="result-heading">
                <p className="status success">File uploaded successfully.</p>
                <span className="result-tag">Ready to share</span>
              </div>
              <a href={downloadUrl} target="_blank" rel="noreferrer">
                {shareLink}
              </a>
              <div className="result-actions">
                <button className="copy-button" onClick={handleCopyLink}>
                  {copyState}
                </button>
                <a
                  className="secondary-link"
                  href={downloadUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open link
                </a>
              </div>
            </div>
          )}

          <div className="trust-row">
            <div className="trust-item">
              <span className="trust-title">Fast handoff</span>
              <span className="trust-copy">Generate a clean link in seconds.</span>
            </div>
            <div className="trust-item">
              <span className="trust-title">No clutter</span>
              <span className="trust-copy">A focused upload flow that stays simple.</span>
            </div>
          </div>
        </section>
      </section>

      <section className="feature-strip" id="features">
        <div className="feature-card">
          <h3>Enterprise polish</h3>
          <p>Professional layout, high-contrast details, and a credible visual design.</p>
        </div>
        <div className="feature-card">
          <h3>Fast handoff</h3>
          <p>Users reach a clean share URL with minimal clicks and clear feedback.</p>
        </div>
        <div className="feature-card">
          <h3>Trusted inside teams</h3>
          <p>Purpose-built for LAN usage, with a no-nonsense UI and strong visual hierarchy.</p>
        </div>
      </section>

      <section className="info-strip" id="steps">
        <div className="info-card">
          <span className="info-index">01</span>
          <h3>Select a file</h3>
          <p>Drop any document, archive, image, or build artifact into the uploader.</p>
        </div>
        <div className="info-card">
          <span className="info-index">02</span>
          <h3>Upload instantly</h3>
          <p>Track progress in real time while your file is moved over the network.</p>
        </div>
        <div className="info-card">
          <span className="info-index">03</span>
          <h3>Share the link</h3>
          <p>Copy the generated URL and send it to anyone on the same network.</p>
        </div>
      </section>
    </main>
  );
}
