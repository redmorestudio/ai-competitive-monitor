#!/usr/bin/env node

/**
 * Check for duplicate GitHub Pages artifacts
 * This script helps identify if multiple workflows are creating conflicting artifacts
 */

const { Octokit } = require('@octokit/rest');
const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;

if (!token) {
    console.error('❌ No GitHub token found. Set GITHUB_TOKEN or GH_TOKEN environment variable.');
    process.exit(1);
}

const octokit = new Octokit({ auth: token });

async function checkArtifacts() {
    try {
        // Get recent workflow runs
        const { data: runs } = await octokit.actions.listWorkflowRunsForRepo({
            owner: 'redmorestudio',
            repo: 'ai-competitive-monitor',
            per_page: 10
        });

        console.log('📊 Recent workflow runs:\n');
        
        for (const run of runs.workflow_runs) {
            console.log(`Run #${run.run_number} - ${run.name}`);
            console.log(`  Status: ${run.status}`);
            console.log(`  Created: ${run.created_at}`);
            
            // Get artifacts for this run
            const { data: artifacts } = await octokit.actions.listWorkflowRunArtifacts({
                owner: 'redmorestudio',
                repo: 'ai-competitive-monitor',
                run_id: run.id
            });
            
            const pageArtifacts = artifacts.artifacts.filter(a => a.name === 'github-pages');
            if (pageArtifacts.length > 0) {
                console.log(`  ⚠️  Has ${pageArtifacts.length} github-pages artifact(s)`);
            }
            console.log();
        }
        
    } catch (error) {
        console.error('Error checking artifacts:', error.message);
    }
}

checkArtifacts();
