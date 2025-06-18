import { useState, useEffect } from 'react';
import { Tree } from 'react-arborist';
import axios from 'axios';

function DocumentTree({ userRole, onMove, onDelete, onAction, onRename, folders, documents, setDocuments, setFolders, setTreeData }) {
  const buildTreeData = (folders, documents) => {
    console.log('Folders in buildTreeData:', folders);
    console.log('Documents in buildTreeData:', documents);

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

    const documentsFolder = {
      id: 'documents-root',
      name: 'Documents',
      children: [],
      isFolder: true,
    };

    folders.forEach(folder => {
      if (!folder.parentId && folderMap[folder._id]) {
        documentsFolder.children.push(folderMap[folder._id]);
      }
    });

    if (uncategorizedDocs.length > 0) {
      documentsFolder.children.push(uncategorizedFolder);
    }

    documentsFolder.children.sort((a, b) => {
      if (a.id === 'uncategorized') return 1;
      if (b.id === 'uncategorized') return -1;
      return a.name.localeCompare(b.name);
    });

    const result = [documentsFolder];
    console.log('Constructed Tree Data:', JSON.stringify(result, null, 2));
    return result;
  };

  const [treeData, setLocalTreeData] = useState(() => buildTreeData(folders, documents));

  useEffect(() => {
    const newTreeData = buildTreeData(folders, documents);
    setLocalTreeData(newTreeData);
    setTreeData(newTreeData);
  }, [folders, documents]);

  return (
    <Tree
      data={treeData}
      onMove={onMove}
      height={500}
      width="100%"
      renderRow={({ node, innerRef, attrs }) => (
        <div
          {...attrs}
          ref={innerRef}
          className="flex justify-between items-center px-2 py-1 hover:bg-gray-100"
          style={{ paddingLeft: `${node.level * 20}px` }}
          onClick={() => node.data.isFolder && node.toggle()}
        >
          <span>
            {node.data.isFolder
              ? `${node.isOpen ? '▼ 📁' : '▶ 📁'} ${node.data.name}`
              : `📄 ${node.data.name}`}
          </span>
          <div className="space-x-2">
            {!node.data.isFolder && (
              <>
                <button onClick={() => onAction(node.data, 'view')} className="text-blue-600 hover:underline">View</button>
                {(userRole === 'admin' || userRole === 'editor') && (
                  <button onClick={() => onAction(node.data, 'edit')} className="text-green-600 hover:underline">Edit</button>
                )}
              </>
            )}
            {(userRole === 'admin') && node.id !== 'documents-root' && (
              <button onClick={() => onDelete(node.data)} className="text-red-600 hover:underline">Delete</button>
            )}
            {(userRole === 'admin' || userRole === 'editor') && !node.data.isFolder && (
              <button
                onClick={async () => {
                  const newName = prompt('Enter new document name:', node.data.name);
                  if (newName) {
                    try {
                      await axios.put(
                        `${import.meta.env.VITE_API_URL}/documents/rename/${node.data.id}`,
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
      )}
    />
  );
}

export default DocumentTree;