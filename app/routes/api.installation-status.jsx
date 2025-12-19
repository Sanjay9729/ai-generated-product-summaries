
import { authenticate } from "../shopify.server";
import { getLatestInstallationJob } from "../../database/collections.js";

export const loader = async ({ request }) => {
  try {
    const { session } = await authenticate.admin(request);

    if (!session?.shop) {
      return Response.json({ error: "No session found" }, { status: 401 });
    }

    // Get the latest installation job for this shop
    const job = await getLatestInstallationJob(session.shop);

    if (!job) {
      return Response.json({
        status: 'no_job',
        message: 'No installation job found',
      });
    }

    return Response.json({
      status: job.status,
      jobId: job.job_id,
      totalProducts: job.total_products || 0,
      productsProcessed: job.products_processed || 0,
      summariesGenerated: job.summaries_generated || 0,
      progressPercentage: job.progress_percentage || 0,
      createdAt: job.created_at,
      startedAt: job.started_at,
      completedAt: job.completed_at,
      errorMessage: job.error_message,
      errors: job.errors,
    });

  } catch (error) {
    console.error("Error fetching installation status:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
};
