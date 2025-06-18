import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import { debounce } from 'lodash';
import useStore from '../store/store';

// Toolbar Component
const Toolbar = ({ editor }) => {
  if (!editor) return null;

  return (
    <div className="mb-4 flex flex-wrap gap-2">
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className={`px-3 py-1 rounded ${editor.isActive('heading', { level: 1 }) ? 'bg-blue-200' : 'bg-gray-200'}`}
      >
        H1
      </button>
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={`px-3 py-1 rounded ${editor.isActive('bold') ? 'bg-blue-200' : 'bg-gray-200'}`}
      >
        Bold
      </button>
      <button
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={`px-3 py-1 rounded ${editor.isActive('bulletList') ? 'bg-blue-200' : 'bg-gray-200'}`}
      >
        Bullet List
      </button>
      <button
        onClick={() => {
          const url = prompt('Enter URL');
          if (url) editor.chain().focus().setLink({ href: url }).run();
        }}
        className={`px-3 py-1 rounded ${editor.isActive('link') ? 'bg-blue-200' : 'bg-gray-200'}`}
      >
        Link
      </button>
    </div>
  );
};

function DocumentEditor() {
  const { documentId } = useParams();
  const [document, setDocument] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user } = useStore();

  // Debounced save function
  const saveDocument = debounce(async (content) => {
    try {
      await axios.put(
        `${import.meta.env.VITE_API_URL}/documents/${documentId}`,
        { content },
        { withCredentials: true }
      );
    } catch (err) {
      console.error('Auto-save error:', err);
      setError(err.response?.data?.error || 'Failed to save document');
    }
  }, 1000);

  // Editor instance
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
        autolink: true,
      }),
    ],
    content: '',
    onUpdate: ({ editor }) => {
      const content = editor.getText();
      saveDocument(content);
    },
  });

  useEffect(() => {
    const fetchDocument = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/documents/${documentId}`, {
          withCredentials: true,
        });
        setDocument(response.data);
        if (editor) editor.commands.setContent(response.data.content);
      } catch (err) {
        console.error('Document fetch error:', err);
        setError(err.response?.data?.error || 'Failed to load document');
      } finally {
        setLoading(false);
      }
    };
    fetchDocument();
  }, [documentId, editor]);

  // Access control
  if (!user || (user.role !== 'admin' && user.role !== 'editor')) {
    return <div className="text-center p-6 text-red-700">Access denied. Only Admins and Editors can edit documents.</div>;
  }

  // Loading / Error States
  if (loading) return <div className="text-center p-6 text-gray-600">Loading document...</div>;
  if (error) return <div className="text-center p-6 text-red-700">{error}</div>;
  if (!document) return <div className="text-center p-6 text-gray-600">Document not found</div>;

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow-lg">
        <h2 className="text-3xl font-bold text-gray-800 mb-6">{document.filename}</h2>

        <Toolbar editor={editor} />
        <EditorContent editor={editor} className="prose max-w-none border border-gray-300 p-4 rounded-lg bg-white" />

        <div className="mt-6 flex space-x-4">
          <button
            onClick={() => navigate('/')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition duration-200"
          >
            Back to Dashboard
          </button>
          <button
            onClick={() => saveDocument(editor?.getText())}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition duration-200"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

export default DocumentEditor;
