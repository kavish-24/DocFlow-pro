import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import useStore from '../store/store';

function DocumentUpload() {
  const [file, setFile] = useState(null);
  const [folderId, setFolderId] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const navigate = useNavigate();
  const { folders, user } = useStore();

  // Check if user is Admin or Editor
  if (!user || (user.role !== 'admin' && user.role !== 'editor')) {
    return (
      <div className="text-center p-6 text-red-700">
        Access denied. Only Admins and Editors can upload documents.
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setSummarizing(true);

    if (!file) {
      setError('Please select a file');
      setSummarizing(false);
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    if (folderId) formData.append('folderId', folderId);

    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/documents/upload`, formData, {
        withCredentials: true,
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSuccess(true);
      setSummarizing(false);
      setTimeout(() => navigate('/'), 1500);
    } catch (err) {
      console.error('Upload error:', err);
      setError(err.response?.data?.error || 'Failed to upload document');
      setSummarizing(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-6">Upload Document</h2>

        {success && (
          <div className="mb-4 p-3 bg-green-100 text-green-700 rounded">
            Document uploaded and summarized successfully! Redirecting to dashboard...
          </div>
        )}
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
            {error}
          </div>
        )}
        {summarizing && (
          <div className="mb-4 p-3 bg-blue-100 text-blue-700 rounded">
            Summarizing document...
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="file" className="block text-sm font-medium text-gray-700">
              Select File (PDF, DOCX, TXT)
            </label>
            <input
              type="file"
              id="file"
              accept=".pdf,.docx,.txt,.pptx"
              onChange={(e) => setFile(e.target.files[0])}
              className="mt-1 w-full p-3 border border-gray-300 rounded-lg"
            />
          </div>

          <div>
            <label htmlFor="folder" className="block text-sm font-medium text-gray-700">
              Select Folder (Optional)
            </label>
            <select
              id="folder"
              value={folderId}
              onChange={(e) => setFolderId(e.target.value)}
              className="mt-1 w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">No Folder</option>
              {folders.map((folder) => (
                <option key={folder._id} value={folder._id}>
                  {folder.name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={summarizing}
            className="w-full bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 transition duration-200 disabled:bg-blue-400"
          >
            Upload
          </button>
        </form>
      </div>
    </div>
  );
}

export default DocumentUpload;