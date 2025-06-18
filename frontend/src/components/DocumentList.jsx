import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import useStore from '../store/store';

function DocumentList() {
  const { documents } = useStore();
  const [userRole, setUserRole] = useState(null);
  const [folders, setFolders] = useState([]);
  const [expandedFolders, setExpandedFolders] = useState({});
  const [isUncategorizedExpanded, setIsUncategorizedExpanded] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchUserRoleAndFolders = async () => {
      try {
        const [userRes, folderRes] = await Promise.all([
          axios.get(`${import.meta.env.VITE_API_URL}/auth/me`, { withCredentials: true }),
          axios.get(`${import.meta.env.VITE_API_URL}/folders`, { withCredentials: true }),
        ]);
        setUserRole(userRes.data.role);
        setFolders(folderRes.data);
      } catch (err) {
        console.error('Error fetching role or folders:', err);
        setError('Failed to load user role or folders.');
      }
    };
    fetchUserRoleAndFolders();
  }, []);

  const toggleFolder = (folderId) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [folderId]: !prev[folderId],
    }));
  };

  const toggleUncategorized = () => {
    console.log('Toggling Uncategorized section');
    setIsUncategorizedExpanded((prev) => !prev);
  };

  const groupedDocs = {
    Uncategorized: documents.filter((doc) => !doc.folderId),
  };

  folders.forEach((folder) => {
    groupedDocs[folder._id] = documents.filter((doc) => doc.folderId === folder._id);
  });

  console.log('Uncategorized documents:', groupedDocs.Uncategorized);

  return (
    <div className="mb-4">
      <h2 className="text-xl font-bold mb-2">Documents</h2>
      {error && <div className="mb-2 p-2 bg-red-100 text-red-700 rounded">{error}</div>}

      {/* Foldered Documents */}
      {folders.map((folder) => (
        <div key={folder._id} className="mb-2">
          <button
            onClick={() => toggleFolder(folder._id)}
            className="font-semibold flex items-center gap-1"
          >
            {expandedFolders[folder._id] ? '📂' : '📁'} {folder.name}
          </button>
          {expandedFolders[folder._id] && groupedDocs[folder._id]?.length > 0 && (
            <ul className="ml-4 mt-1 space-y-1">
              {groupedDocs[folder._id].map((doc) => (
                <li key={doc._id} className="flex justify-between items-center p-1 border rounded">
                  <span>{doc.filename}</span>
                  <div className="space-x-2">
                    <Link to={`/view/${doc._id}`} className="text-blue-600 hover:underline">View</Link>
                    {['Admin', 'Editor'].includes(userRole) && (
                      <Link to={`/edit/${doc._id}`} className="text-green-600 hover:underline">Edit</Link>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}

      {/* Uncategorized Documents */}
      {groupedDocs.Uncategorized.length > 0 ? (
        <div className="mt-4">
          <button
            onClick={toggleUncategorized}
            className="font-semibold flex items-center gap-1"
          >
            {isUncategorizedExpanded ? '📂' : '📁'} Uncategorized
          </button>
          {isUncategorizedExpanded ? (
            <ul className="ml-4 mt-1 space-y-1">
              {groupedDocs.Uncategorized.map((doc) => (
                <li key={doc._id} className="flex justify-between items-center p-1 border rounded">
                  <span>{doc.filename}</span>
                  <div className="space-x-2">
                    <Link to={`/view/${doc._id}`} className="text-blue-600 hover:underline">View</Link>
                    {['Admin', 'Editor'].includes(userRole) && (
                      <Link to={`/edit/${doc._id}`} className="text-green-600 hover:underline">Edit</Link>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="ml-4 mt-1 text-gray-500">Uncategorized section collapsed</p>
          )}
        </div>
      ) : (
        <p className="mt-4 ml-4 text-gray-500">No uncategorized documents</p>
      )}
    </div>
  );
}

export default DocumentList;