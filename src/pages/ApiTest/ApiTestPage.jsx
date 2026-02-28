import { useEffect, useState } from "react";
import { fetchHealthStatus, HEALTH_ENDPOINT } from "../../api/health";

function ApiTestPage() {
  const [healthResult, setHealthResult] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function runHealthCheck() {
    setIsLoading(true);
    setError("");

    try {
      const result = await fetchHealthStatus();

      setHealthResult(result);
    } catch (requestError) {
      setHealthResult(null);
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unknown error while checking API health.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    runHealthCheck();
  }, []);

  return (
    <>
      <section className="panel-card">
        <div className="card-heading-row">
          <h3>Health Check Control</h3>
          <span className={healthResult ? "inline-badge success" : "inline-badge"}>
            {healthResult ? "Healthy" : error ? "Error" : "Waiting"}
          </span>
        </div>
        <p className="card-copy compact">
          Runs a live health check against <code>{HEALTH_ENDPOINT}</code>.
        </p>
        <div className="actions">
          <button type="button" onClick={runHealthCheck} disabled={isLoading}>
            {isLoading ? "Checking..." : "Run Health Check"}
          </button>
        </div>
        {error ? <p className="feedback error-text">Error: {error}</p> : null}
      </section>

      <section className="two-column-grid">
        <article className="panel-card">
          <div className="card-heading-row">
            <h3>Health Summary</h3>
            <span className="inline-badge">/health</span>
          </div>
          <div className="detail-grid api-detail-grid">
            <DetailItem
              label="HTTP Status"
              value={healthResult ? String(healthResult.status) : "Unavailable"}
            />
            <DetailItem
              label="Latency"
              value={healthResult ? `${healthResult.durationMs} ms` : "Unavailable"}
            />
            <DetailItem
              label="Checked At"
              value={healthResult ? healthResult.checkedAt : "Unavailable"}
            />
            <DetailItem
              label="Response Type"
              value={
                healthResult
                  ? typeof healthResult.data === "string"
                    ? "text"
                    : "json"
                  : "Unavailable"
              }
            />
          </div>
        </article>

        <article className="panel-card">
          <div className="card-heading-row">
            <h3>Health Response</h3>
            <span className="inline-badge">Payload</span>
          </div>
          <pre className="response-box compact-box">
            {healthResult
              ? JSON.stringify(healthResult.data, null, 2)
              : "No health response loaded yet."}
          </pre>
        </article>
      </section>
    </>
  );
}

function DetailItem({ label, value }) {
  return (
    <div className="detail-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default ApiTestPage;
