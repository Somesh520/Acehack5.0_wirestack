require('dotenv').config();
const { Worker, Queue } = require('bullmq');
const { connection } = require('./config/queue');
const { callLLM, sleep } = require('./utils/aiUtils');
const { uploadProjectToS3 } = require('./utils/s3Utils');

// Helper to clear queue in development
async function startWorker() {
    if (process.env.NODE_ENV !== 'production') {
        const queue = new Queue('generation-queue', { connection });
        await queue.drain(true); // Removes all waiting jobs
        console.log('🧹 Development mode: Cleared all pending jobs from the queue.');
    }

    console.log('👷 Generation Worker starting...');

    const generationWorker = new Worker('generation-queue', async (job) => {
        const { idea, stack, type } = job.data;
        console.log(`[JOB:${job.id}] Processing ${type || 'project'} generation...`);

        try {
            if (type === 'analyze-repo' || type === 'analyze-folder' || type === 'analyze-stack') {
                // Handle analysis tasks (future expansion)
                return;
            }

            // --- Step 1: Generate Plan ---
            await job.updateProgress(10);
            console.log(`[JOB:${job.id}] Step 1/3: generating project plan...`);
            const planSystemPrompt = `You are a world-class Elite Senior Software Architect. Given a project idea and tech stack, return ONLY a JSON array of files needed to build a stunning, fully working MVP UI.
Each entry has "name" (filename including relative paths like src/App.jsx or package.json) and "purpose".

CRITICAL RULES FOR GUARANTEED EXECUTION:
1. Return ONLY a valid JSON array.
2. STRICT MAXIMUM OF 5 TO 8 FILES TOTAL. Keep it ultra-lean then we will add more files if needed later.
3. ALL FILES MUST BE IN THE ROOT DIRECTORY (No 'frontend/' or 'backend/' folders!). We are building a standalone React+Vite Frontend MVP.
4. You MUST include a root 'package.json' with standard React/Vite dependencies and "scripts": { "build": "vite build" }.
5. You MUST include a root 'vite.config.js' and 'index.html'.
6. DO NOT write a backend or database. Use mock data, realistic placeholder images, and localStorage so the UI is fully interactive, beautiful, and functional out of the box.
7. Use Tailwind CSS for stunning, modern visuals.`;

            const planReply = await callLLM(planSystemPrompt, `Project idea: "${idea}"\nTech stack: ${stack}`);
            let jsonStr = planReply.trim();
            const firstBracket = jsonStr.indexOf('[');
            const lastBracket = jsonStr.lastIndexOf(']');
            if (firstBracket !== -1 && lastBracket !== -1) jsonStr = jsonStr.slice(firstBracket, lastBracket + 1);
            const plan = JSON.parse(jsonStr);
            console.log(`[JOB:${job.id}] Step 1/3 complete: ${plan.length} files planned.`);

            await job.updateProgress(20);
            const generatedFiles = [];

            // --- Step 2: Generate Files ---
            for (let i = 0; i < plan.length; i++) {
                const file = plan[i];
                console.log(`[JOB:${job.id}] Generating file ${i + 1}/${plan.length}: ${file.name}`);

                // --- Context-Aware Injection ---
                const recentFiles = generatedFiles.slice(-2).map(f => `--- FILE: ${f.name} ---\n${f.content}\n`).join('\n');
                const projectBlueprint = JSON.stringify(plan.map(p => ({ name: p.name, purpose: p.purpose })), null, 2);

                const fileSystemPrompt = `You are an Elite 10x Software Engineer tasked with writing the ultimate, final, production-ready code for a flagship platform.
Project Idea: "${idea}"
Tech Stack: ${stack}

OVERALL BLUEPRINT (For Context):
${projectBlueprint}

RECENTLY GENERATED FILES (For Integration Context):
${recentFiles}

CRITICAL RULES FOR GENERATION:
1. Write ONLY the raw code for the requested file. NO markdown blocks like \`\`\`javascript.
2. ABSOLUTELY ZERO PLACEHOLDERS. Implement the FULL, complex business logic for every single function.
3. You MUST implement a stunning, modern, and beautiful design using Tailwind CSS. Add animations, hover states, and premium aesthetics.
4. DO NOT write any backend API calls. Use realistic mock data arrays, setTimeout for loading states, and localStorage to simulate a real app.
5. Provide a flawless, functional React MVPs that is stunning and completely bug-free.
6. Ensure imports precisely match the blueprint and recent files. Ensure 'react' or 'lucide-react' are imported correctly.
7. DO NOT append any trailing markers, comments, or shell commands like 'EOF', '[END]', or 'Done' at the end of the code. Output ONLY the code.
8. The UI must look like it took weeks to design. Make the project look extremely complete and high-quality to wow investors and judges.`;

                const userMessage = `Write the absolute complete, feature-rich code for the file: "${file.name}"
Purpose: ${file.purpose}`;

                const content = await callLLM(fileSystemPrompt, userMessage);
                // Aggressively clean markdown blocks and trailing artifacts like EOF, [END], etc.
                const cleanContent = content
                    .replace(/^```[\w]*\n?/gm, '')
                    .replace(/```\s*$/gm, '')
                    .replace(/\bfinal code\b/gi, '')
                    .replace(/\nEOF\s*$/g, '') 
                    .replace(/\bEOF\b\s*$/g, '')
                    .trim();

                generatedFiles.push({ name: file.name, content: cleanContent });

                // Progress from 20 to 90
                const progress = 20 + Math.floor(((i + 1) / plan.length) * 70);
                await job.updateProgress(progress);

                // Store intermediate results in job state
                await job.updateData({ ...job.data, generatedFiles });
            }

            // --- Step 3: Upload to S3 ---
            console.log(`[JOB:${job.id}] ☁️ Uploading project to S3...`);
            let s3Folder = null;
            try {
                await uploadProjectToS3(job.id, generatedFiles);
                console.log(`[JOB:${job.id}] ✅ S3 Upload Successful.`);
                s3Folder = `projects/${job.id}/`;
            } catch (s3Err) {
                console.error(`[JOB:${job.id}] ⚠️ S3 Upload Failed:`, s3Err.message);
                console.log(`[JOB:${job.id}] Continuing with local memory fallback...`);
            }

            await job.updateProgress(100);
            return { files: generatedFiles, s3Folder };

        } catch (err) {
            console.error(`[JOB:${job.id}] ERROR:`, err.message);
            throw err;
        }
    }, { connection });

    generationWorker.on('completed', (job) => {
        console.log(`[JOB:${job.id}] ✅ Completed!`);
    });

    generationWorker.on('failed', (job, err) => {
        console.error(`❌ [JOB:${job?.id}] has failed with ${err.message}`);
    });
}

startWorker().catch(console.error);
