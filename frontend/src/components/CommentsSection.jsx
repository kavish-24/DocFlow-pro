function CommentsSection({
  document,
  comments,
  newComment,
  setNewComment,
  handleAddComment,
  submittingComment,
  errors,
  loadingComments,
  page,
  setPage,
  commentsPerPage,
  totalComments,
}) {
  return (
    <div className="mt-6">
      <h2 className="text-lg font-semibold mb-2">Comments</h2>
      <div className="flex items-start gap-2 mb-4">
        <textarea
          className="w-full p-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400"
          rows="3"
          placeholder="Add a comment..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          maxLength={500}
          disabled={submittingComment}
        />
        <button
          onClick={handleAddComment}
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
      <div className="space-y-4">
        {comments.length === 0 && !loadingComments && (
          <p className="text-gray-500">No comments yet.</p>
        )}
        {comments.map((comment) => (
          <div
            key={comment._id}
            className="p-3 border border-gray-200 rounded-md shadow-sm bg-white"
          >
            <p className="text-sm text-gray-700">{comment.text}</p>
            <p className="text-xs text-gray-500 italic">
              By {comment.userEmail || comment.author?.email || 'Unknown'} on{' '}
              {comment.createdAt
                ? new Date(comment.createdAt).toLocaleString()
                : 'Unknown date'}
            </p>
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
                ? 'opacity-50 cursor-not-allowed'
                : ''
            }`}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

export default CommentsSection;