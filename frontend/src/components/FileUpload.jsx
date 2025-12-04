import { Upload, FileText, X } from 'lucide-react';
import { useCallback, useState } from 'react';

export default function FileUpload({ file, setFile }) {
    const [isDragging, setIsDragging] = useState(false);

    const onDrop = useCallback((e) => {
        e.preventDefault();
        setIsDragging(false);
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile && (droppedFile.name.endsWith('.csv') || droppedFile.name.endsWith('.xlsx') || droppedFile.name.endsWith('.xls'))) {
            setFile(droppedFile);
        }
    }, [setFile]);

    const onDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const onDragLeave = (e) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleFileSelect = (e) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const formatFileSize = (bytes) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    if (file) {
        return (
            <div style={{
                padding: 'var(--space-l)',
                border: '2px solid rgba(10, 132, 255, 0.25)',
                backgroundColor: 'rgba(10, 132, 255, 0.08)',
                borderRadius: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-m)',
                backdropFilter: 'blur(10px)'
            }}>
                <div style={{
                    padding: 'var(--space-m)',
                    backgroundColor: 'rgba(10, 132, 255, 0.15)',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    border: '1px solid rgba(10, 132, 255, 0.2)'
                }}>
                    <FileText size={24} style={{ color: 'var(--accent-primary)' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                        fontWeight: 600,
                        fontSize: 'var(--font-size-base)',
                        color: 'var(--text-primary)',
                        margin: 0,
                        marginBottom: 'var(--space-xs)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                    }}>
                        {file.name}
                    </p>
                    <p style={{
                        fontSize: 'var(--font-size-sm)',
                        color: 'var(--text-secondary)',
                        margin: 0
                    }}>
                        {formatFileSize(file.size)}
                    </p>
                </div>
                <button
                    onClick={() => setFile(null)}
                    style={{
                        padding: 'var(--space-s)',
                        background: 'transparent',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--text-secondary)',
                        transition: 'background-color var(--transition-fast), color var(--transition-fast)',
                        flexShrink: 0
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                        e.currentTarget.style.color = 'var(--text-primary)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = 'var(--text-secondary)';
                    }}
                    aria-label="Remove file"
                >
                    <X size={20} />
                </button>
            </div>
        );
    }

    return (
        <div
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            style={{
                border: `2px dashed ${isDragging ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                borderRadius: '16px',
                padding: 'var(--space-xxl)',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all var(--transition-base)',
                backgroundColor: isDragging ? 'rgba(10, 132, 255, 0.08)' : 'transparent',
                backdropFilter: 'blur(10px)'
            }}
        >
            <input
                type="file"
                id="file-upload"
                style={{ display: 'none' }}
                accept=".csv,.xlsx,.xls"
                onChange={handleFileSelect}
            />
            <label
                htmlFor="file-upload"
                style={{
                    cursor: 'pointer',
                    display: 'block',
                    width: '100%',
                    height: '100%'
                }}
            >
                <div style={{
                    width: '64px',
                    height: '64px',
                    backgroundColor: 'var(--bg-tertiary)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto var(--space-m)',
                    transition: 'transform var(--transition-base)',
                    transform: isDragging ? 'scale(1.1)' : 'scale(1)'
                }}>
                    <Upload size={32} style={{ color: 'var(--accent-primary)' }} />
                </div>
                <h3 style={{
                    fontSize: 'var(--font-size-lg)',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    marginBottom: 'var(--space-s)',
                    margin: 0,
                    marginBottom: 'var(--space-s)'
                }}>
                    Drop your spotlist here
                </h3>
                <p style={{
                    fontSize: 'var(--font-size-sm)',
                    color: 'var(--text-secondary)',
                    margin: 0,
                    marginBottom: 'var(--space-xs)'
                }}>
                    or click to browse
                </p>
                <p style={{
                    fontSize: 'var(--font-size-xs)',
                    color: 'var(--text-tertiary)',
                    margin: 0
                }}>
                    Accepted: .csv, .xlsx, .xls (max 10MB)
                </p>
            </label>
        </div>
    );
}
