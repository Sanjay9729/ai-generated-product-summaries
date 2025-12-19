import { useLoaderData, useRevalidator } from "react-router";
import { authenticate } from "../shopify.server";
import { getLatestInstallationJob } from "../../database/collections.js";
import { useEffect } from "react";

export const loader = async ({ request }) => {
  await authenticate.admin(request);

  const { session } = await authenticate.admin(request);
  const job = await getLatestInstallationJob(session.shop);

  return {
    job: job ? {
      status: job.status,
      jobId: job.job_id,
      totalProducts: job.total_products || 0,
      productsProcessed: job.products_processed || 0,
      summariesGenerated: job.summaries_generated || 0,
      progressPercentage: job.progress_percentage || 0,
      createdAt: job.created_at?.toISOString(),
      startedAt: job.started_at?.toISOString(),
      completedAt: job.completed_at?.toISOString(),
      errorMessage: job.error_message,
      errors: job.errors,
    } : null,
  };
};

export default function InstallationStatus() {
  const { job } = useLoaderData();
  const revalidator = useRevalidator();

  // Auto-refresh every 3 seconds if job is still processing
  useEffect(() => {
    if (job && (job.status === 'pending' || job.status === 'processing')) {
      const interval = setInterval(() => {
        revalidator.revalidate();
      }, 3000);

      return () => clearInterval(interval);
    }
  }, [job, revalidator]);

  if (!job) {
    return (
      <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
        <h1>Installation Status</h1>
        <p>No installation job found. The automatic product sync will start when you first install the app.</p>
      </div>
    );
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#FFA500';
      case 'processing': return '#2196F3';
      case 'completed': return '#4CAF50';
      case 'failed': return '#F44336';
      default: return '#999';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending': return 'Pending';
      case 'processing': return 'Processing...';
      case 'completed': return 'Completed';
      case 'failed': return 'Failed';
      default: return status;
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Installation Status</h1>

      <div style={{
        background: 'white',
        border: '1px solid #ddd',
        borderRadius: '8px',
        padding: '20px',
        marginBottom: '20px',
      }}>
        <div style={{ marginBottom: '15px' }}>
          <strong>Status: </strong>
          <span style={{
            color: getStatusColor(job.status),
            fontWeight: 'bold',
            fontSize: '18px',
          }}>
            {getStatusText(job.status)}
          </span>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <strong>Job ID: </strong>
          <code style={{ background: '#f5f5f5', padding: '2px 6px', borderRadius: '4px' }}>
            {job.jobId}
          </code>
        </div>

        {job.status === 'processing' && (
          <div style={{ marginBottom: '15px' }}>
            <strong>Progress: </strong>
            <div style={{
              width: '100%',
              height: '30px',
              background: '#f0f0f0',
              borderRadius: '15px',
              overflow: 'hidden',
              marginTop: '10px',
            }}>
              <div style={{
                width: `${job.progressPercentage}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #4CAF50, #8BC34A)',
                transition: 'width 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: 'bold',
              }}>
                {job.progressPercentage}%
              </div>
            </div>
          </div>
        )}

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: '15px',
          marginTop: '20px',
        }}>
          <div style={{
            background: '#f5f5f5',
            padding: '15px',
            borderRadius: '8px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#333' }}>
              {job.totalProducts}
            </div>
            <div style={{ fontSize: '14px', color: '#666' }}>Total Products</div>
          </div>

          <div style={{
            background: '#f5f5f5',
            padding: '15px',
            borderRadius: '8px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#2196F3' }}>
              {job.productsProcessed}
            </div>
            <div style={{ fontSize: '14px', color: '#666' }}>Products Synced</div>
          </div>

          <div style={{
            background: '#f5f5f5',
            padding: '15px',
            borderRadius: '8px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#4CAF50' }}>
              {job.summariesGenerated}
            </div>
            <div style={{ fontSize: '14px', color: '#666' }}>AI Summaries</div>
          </div>
        </div>

        <div style={{ marginTop: '20px', fontSize: '14px', color: '#666' }}>
          {job.createdAt && (
            <div><strong>Created:</strong> {new Date(job.createdAt).toLocaleString()}</div>
          )}
          {job.startedAt && (
            <div><strong>Started:</strong> {new Date(job.startedAt).toLocaleString()}</div>
          )}
          {job.completedAt && (
            <div><strong>Completed:</strong> {new Date(job.completedAt).toLocaleString()}</div>
          )}
        </div>

        {job.status === 'failed' && job.errorMessage && (
          <div style={{
            marginTop: '20px',
            padding: '15px',
            background: '#ffebee',
            borderLeft: '4px solid #f44336',
            borderRadius: '4px',
          }}>
            <strong style={{ color: '#f44336' }}>Error:</strong>
            <div style={{ marginTop: '5px' }}>{job.errorMessage}</div>
          </div>
        )}

        {job.status === 'completed' && job.errors && job.errors.length > 0 && (
          <div style={{
            marginTop: '20px',
            padding: '15px',
            background: '#fff3cd',
            borderLeft: '4px solid #ffc107',
            borderRadius: '4px',
          }}>
            <strong style={{ color: '#856404' }}>Warnings:</strong>
            <div style={{ marginTop: '5px' }}>
              {job.errors.length} product(s) had errors during processing
            </div>
          </div>
        )}

        {job.status === 'completed' && (
          <div style={{
            marginTop: '20px',
            padding: '15px',
            background: '#e8f5e9',
            borderLeft: '4px solid #4caf50',
            borderRadius: '4px',
          }}>
            <strong style={{ color: '#2e7d32' }}>Success!</strong>
            <div style={{ marginTop: '5px' }}>
              Your products have been synced and AI summaries have been generated.
              Visit the <a href="/app/ai-summaries" style={{ color: '#1976d2' }}>AI Summaries</a> page to view them.
            </div>
          </div>
        )}
      </div>

      {(job.status === 'pending' || job.status === 'processing') && (
        <div style={{
          textAlign: 'center',
          padding: '20px',
          background: '#e3f2fd',
          borderRadius: '8px',
        }}>
          <div style={{ fontSize: '16px', color: '#1976d2', marginBottom: '10px' }}>
            ⏳ Processing your products in the background...
          </div>
          <div style={{ fontSize: '14px', color: '#666' }}>
            This page refreshes automatically every 3 seconds. You can close this page and come back later.
          </div>
        </div>
      )}
    </div>
  );
}
