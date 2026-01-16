import React, { useState } from 'react';
import { CATEGORIES } from '../data/mockContent';
import './Admin.css';

const AdminPage: React.FC = () => {
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        type: 'game',
        category: 'math',
        subjects: '',
        gradeLevels: [] as string[],
        customHtmlPath: '',
        downloadUrl: '',
        externalUrl: '',
        thumbnail: ''
    });

    const [status, setStatus] = useState<{ msg: string, type: 'success' | 'error' } | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Bulk Upload State
    const [activeTab, setActiveTab] = useState<'single' | 'bulk'>('single');
    const [bulkFiles, setBulkFiles] = useState<FileList | null>(null);
    const [bulkCategory, setBulkCategory] = useState('math');

    const GRADES = ['K', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'];

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleCheckboxChange = (grade: string) => {
        setFormData(prev => {
            const levels = prev.gradeLevels.includes(grade)
                ? prev.gradeLevels.filter(g => g !== grade)
                : [...prev.gradeLevels, grade];
            return { ...prev, gradeLevels: levels };
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setStatus(null);

        // Construct the ContentItem object
        const newItem = {
            id: `${formData.category}-${Date.now()}`,
            title: formData.title,
            description: formData.description,
            type: formData.type,
            category: formData.category,
            subjects: formData.subjects.split(',').map(s => s.trim()).filter(Boolean),
            gradeLevels: formData.gradeLevels.length > 0 ? formData.gradeLevels : ['All'],
            dateAdded: new Date().toISOString().split('T')[0],
            // Optional fields
            ...(formData.customHtmlPath && { customHtmlPath: formData.customHtmlPath }),
            ...(formData.downloadUrl && { downloadUrl: formData.downloadUrl }),
            ...(formData.externalUrl && { externalUrl: formData.externalUrl }),
            ...(formData.thumbnail && { thumbnail: formData.thumbnail }),
        };

        try {
            const response = await fetch('/api/save-content', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    category: formData.category,
                    item: newItem
                }),
            });

            if (response.ok) {
                setStatus({ msg: 'Content saved successfully! The app will reload shortly.', type: 'success' });
                // Reset form
                setFormData({
                    title: '',
                    description: '',
                    type: 'game',
                    category: 'math',
                    subjects: '',
                    gradeLevels: [],
                    customHtmlPath: '',
                    downloadUrl: '',
                    externalUrl: '',
                    thumbnail: ''
                });
            } else {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                throw new Error(errorData.error || 'Failed to save');
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Error saving content';
            setStatus({ msg: errorMessage, type: 'error' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleBulkSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!bulkFiles || bulkFiles.length === 0) return;
        setIsSubmitting(true);
        setStatus(null);

        const filePayloads = [];

        // Read all files
        for (let i = 0; i < bulkFiles.length; i++) {
            const file = bulkFiles[i];
            const text = await file.text();
            filePayloads.push({ name: file.name, content: text });
        }

        try {
            const response = await fetch('/api/upload-bulk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ category: bulkCategory, files: filePayloads })
            });

            if (response.ok) {
                const data = await response.json();
                setStatus({ msg: `Success! Uploaded ${data.count} worksheets.`, type: 'success' });
                setBulkFiles(null);
            } else {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                throw new Error(errorData.error || 'Bulk upload failed');
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Error uploading files';
            setStatus({ msg: errorMessage, type: 'error' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="admin-container">
            <h1>Content Manager</h1>
            <p>Add new resources to your platform.</p>

            <div className="admin-tabs">
                <button className={activeTab === 'single' ? 'active' : ''} onClick={() => setActiveTab('single')}>Single Item</button>
                <button className={activeTab === 'bulk' ? 'active' : ''} onClick={() => setActiveTab('bulk')}>Bulk Upload (Worksheets)</button>
            </div>

            {status && (
                <div className={`status-msg ${status.type}`}>
                    {status.msg}
                </div>
            )}

            {activeTab === 'single' ? (
                <form onSubmit={handleSubmit} className="admin-form">
                    <div className="form-group">
                        <label>Title</label>
                        <input required name="title" value={formData.title} onChange={handleChange} placeholder="e.g. Space Math Blaster" />
                    </div>

                    <div className="form-group">
                        <label>Category</label>
                        <select name="category" value={formData.category} onChange={handleChange}>
                            {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Type</label>
                        <select name="type" value={formData.type} onChange={handleChange}>
                            <option value="game">Game (HTML/JS)</option>
                            <option value="worksheet">Worksheet (HTML)</option>
                            <option value="tool">Tool</option>
                            <option value="resource">Resource (PDF/Link)</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Description</label>
                        <textarea required name="description" value={formData.description} onChange={handleChange} placeholder="Short description..." />
                    </div>

                    <div className="form-group">
                        <label>Subjects (comma separated)</label>
                        <input name="subjects" value={formData.subjects} onChange={handleChange} placeholder="e.g. Arithmetic, Logic" />
                    </div>

                    <div className="form-group">
                        <label>Grade Levels</label>
                        <div className="checkbox-group">
                            {GRADES.map(g => (
                                <label key={g} className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={formData.gradeLevels.includes(g)}
                                        onChange={() => handleCheckboxChange(g)}
                                    />
                                    {g}
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="form-section">
                        <h3>File Configuration</h3>

                        {formData.type === 'game' || formData.type === 'tool' || formData.type === 'worksheet' ? (
                            <div className="form-group">
                                <label>Local HTML Path (relative to public/)</label>
                                <input
                                    name="customHtmlPath"
                                    value={formData.customHtmlPath}
                                    onChange={handleChange}
                                    placeholder="/Games/My-Worksheet/index.html"
                                />
                                <small>Make sure you copied your folder to <code>public/</code> first!</small>
                            </div>
                        ) : (
                            <div className="form-group">
                                <label>Download URL (PDF path)</label>
                                <input
                                    name="downloadUrl"
                                    value={formData.downloadUrl}
                                    onChange={handleChange}
                                    placeholder="/downloads/my-worksheet.pdf"
                                />
                            </div>
                        )}

                        <div className="form-group">
                            <label>Thumbnail Path</label>
                            <input name="thumbnail" value={formData.thumbnail} onChange={handleChange} placeholder="/assets/thumbnails/custom.png" />
                        </div>
                    </div>

                    <button type="submit" className="save-btn" disabled={isSubmitting}>
                        {isSubmitting ? 'Saving...' : 'Save Content'}
                    </button>
                </form>
            ) : (
                <form onSubmit={handleBulkSubmit} className="admin-form">
                    <h3>Bulk Worksheet Importer</h3>
                    <p className="hint">Select multiple HTML files. They will be automatically organized into <code>public/Worksheets/</code> and registered.</p>

                    <div className="form-group">
                        <label>Target Category</label>
                        <select value={bulkCategory} onChange={(e) => setBulkCategory(e.target.value)}>
                            {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Select HTML Files</label>
                        <input
                            key={bulkFiles ? 'files-selected' : 'no-files'} // Add key to force re-render and clear input
                            type="file"
                            multiple
                            accept=".html"
                            onChange={(e) => setBulkFiles(e.target.files)}
                        />
                    </div>

                    <button type="submit" className="save-btn" disabled={isSubmitting || !bulkFiles}>
                        {isSubmitting ? 'Uploading...' : `Upload ${bulkFiles?.length || 0} Files`}
                    </button>
                </form>
            )}
        </div>
    );
};

export default AdminPage;
