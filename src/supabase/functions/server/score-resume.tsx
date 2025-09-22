import { pipeline } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.6.0';
import * as kv from './kv_store.tsx';

let embeddingPipeline: any = null;

async function calculateScores(requirements: string[], resumeText: string, embeddingPipeline: any) {
    const requirementEmbeddings = await Promise.all(
        requirements.map(async (req) => {
            const output = await embeddingPipeline(req, {
                pooling: 'mean',
                normalize: true,
            });
            return Array.from(output.data);
        })
    );

    const resumeOutput = await embeddingPipeline(resumeText, {
        pooling: 'mean',
        normalize: true,
    });
    const resumeEmbedding = Array.from(resumeOutput.data);

    const cosineSimilarity = (a: number[], b: number[]) => {
        const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
        const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
        const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
        return dotProduct / (magnitudeA * magnitudeB);
    };

    const sectionScores = requirements.map((req, index) => {
        const score = cosineSimilarity(resumeEmbedding, requirementEmbeddings[index]);
        return {
            requirement: req,
            score: Math.max(0, Math.min(1, score)),
            matchPercentage: Math.round(Math.max(0, Math.min(1, score)) * 100)
        };
    });

    const overallScore = sectionScores.reduce((sum, item) => sum + item.score, 0) / sectionScores.length;

    return {
        overallScore,
        sectionScores,
        analysis: {
            overallScore: Math.round(overallScore * 100),
            strengths: sectionScores.filter(s => s.score > 0.7).map(s => s.requirement),
            improvements: sectionScores.filter(s => s.score < 0.4).map(s => s.requirement),
            detailedScores: sectionScores
        }
    };
}

function extractRequirements(job: any): string[] {
    const requirements = [];
    if (job.assessmentConfiguration) {
        const config = job.assessmentConfiguration;
        if (config.selectedTechnicalSubSkills) {
            requirements.push(...config.selectedTechnicalSubSkills);
        }
        if (config.selectedSoftSkillsSubAreas) {
            requirements.push(...config.selectedSoftSkillsSubAreas);
        }
        if (config.customTechnicalSkills) {
            requirements.push(...config.customTechnicalSkills.split('\n').filter((s: string) => s.trim()));
        }
        if (config.customSoftSkills) {
            requirements.push(...config.customSoftSkills.split('\n').filter((s: string) => s.trim()));
        }
    }
    if (job.requiredSkills) {
        if (job.requiredSkills.technical) {
            requirements.push(...job.requiredSkills.technical);
        }
        if (job.requiredSkills.softSkills) {
            requirements.push(...job.requiredSkills.softSkills);
        }
        if (job.requiredSkills.software) {
            requirements.push(...job.requiredSkills.software);
        }
    }
    if (job.requirements) {
        requirements.push(...job.requirements);
    }
    return [...new Set(requirements)].filter(req => req && req.trim().length > 0);
}

export async function scoreResumeInBackground(applicationKey: string, positionId: string, userId: string) {
    try {
        const job = await kv.get(`job-position:${positionId}`);
        if (!job) throw new Error(`Failed to fetch job: ${positionId}`);

        const profile = await kv.get(`profile:${userId}`);
        if (!profile) throw new Error(`Failed to fetch profile: ${userId}`);
        if (!profile.resume_text) throw new Error('No resume text available');

        const requirements = extractRequirements(job);

        if (!embeddingPipeline) {
            embeddingPipeline = await pipeline(
                'feature-extraction',
                'Supabase/gte-small'
            );
        }

        const scores = await calculateScores(requirements, profile.resume_text, embeddingPipeline);

        const application = await kv.get(applicationKey);
        if (application) {
            application.resumeScore = {
                success: true,
                ...scores
            };
            application.resumeScoreStatus = 'completed';
            await kv.set(applicationKey, application);
        }
    } catch (error) {
        console.error('Background resume scoring failed:', error);
        const application = await kv.get(applicationKey);
        if (application) {
            application.resumeScoreStatus = 'failed';
            await kv.set(applicationKey, application);
        }
    }
}