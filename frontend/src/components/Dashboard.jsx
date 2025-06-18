import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import CustomTree from './CustomTree';
import useStore from '../store/store';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [analytics, setAnalytics] = useState({ perUser: [], perFolder: [], mostEdited: [] });
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const { user, setUser, folders, documents, activities, setFolders, setDocuments, setActivities } = useStore();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [roleResponse, docResponse, folderResponse, activityResponse] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_URL}/auth/me`, { withCredentials: true }),
        axios.get(`${import.meta.env.VITE_API_URL}/documents`, { withCredentials: true }),
        axios.get(`${import.meta.env.VITE_API_URL}/folders`, { withCredentials: true }),
        axios.get(`${import.meta.env.VITE_API_URL}/activities`, { withCredentials: true }),
      ]);

      const role = roleResponse.data.role.toLowerCase();
      setUserRole(role);
      if (user?.role !== role) {
        setUser({ email: roleResponse.data.email, role });
      }
      setDocuments(docResponse.data);
      setFolders(folderResponse.data.folders);
      setActivities(activityResponse.data.activities);

      if (role === 'admin') {
        const [perUser, perFolder, mostEdited] = await Promise.all([
          axios.get(`${import.meta.env.VITE_API_URL}/analytics/documents-per-user`, { withCredentials: true }),
          axios.get(`${import.meta.env.VITE_API_URL}/analytics/documents-per-folder`, { withCredentials: true }),
          axios.get(`${import.meta.env.VITE_API_URL}/analytics/most-edited`, { withCredentials: true }),
        ]);
        setAnalytics({
          perUser: perUser.data.stats,
          perFolder: perFolder.data.stats,
          mostEdited: mostEdited.data.stats,
        });
      }
    } catch (err) {
      console.error('Dashboard fetch error:', err);
      setError(err.response?.data?.error || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [setDocuments, setFolders, setActivities, setUser, user?.role]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSearch = async () => {
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/ai/search`,
        { query: searchQuery },
        { withCredentials: true }
      );
      setDocuments(response.data.results);
    } catch (err) {
      setError(err.response?.data?.error || 'Search failed');
    }
  };

  const handleMove = async ({ dragIds, parentId }) => {
    try {
      await axios.put(`${import.meta.env.VITE_API_URL}/folders/move/${dragIds[0]}`, {
        folderId: parentId || null
      }, { withCredentials: true });
      const [docResponse, folderResponse] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_URL}/documents`, { withCredentials: true }),
        axios.get(`${import.meta.env.VITE_API_URL}/folders`, { withCredentials: true }),
      ]);
      setDocuments(docResponse.data);
      setFolders(folderResponse.data.folders);
    } catch (err) {
      console.error('Move error:', err);
      setError(err.response?.data?.error || 'Failed to move item');
    }
  };

  const handleDelete = async (node) => {
    try {
      if (node.isFolder && node.id === 'documents-root') return;
      if (node.isFolder) {
        await axios.delete(`${import.meta.env.VITE_API_URL}/folders/${node.id}`, { withCredentials: true });
        setFolders(folders.filter(f => f._id !== node.id));
      } else {
        await axios.delete(`${import.meta.env.VITE_API_URL}/documents/${node.id}`, {
          withCredentials: true,
          data: { fileId: node.fileId }
        });
        setDocuments(documents.filter(d => d._id !== node.id));
      }
    } catch (err) {
      console.error('Delete error:', err);
      setError(err.response?.data?.error || 'Failed to delete item');
    }
  };

  const handleAction = (node, action) => {
    if (!node || node.isFolder) return;
    navigate(`/document/${action}/${node.id}`);
  };

  const handleLogout = async () => {
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/auth/logout`, {}, { withCredentials: true });
      setUser(null);
      navigate('/login');
    } catch (err) {
      console.error('Logout error:', err);
      setError('Failed to log out');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <header className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Docflow pro</h1>
          <div className="space-x-4">
            <span className="text-gray-600">{user?.email} ({userRole})</span>
            <button
              onClick={handleLogout}
              className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600"
            >Logout</button>
          </div>
        </header>

        {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>}
        {loading ? (
          <div className="text-center text-gray-500">Loading...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="col-span-2 bg-white p-4 rounded shadow">
              <div className="flex justify-between mb-4">
                <h2 className="text-xl font-semibold">Folders & Documents</h2>
                <div className="space-x-2">
                  {(userRole === 'admin' || userRole === 'editor') && (
                    <>
                      <Link to="/folder/create" className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600">Create Folder</Link>
                      <Link to="/document/upload" className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">Upload</Link>
                    </>
                  )}
                </div>
              </div>

              <div className="mb-4 flex">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search documents by keywords or concepts..."
                  className="w-full p-2 border border-gray-300 rounded-lg"
                />
                <button
                  onClick={handleSearch}
                  className="ml-2 bg-blue-600 text-white p-2 rounded-lg"
                >
                  Search
                </button>
              </div>

              <CustomTree
                userRole={userRole}
                onMove={handleMove}
                onDelete={handleDelete}
                onAction={handleAction}
                onRename={() => {}}
                folders={folders}
                documents={documents}
                setDocuments={setDocuments}
                setFolders={setFolders}
              />
            </div>

            <div className="bg-white p-4 rounded shadow overflow-x-auto">
              <h2 className="text-xl font-semibold mb-2">Analytics</h2>
              <p>Total Documents: {documents.length}</p>
              <p>Total Folders: {folders.length}</p>

              {userRole === 'admin' && (
                <>
                  <h3 className="text-lg font-semibold mt-4">Documents per User</h3>
                  <Bar
                    data={{
                      labels: analytics.perUser.map(stat => stat.email),
                      datasets: [{
                        label: 'Documents per User',
                        data: analytics.perUser.map(stat => stat.count),
                        backgroundColor: '#4CAF50',
                      }],
                    }}
                    options={{
                      responsive: true,
                      plugins: { title: { display: true, text: 'Documents per User' }, legend: { display: false } },
                      scales: { y: { beginAtZero: true, title: { display: true, text: 'Documents' } } }
                    }}
                  />

                  <h3 className="text-lg font-semibold mt-4">Documents per Folder</h3>
                  <Bar
                    data={{
                       labels: analytics.perFolder.map(stat => stat.name),
                      datasets: [{
                        label: 'Documents per Folder',
                        data: analytics.perFolder.map(stat => stat.count),
                        backgroundColor: '#2196F3',
                      }],
                    }}
                    options={{
                      responsive: true,
                      plugins: { title: { display: true, text: 'Documents per Folder' }, legend: { display: false } },
                      scales: { y: { beginAtZero: true, title: { display: true, text: 'Documents' } } }
                    }}
                  />

                  <h3 className="text-lg font-semibold mt-4">Most Edited Files</h3>
                  <ul className="text-gray-600 text-sm space-y-1">
                    {analytics.mostEdited.map(stat => (
                      <li key={stat._id}>{stat._id}: {stat.count} edits</li>
                    ))}
                  </ul>
                </>
              )}

              <h2 className="text-xl font-semibold mt-6 mb-2">Recent Activity</h2>
              <ul className="text-gray-600 text-sm space-y-1">
                {activities.slice(0, 5).map(act => (
                  <li key={act._id}>{act.action} by {act.userEmail} at {new Date(act.timestamp).toLocaleString()}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;