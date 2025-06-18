import { useState } from 'react';
import axios from 'axios';

function CustomTree({ userRole, onMove, onDelete, onAction, onRename, folders, documents, setDocuments, setFolders }) {
  // Build the tree data structure
  const buildTreeData = (folders, documents) => {
   

    const folderMap = {};
    folders.forEach(folder => {
      if (folder._id && folder.name) {
        folderMap[folder._id] = { id: folder._id, name: folder.name, children: [], isFolder: true };
      }
    });

    folders.forEach(folder => {
      if (folder.parentId && folderMap[folder._id] && folderMap[folder.parentId]) {
        folderMap[folder.parentId].children.push(folderMap[folder._id]);
      }
    });

    documents.forEach(doc => {
      if (doc._id && doc.filename) {
        const node = { id: doc._id, name: doc.filename, isFolder: false, fileId: doc.fileId };
        if (doc.folderId && folderMap[doc.folderId]) {
          folderMap[doc.folderId].children.push(node);
        }
      }
    });

    const uncategorizedDocs = documents.filter(doc => !doc.folderId && doc._id && doc.filename);
    const uncategorizedFolder = {
      id: 'uncategorized',
      name: 'Uncategorized',
      children: uncategorizedDocs.map(doc => ({
        id: doc._id,
        name: doc.filename,
        isFolder: false,
        fileId: doc.fileId
      })),
      isFolder: true,
    };

    const root = [];
    folders.forEach(folder => {
      if (!folder.parentId && folderMap[folder._id]) {
        root.push(folderMap[folder._id]);
      }
    });

    if (uncategorizedDocs.length > 0) {
      root.push(uncategorizedFolder);
    }

    root.sort((a, b) => {
      if (a.id === 'uncategorized') return 1;
      if (b.id === 'uncategorized') return -1;
      return a.name.localeCompare(b.name);
    });

    return root;
  };

  const treeData = buildTreeData(folders, documents);

  // State to track which nodes are expanded
  const [expandedNodes, setExpandedNodes] = useState({});

  const toggleNode = (nodeId) => {
    setExpandedNodes(prev => ({
      ...prev,
      [nodeId]: !prev[nodeId]
    }));
  };

  // Recursive component to render tree nodes
  const TreeNode = ({ node, level = 0 }) => {
    const isExpanded = !!expandedNodes[node.id];

    return (
      <div style={{ marginLeft: `${level * 20}px` }}>
        <div className="flex justify-between items-center py-1 hover:bg-gray-100">
          <span
            onClick={() => node.isFolder && toggleNode(node.id)}
            className="cursor-pointer"
          >
            {node.isFolder
              ? `${isExpanded ? '▼ 📁' : '▶ 📁'} ${node.name}`
              : `📄 ${node.name}`}
          </span>
          <div className="space-x-2">
            {!node.isFolder && (
              <>
                <button onClick={() => onAction(node, 'view')} className="text-blue-600 hover:underline">View</button>
                {(userRole === 'admin' || userRole === 'editor') && (
                  <button onClick={() => onAction(node, 'edit')} className="text-green-600 hover:underline">Edit</button>
                )}
              </>
            )}
            {(userRole === 'admin') && node.id !== 'documents-root' && (
              <button onClick={() => onDelete(node)} className="text-red-600 hover:underline">Delete</button>
            )}
            {(userRole === 'admin' || userRole === 'editor') && !node.isFolder && (
              <button
                onClick={async () => {
                  const newName = prompt('Enter new document name:', node.name);
                  if (newName) {
                    try {
                      await axios.put(
                        `${import.meta.env.VITE_API_URL}/documents/rename/${node.id}`,
                        { filename: newName },
                        { withCredentials: true }
                      );
                      const docResponse = await axios.get(`${import.meta.env.VITE_API_URL}/documents`, { withCredentials: true });
                      setDocuments(docResponse.data);
                    } catch (err) {
                      console.error('Rename error:', err);
                    }
                  }
                }}
                className="text-yellow-600 hover:underline"
              >
                Rename
              </button>
            )}
          </div>
        </div>
        {node.isFolder && isExpanded && node.children && (
          <div>
            {node.children.map(child => (
              <TreeNode key={child.id} node={child} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      {treeData.map(node => (
        <TreeNode key={node.id} node={node} />
      ))}
    </div>
  );
}

export default CustomTree;