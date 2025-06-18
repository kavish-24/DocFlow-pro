import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import FileUpload from '../components/DocumentUpload';
import DocumentList from '../components/DocumentList';
import Dashboard from '../components/Dashboard';
import useStore from '../store/store';

function Home() {
  const { user, documents, setUser, setDocuments } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [userRes, docsRes] = await Promise.all([
          axios.get(`${import.meta.env.VITE_API_URL}/auth/me`, { withCredentials: true }),
          axios.get(`${import.meta.env.VITE_API_URL}/documents`, {
            params: { search: searchQuery },
            withCredentials: true,
          }),
        ]);
        setUser(userRes.data);
        setDocuments(docsRes.data);
        setError('');
      } catch (err) {
        console.error('Home fetch error:', err);
        setError('Failed to load data. Please try again.');
        if (err.response?.status === 401) navigate('/login');
      }
    };
    fetchData();
  }, [navigate, setUser, setDocuments, searchQuery]);

  return (
    <div className="p-4">
      <h1 className="text-3xl font-bold mb-4">Document Assistant</h1>
      {error && <div className="mb-4 p-2 bg-red-100 text-red-700 rounded">{error}</div>}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search documents..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full p-2 border rounded"
        />
      </div>
      <FileUpload />
      <DocumentList />
      <Dashboard documents={documents} />
    </div>
  );
}

export default Home;