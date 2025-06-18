import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

function DocumentView() {
  const { documentId } = useParams();
  const [document, setDocument] = useState(null);
  const [summary, setSummary] = useState('');
  const [errors, setErrors] = useState({
    document: null,
    comments: null,
    workflow: null,
  });
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState('');
  const [currentUserEmail, setCurrentUserEmail] = useState('');
  const navigate = useNavigate();
  const [workflowStatus, setWorkflowStatus] = useState('Draft');
  const [reviewers, setReviewers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [loadingComments, setLoadingComments] = useState(true);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState(null);
  const [updatingWorkflow, setUpdatingWorkflow] = useState(false);
  const [workflowSuccess, setWorkflowSuccess] = useState(null);
  const [page, setPage] = useState(1);
  const [commentsPerPage] = useState(10);
  const [totalComments, setTotalComments] = useState(0);
  const maxCommentLength = 500;

  // Fetch document
  useEffect(() => {
    const fetchDocument = async () => {
      try {
        setLoading(true);
        setErrors((prev) => ({ ...prev, document: null }));
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/documents/${documentId}`, {
          withCredentials: true,
        });
        const fetchedDoc = response.data;
        console.log('Document fetched:', fetchedDoc);
        setDocument(fetchedDoc);
        setWorkflowStatus(fetchedDoc.workflow?.status || 'Draft');
        setReviewers(fetchedDoc.workflow?.reviewers || []);
        const summaryResponse = await axios.get(
          `${import.meta.env.VITE_API_URL}/ai/summarize/${documentId}`,
          { withCredentials: true }
        );
        setSummary(summaryResponse.data.summary || 'No summary available');
      } catch (err) {
        console.error('Document fetch error:', err.message, err.response?.data);
        setErrors((prev) => ({
          ...prev,
          document: err.response?.data?.error || 'Failed to load document',
        }));
      } finally {
        setLoading(false);
      }
    };
    fetchDocument();
  }, [documentId]);

  // Fetch user role and email
  useEffect(() => {
    const fetchRole = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/auth/me`, {
          withCredentials: true,
        });
        setUserRole(res.data.role);
        setCurrentUserEmail(res.data.email || '');
      } catch (err) {
        console.error('Fetch role error:', err.message, err.response?.data);
        setErrors((prev) => ({ ...prev, document: 'Failed to load user role' }));
      }
    };
    fetchRole();
  }, []);

  // Fetch all users (for admin)
  useEffect(() => {
    if (userRole === 'admin') {
      axios
        .get(`${import.meta.env.VITE_API_URL}/auth/users`, { withCredentials: true })
        .then((res) => {
          console.log('Users fetched:', res.data.users);
          setAllUsers(res.data.users || []);
        })
        .catch((err) => {
          console.error('Fetch users error:', err.message, err.response?.data);
          setErrors((prev) => ({ ...prev, document: 'Failed to fetch users' }));
        });
    }
  }, [userRole]);

  // Fetch comments and replies
  useEffect(() => {
    const fetchComments = async () => {
      if (!document?.fileId) {
        console.log('No document fileId, skipping comments fetch');
        setLoadingComments(false);
        setErrors((prev) => ({ ...prev, comments: 'Document ID missing' }));
        return;
      }
      console.log('Fetching comments for fileId:', document.fileId, 'Page:', page);
      try {
        setLoadingComments(true);
        setErrors((prev) => ({ ...prev, comments: null }));
        // Fetch top-level comments
        const res = await axios.get(
          `${import.meta.env.VITE_API_URL}/comments/${document.fileId}?page=${page}&limit=${commentsPerPage}`,
          { withCredentials: true }
        );
        console.log('Top-level comments response:', res.data);
        const topLevelComments = res.data.comments || [];
        const total = res.data.total || 0;

        // Fetch replies for each top-level comment
        const commentsWithReplies = [];
        for (const comment of topLevelComments) {
          const replyRes = await axios.get(
            `${import.meta.env.VITE_API_URL}/comments/replies/${comment._id}`,
            { withCredentials: true }
          );
          console.log(`Replies for comment ${comment._id}:`, replyRes.data);
          commentsWithReplies.push(comment, ...(replyRes.data.replies || []));
        }

        setComments(commentsWithReplies);
        setTotalComments(total + commentsWithReplies.length - topLevelComments.length);
      } catch (err) {
        console.error('Comment fetch error:', {
          message: err.message,
          status: err.response?.status,
          data: err.response?.data,
        });
        setErrors((prev) => ({
          ...prev,
          comments:
            err.response?.status === 404
              ? 'No comments found'
              : err.response?.data?.error || 'Failed to load comments',
        }));
      } finally {
        setLoadingComments(false);
      }
    };
    fetchComments();
  }, [document, page, commentsPerPage]);

  // Update workflow
  const updateWorkflow = async () => {
    const previousState = { status: workflowStatus, reviewers };
    setUpdatingWorkflow(true);
    setErrors((prev) => ({ ...prev, workflow: null }));
    setWorkflowSuccess(null);
    try {
      await axios.put(
        `${import.meta.env.VITE_API_URL}/documents/workflow/${documentId}`,
        { status: workflowStatus, reviewerIds: reviewers },
        { withCredentials: true }
      );
      setDocument({ ...document, workflow: { status: workflowStatus, reviewers } });
      setWorkflowSuccess('Workflow updated successfully!');
      setTimeout(() => setWorkflowSuccess(null), 3000);
    } catch (err) {
      console.error('Workflow update error:', err.message, err.response?.data);
      setErrors((prev) => ({
        ...prev,
        workflow: err.response?.data?.error || 'Failed to update workflow',
      }));
      setWorkflowStatus(previousState.status);
      setReviewers(previousState.reviewers);
    } finally {
      setUpdatingWorkflow(false);
    }
  };

  // Add comment or reply
  const handleAddComment = async (parentId = null) => {
    if (!newComment.trim()) {
      setErrors((prev) => ({ ...prev, comments: 'Comment cannot be empty' }));
      return;
    }
    if (!document?.fileId) {
      setErrors((prev) => ({ ...prev, comments: 'Document ID missing' }));
      return;
    }
    setSubmittingComment(true);
    setErrors((prev) => ({ ...prev, comments: null }));
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/comments/${document.fileId}`,
        {
          content: newComment.trim(),
          parentId,
        },
        { withCredentials: true }
      );
      console.log('Posted comment:', res.data.comment);
      setComments((prev) => [res.data.comment, ...prev]);
      setNewComment('');
      setReplyingTo(null);
      setTotalComments((prev) => prev + 1);
      setPage(1);
    } catch (err) {
      console.error('Failed to post comment:', err.message, err.response?.data);
      setErrors((prev) => ({
        ...prev,
        comments: err.response?.data?.error || 'Failed to post comment',
      }));
    } finally {
      setSubmittingComment(false);
    }
  };

  // Delete comment
  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) return;
    setDeletingCommentId(commentId);
    setErrors((prev) => ({ ...prev, comments: null }));
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/comments/${commentId}`, {
        withCredentials: true,
      });
      // Backend handles reply deletion, so remove only the comment
      setComments((prev) => prev.filter((c) => c._id !== commentId));
      setTotalComments((prev) => Math.max(prev - 1, 0));
    } catch (err) {
      console.error('Failed to delete comment:', err.message, err.response?.data);
      setErrors((prev) => ({
        ...prev,
        comments: err.response?.data?.error || 'Failed to delete comment',
      }));
    } finally {
      setDeletingCommentId(null);
    }
  };

  // Group comments into nested structure
  const buildCommentTree = () => {
    const tree = [];
    const commentMap = new Map(comments.map((c) => [c._id, { ...c, replies: [] }]));
    commentMap.forEach((comment) => {
      if (comment.parentId) {
        const parent = commentMap.get(comment.parentId);
        if (parent) parent.replies.push(comment);
      } else {
        tree.push(comment);
      }
    });
    return tree;
  };

  const commentTree = buildCommentTree();

  if (loading) return <div className="text-center p-6 text-gray-600">Loading document...</div>;
  if (errors.document) return <div className="text-center p-6 text-red-700">{errors.document}</div>;
  if (!document) return <div className="text-center p-6 text-gray-600">Document not found</div>;

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow-lg">
        <h2 className="text-3xl font-bold text-gray-800 mb-4">{document.filename}</h2>

        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-800">Metadata</h3>
          <p className="text-gray-600">Uploaded: {new Date(document.uploadedAt).toLocaleString()}</p>
          <p className="text-gray-600">User ID: {document.userId}</p>
          <p className="text-gray-600">Folder ID: {document.folderId || 'None'}</p>
        </div>

        {userRole === 'admin' && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800">Workflow</h3>
            <select
              value={workflowStatus}
              onChange={(e) => setWorkflowStatus(e.target.value)}
              className="p-2 border rounded"
              disabled={updatingWorkflow}
            >
              <option value="Draft">Draft</option>
              <option value="In Review">In Review</option>
              <option value="Approved">Approved</option>
            </select>
            <select
              multiple
              value={reviewers}
              onChange={(e) => setReviewers([...e.target.selectedOptions].map((o) => o.value))}
              className="p-2 border rounded mt-2"
              disabled={updatingWorkflow}
            >
              {allUsers.map((user) => (
                <option key={user._id} value={user._id}>
                  {user.email}
                </option>
              ))}
            </select>
            <button
              onClick={updateWorkflow}
              className={`mt-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition ${
                updatingWorkflow ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              disabled={updatingWorkflow}
            >
              {updatingWorkflow ? 'Updating...' : 'Update Workflow'}
            </button>
            {errors.workflow && <p className="text-red-600 text-sm mt-2">{errors.workflow}</p>}
            {workflowSuccess && <p className="text-green-600 text-sm mt-2">{workflowSuccess}</p>}
          </div>
        )}

        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-800">Summary</h3>
          <p className="text-gray-600 whitespace-pre-wrap">{summary}</p>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-800">Content</h3>
          <div className="text-gray-600 whitespace-pre-wrap">{document.content}</div>
        </div>

        <button
          onClick={() => navigate('/')}
          className="mt-6 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition duration-200"
        >
          Back to Dashboard
        </button>
      </div>

      <div className="mt-6 max-w-4xl mx-auto">
        <h2 className="text-lg font-semibold mb-2">Comments</h2>
        <div className="flex items-start gap-2 mb-4">
          <div className="w-full">
            <textarea
              className="w-full p-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400"
              rows="3"
              placeholder="Add a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              maxLength={maxCommentLength}
              disabled={submittingComment}
            />
            <p className="text-xs text-gray-500 mt-1">
              {newComment.length}/{maxCommentLength} characters
            </p>
          </div>
          <button
            onClick={() => handleAddComment()}
            className={`bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition ${
              submittingComment ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            disabled={submittingComment}
          >
            {submittingComment ? 'Posting...' : 'Post'}
          </button>
        </div>
        {errors.comments && <p className="text-red-600 text-sm mb-2">{errors.comments}</p>}
        {loadingComments && <p className="text-gray-600">Loading comments...</p>}
        {!loadingComments && commentTree.length === 0 && (
          <p className="text-gray-500">No comments yet.</p>
        )}
        <div className="space-y-4">
          {commentTree.map((comment) => (
            <div key={comment._id} className="p-3 border border-gray-200 rounded-md shadow-sm bg-white">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-gray-800 mb-1">{comment.content || 'No content'}</p>
                  <p className="text-xs text-gray-500 italic">
                    By {comment.userEmail || 'Unknown'} on{' '}
                    {comment.createdAt
                      ? new Date(comment.createdAt).toLocaleString()
                      : 'Unknown date'}
                  </p>
                </div>
                {(comment.userEmail === currentUserEmail && ['admin', 'editor'].includes(userRole)) ||
                userRole === 'admin' ? (
                  <button
                    onClick={() => handleDeleteComment(comment._id)}
                    className={`text-red-600 hover:text-red-800 text-sm ${
                      deletingCommentId === comment._id ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    disabled={deletingCommentId === comment._id}
                  >
                    {deletingCommentId === comment._id ? 'Deleting...' : 'Delete'}
                  </button>
                ) : null}
              </div>
              <button
                onClick={() => setReplyingTo(replyingTo === comment._id ? null : comment._id)}
                className="text-blue-600 hover:text-blue-800 text-sm mt-2"
              >
                {replyingTo === comment._id ? 'Cancel Reply' : 'Reply'}
              </button>
              {replyingTo === comment._id && (
                <div className="mt-2 flex items-start gap-2">
                  <div className="w-full">
                    <textarea
                      className="w-full p-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400"
                      rows="2"
                      placeholder={`Reply to ${comment.userEmail || 'comment'}...`}
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      maxLength={maxCommentLength}
                      disabled={submittingComment}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {newComment.length}/{maxCommentLength} characters
                    </p>
                  </div>
                  <button
                    onClick={() => handleAddComment(comment._id)}
                    className={`bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition ${
                      submittingComment ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    disabled={submittingComment}
                  >
                    {submittingComment ? 'Posting...' : 'Post Reply'}
                  </button>
                </div>
              )}
              {comment.replies.length > 0 && (
                <div className="mt-2 ml-4 border-l-2 border-gray-300 pl-4 space-y-2">
                  {comment.replies.map((reply) => (
                    <div
                      key={reply._id}
                      className="p-2 border border-gray-200 rounded-md shadow-sm bg-gray-50"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm text-gray-800 mb-1">{reply.content || 'No content'}</p>
                          <p className="text-xs text-gray-500 italic">
                            By {reply.userEmail || 'Unknown'} on{' '}
                            {reply.createdAt
                              ? new Date(reply.createdAt).toLocaleString()
                              : 'Unknown date'}
                          </p>
                        </div>
                        {(reply.userEmail === currentUserEmail && ['admin', 'editor'].includes(userRole)) ||
                        userRole === 'admin' ? (
                          <button
                            onClick={() => handleDeleteComment(reply._id)}
                            className={`text-red-600 hover:text-red-800 text-sm ${
                              deletingCommentId === reply._id ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                            disabled={deletingCommentId === reply._id}
                          >
                            {deletingCommentId === reply._id ? 'Deleting...' : 'Delete'}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
        {totalComments > commentsPerPage && (
          <div className="mt-4 flex justify-between">
            <button
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={page === 1 || loadingComments}
              className={`px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition ${
                page === 1 || loadingComments ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              Previous
            </button>
            <span className="text-gray-600">
              Page {page} of {Math.ceil(totalComments / commentsPerPage)}
            </span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page * commentsPerPage >= totalComments || loadingComments}
              className={`px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition ${
                page * commentsPerPage >= totalComments || loadingComments
                  ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default DocumentView;