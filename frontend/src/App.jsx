import { useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import useStore from './store/store';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './components/Dashboard';
import DocumentUpload from './components/DocumentUpload';
import DocumentView from './components/DocumentView';
import DocumentEditor from './components/DocumentEditor';
import FolderCreate from './components/FolderCreate.jsx';

function App() {
  const { user, setUser } = useStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const checkAuth = async () => {
      if (location.pathname === '/login' || location.pathname === '/register') {
        return;
      }
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/auth/me`, {
          withCredentials: true,
        });
        setUser({ email: response.data.email, role: response.data.role.toLowerCase() });
      } catch (err) {
        console.error('Auth check error:', err.response?.data?.error || err.message);
        setUser(null);
        navigate('/login');
      }
    };
    checkAuth();
  }, [setUser, navigate, location.pathname]);

  return (
    <div className="min-h-screen bg-gray-100">
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/" element={user ? <Dashboard /> : <Login />} />
        <Route path="/document/upload" element={user ? <DocumentUpload /> : <Login />} />
        <Route path="/document/view/:documentId" element={user ? <DocumentView /> : <Login />} />
        <Route path="/document/edit/:documentId" element={user ? <DocumentEditor /> : <Login />} />
        <Route path="/folder/create" element={user ? <FolderCreate /> : <Login />} />
      </Routes>
    </div>
  );
}

export default App;