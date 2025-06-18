function WorkflowControls({
  userRole,
  workflowStatus,
  setWorkflowStatus,
  reviewers,
  setReviewers,
  allUsers,
  updateWorkflow,
  errors,
  updatingWorkflow,
}) {
  if (userRole !== 'admin') return null;

  return (
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
    </div>
  );
}

export default WorkflowControls;