#!/usr/bin/env node

/**
 * Diff Generation Utility for AI Competitive Monitor
 * 
 * This script generates unified diffs for content changes and stores them
 * in the change_detection table for display in the dashboard.
 */

const path = require('path');
const dbManager = require('../db-manager');
const { diffLines, createPatch } = require('diff');

/**
 * Generate a unified diff between two content strings
 * @param {string} oldContent - The old content
 * @param {string} newContent - The new content
 * @param {string} oldLabel - Label for old content (e.g., "Before - 2025-07-12")
 * @param {string} newLabel - Label for new content (e.g., "After - 2025-07-15")
 * @returns {string} Unified diff string
 */
function generateUnifiedDiff(oldContent, newContent, oldLabel = 'Before', newLabel = 'After') {
    try {
        if (!oldContent || !newContent) {
            return 'No content available for comparison';
        }
        
        // Create a unified diff
        const patch = createPatch(
            'content',
            oldContent,
            newContent,
            oldLabel,
            newLabel,
            { context: 3 } // Show 3 lines of context around changes
        );
        
        return patch;
    } catch (error) {
        console.error('Error generating diff:', error);
        return 'Error generating diff';
    }
}

/**
 * Generate a visual HTML diff for better display
 * @param {string} oldContent - The old content
 * @param {string} newContent - The new content
 * @returns {object} Object with html diff and stats
 */
function generateVisualDiff(oldContent, newContent) {
    try {
        if (!oldContent || !newContent) {
            return {
                html: '<p>No content available for comparison</p>',
                stats: { added: 0, removed: 0, changed: 0 }
            };
        }
        
        const diff = diffLines(oldContent, newContent);
        let html = '<div class="diff-container">';
        let stats = { added: 0, removed: 0, changed: 0 };
        
        diff.forEach(part => {
            const lines = part.value.split('\n').filter(line => line.length > 0);
            
            if (part.added) {
                stats.added += lines.length;
                lines.forEach(line => {
                    html += `<div class="diff-line diff-added"><span class="diff-marker">+</span><span class="diff-content">${escapeHtml(line)}</span></div>`;
                });
            } else if (part.removed) {
                stats.removed += lines.length;
                lines.forEach(line => {
                    html += `<div class="diff-line diff-removed"><span class="diff-marker">-</span><span class="diff-content">${escapeHtml(line)}</span></div>`;
                });
            } else {
                // Context lines
                lines.forEach(line => {
                    html += `<div class="diff-line diff-context"><span class="diff-marker"> </span><span class="diff-content">${escapeHtml(line)}</span></div>`;
                });
            }
        });
        
        html += '</div>';
        
        stats.changed = Math.min(stats.added, stats.removed);
        
        return { html, stats };
    } catch (error) {
        console.error('Error generating visual diff:', error);
        return {
            html: '<p>Error generating diff</p>',
            stats: { added: 0, removed: 0, changed: 0 }
        };
    }
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

/**
 * Add content_diff column to change_detection table if it doesn't exist
 */
function ensureDiffColumn(processedDb) {
    try {
        // Check if column exists
        const columnExists = processedDb.prepare(`
            SELECT COUNT(*) as count 
            FROM pragma_table_info('change_detection') 
            WHERE name='content_diff'
        `).get().count > 0;
        
        if (!columnExists) {
            console.log('📊 Adding content_diff column to change_detection table...');
            processedDb.exec(`
                ALTER TABLE change_detection ADD COLUMN content_diff TEXT;
                ALTER TABLE change_detection ADD COLUMN diff_type TEXT DEFAULT 'unified';
                ALTER TABLE change_detection ADD COLUMN diff_stats TEXT;
            `);
            console.log('✅ Diff columns added successfully');
        }
    } catch (error) {
        console.error('Error ensuring diff column:', error);
        // Column might already exist, continue
    }
}

/**
 * Generate diffs for recent changes that don't have them yet
 */
function generateMissingDiffs() {
    console.log('🔄 Starting diff generation for recent changes...');
    
    try {
        const processedDb = dbManager.getProcessedDb();
        
        // Ensure diff column exists
        ensureDiffColumn(processedDb);
        
        // Get recent changes without diffs
        const recentChanges = processedDb.prepare(`
            SELECT 
                cd.id,
                cd.old_content_id,
                cd.new_content_id,
                cd.detected_at
            FROM change_detection cd
            WHERE cd.content_diff IS NULL
            AND cd.old_content_id IS NOT NULL
            AND cd.new_content_id IS NOT NULL
            AND cd.detected_at > datetime('now', '-30 days')
            ORDER BY cd.detected_at DESC
            LIMIT 100
        `).all();
        
        console.log(`📋 Found ${recentChanges.length} changes without diffs`);
        
        if (recentChanges.length === 0) {
            console.log('✅ All recent changes already have diffs');
            return;
        }
        
        // Prepare statements
        const getContentStmt = processedDb.prepare('SELECT markdown_text FROM markdown_content WHERE id = ?');
        const updateDiffStmt = processedDb.prepare(`
            UPDATE change_detection 
            SET content_diff = ?, diff_type = ?, diff_stats = ?
            WHERE id = ?
        `);
        
        let processed = 0;
        let errors = 0;
        
        for (const change of recentChanges) {
            try {
                // Get old and new content
                const oldContent = getContentStmt.get(change.old_content_id);
                const newContent = getContentStmt.get(change.new_content_id);
                
                if (!oldContent || !newContent) {
                    console.warn(`⚠️ Missing content for change ${change.id}`);
                    errors++;
                    continue;
                }
                
                // Generate unified diff
                const unifiedDiff = generateUnifiedDiff(
                    oldContent.markdown_text,
                    newContent.markdown_text,
                    `Before - ${change.detected_at}`,
                    `After - ${change.detected_at}`
                );
                
                // Generate visual diff stats
                const visualDiff = generateVisualDiff(
                    oldContent.markdown_text,
                    newContent.markdown_text
                );
                
                // Update database
                updateDiffStmt.run(
                    unifiedDiff,
                    'unified',
                    JSON.stringify(visualDiff.stats),
                    change.id
                );
                
                processed++;
                
                if (processed % 10 === 0) {
                    console.log(`⏳ Processed ${processed}/${recentChanges.length} diffs...`);
                }
                
            } catch (error) {
                console.error(`❌ Error processing change ${change.id}:`, error.message);
                errors++;
            }
        }
        
        console.log(`\n✅ Diff generation completed:`);
        console.log(`   - Processed: ${processed}`);
        console.log(`   - Errors: ${errors}`);
        
        return { processed, errors };
        
    } catch (error) {
        console.error('❌ Error generating diffs:', error);
        throw error;
    }
}

/**
 * Generate diff for a specific change
 */
function generateDiffForChange(changeId) {
    try {
        const processedDb = dbManager.getProcessedDb();
        
        // Ensure diff column exists
        ensureDiffColumn(processedDb);
        
        // Get change details
        const change = processedDb.prepare(`
            SELECT 
                cd.id,
                cd.old_content_id,
                cd.new_content_id,
                cd.detected_at
            FROM change_detection cd
            WHERE cd.id = ?
        `).get(changeId);
        
        if (!change) {
            throw new Error(`Change ${changeId} not found`);
        }
        
        if (!change.old_content_id || !change.new_content_id) {
            throw new Error(`Change ${changeId} missing content IDs`);
        }
        
        // Get content
        const getContentStmt = processedDb.prepare('SELECT markdown_text FROM markdown_content WHERE id = ?');
        const oldContent = getContentStmt.get(change.old_content_id);
        const newContent = getContentStmt.get(change.new_content_id);
        
        if (!oldContent || !newContent) {
            throw new Error(`Content not found for change ${changeId}`);
        }
        
        // Generate diffs
        const unifiedDiff = generateUnifiedDiff(
            oldContent.markdown_text,
            newContent.markdown_text,
            `Before - ${change.detected_at}`,
            `After - ${change.detected_at}`
        );
        
        const visualDiff = generateVisualDiff(
            oldContent.markdown_text,
            newContent.markdown_text
        );
        
        // Update database
        processedDb.prepare(`
            UPDATE change_detection 
            SET content_diff = ?, diff_type = ?, diff_stats = ?
            WHERE id = ?
        `).run(
            unifiedDiff,
            'unified',
            JSON.stringify(visualDiff.stats),
            changeId
        );
        
        console.log(`✅ Generated diff for change ${changeId}`);
        
        return {
            unified: unifiedDiff,
            visual: visualDiff.html,
            stats: visualDiff.stats
        };
        
    } catch (error) {
        console.error(`❌ Error generating diff for change ${changeId}:`, error);
        throw error;
    }
}

// Run if called directly
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.length > 0 && args[0] === '--change-id') {
        // Generate diff for specific change
        const changeId = parseInt(args[1]);
        if (isNaN(changeId)) {
            console.error('❌ Invalid change ID');
            process.exit(1);
        }
        
        try {
            const result = generateDiffForChange(changeId);
            console.log('\n📄 Unified Diff:');
            console.log(result.unified);
            console.log('\n📊 Diff Stats:', result.stats);
            process.exit(0);
        } catch (error) {
            process.exit(1);
        }
    } else {
        // Generate missing diffs
        try {
            generateMissingDiffs();
            process.exit(0);
        } catch (error) {
            process.exit(1);
        }
    }
}

module.exports = {
    generateUnifiedDiff,
    generateVisualDiff,
    generateMissingDiffs,
    generateDiffForChange,
    ensureDiffColumn
};
