const projectStore = new Map();

function cloneFiles(files) {
    return (Array.isArray(files) ? files : [])
        .filter((file) => file && typeof file.name === 'string')
        .map((file) => ({
            name: String(file.name),
            content: String(file.content || ''),
        }));
}

async function uploadProjectToS3(jobId, files) {
    const key = String(jobId || '').trim();
    if (!key) {
        throw new Error('jobId is required');
    }

    const normalizedFiles = cloneFiles(files);
    projectStore.set(key, normalizedFiles);

    return normalizedFiles.map((file) => ({
        name: file.name,
        url: `memory://projects/${encodeURIComponent(key)}/${encodeURIComponent(file.name)}`,
    }));
}

async function fetchProjectFromS3(jobId) {
    const key = String(jobId || '').trim();
    if (!key) {
        return [];
    }

    const files = projectStore.get(key) || [];
    return cloneFiles(files);
}

module.exports = {
    uploadProjectToS3,
    fetchProjectFromS3,
};