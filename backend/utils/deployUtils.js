const sandboxStateStore = new Map();

function backendBaseUrl() {
    if (process.env.BACKEND_URL) {
        return String(process.env.BACKEND_URL).replace(/\/$/, '');
    }

    return `http://localhost:${process.env.PORT || 3000}`;
}

function fallbackSandboxUrl(jobId) {
    const baseUrl = process.env.SANDBOX_BASE_URL ? String(process.env.SANDBOX_BASE_URL).replace(/\/$/, '') : backendBaseUrl();
    const suffix = jobId ? `?jobId=${encodeURIComponent(jobId)}` : '';
    return `${baseUrl}/${suffix}`.replace(/\/$/, '');
}

async function deploySandbox(jobId) {
    const key = String(jobId || '').trim();
    if (!key) {
        throw new Error('jobId is required');
    }

    const status = {
        jobId: key,
        state: 'RUNNING',
        url: fallbackSandboxUrl(key),
        updatedAt: new Date().toISOString(),
    };

    sandboxStateStore.set(key, status);
    return status;
}

async function getSandboxStatus(jobId) {
    const key = String(jobId || '').trim();
    if (!key) {
        return { jobId: '', state: 'NOT_FOUND', url: null };
    }

    return sandboxStateStore.get(key) || {
        jobId: key,
        state: 'NOT_FOUND',
        url: null,
        updatedAt: null,
    };
}

async function stopSandbox(jobId) {
    const key = String(jobId || '').trim();
    if (!key) {
        throw new Error('jobId is required');
    }

    const status = {
        jobId: key,
        state: 'STOPPED',
        url: null,
        updatedAt: new Date().toISOString(),
    };

    sandboxStateStore.set(key, status);
    return { ok: true, ...status };
}

module.exports = {
    deploySandbox,
    getSandboxStatus,
    stopSandbox,
};