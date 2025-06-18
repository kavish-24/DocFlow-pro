function DocumentMetadata({ document }) {
  return (
    <div className="mb-6">
      <h3 className="text-lg font-semibold text-gray-800">Metadata</h3>
      <p className="text-gray-600">Uploaded: {new Date(document.uploadedAt).toLocaleString()}</p>
      <p className="text-gray-600">User ID: {document.userId}</p>
      <p className="text-gray-600">Folder ID: {document.folderId || 'None'}</p>
    </div>
  );
}

export default DocumentMetadata;