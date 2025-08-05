#!/usr/bin/env node

/**
 * Special handling for company entities
 * Companies need different treatment because they exist in multiple contexts
 */

const { db, end } = require('./postgres-db');

async function handleCompanyEntities() {
    try {
        console.log('Handling company entities...\n');
        
        // Step 1: Get all unique companies from entities
        const companyEntities = await db.all(`
            WITH company_objects AS (
                SELECT DISTINCT 
                    jsonb_array_elements(entities->'companies') as company_obj
                FROM intelligence.baseline_analysis
                WHERE entities->'companies' IS NOT NULL
            )
            SELECT DISTINCT
                LOWER(company_obj->>'name') as name,
                company_obj->>'name' as original_name
            FROM company_objects
            WHERE company_obj->>'name' IS NOT NULL
            ORDER BY name
        `);
        
        console.log(`Found ${companyEntities.length} unique company entities\n`);
        
        // Step 2: Create company groups with special type
        let created = 0;
        for (const company of companyEntities) {
            try {
                // Check if already exists as a group
                const existing = await db.get(`
                    SELECT id FROM intelligence.entity_groups
                    WHERE LOWER(canonical_name) = $1
                `, [company.name]);
                
                let groupId;
                if (!existing) {
                    // Create as company entity group
                    const result = await db.get(`
                        INSERT INTO intelligence.entity_groups 
                        (canonical_name, group_type, description, auto_created, created_by)
                        VALUES ($1, 'company', $2, TRUE, 'company-handler')
                        RETURNING id
                    `, [
                        company.original_name, 
                        `Company entity: ${company.original_name}`
                    ]);
                    groupId = result.id;
                    created++;
                } else {
                    groupId = existing.id;
                    // Update type to company if it wasn't already
                    await db.run(`
                        UPDATE intelligence.entity_groups
                        SET group_type = 'company'
                        WHERE id = $1 AND group_type != 'company'
                    `, [groupId]);
                }
                
                // Add the company name as its own variation
                await db.run(`
                    INSERT INTO intelligence.entity_variations
                    (group_id, variation, is_primary, source, confidence, added_by)
                    VALUES ($1, $2, TRUE, 'company-entity', 1.0, 'company-handler')
                    ON CONFLICT (variation) DO UPDATE
                    SET group_id = $1, source = 'company-entity'
                `, [groupId, company.name]);
                
                // Also add the original case version if different
                if (company.name !== company.original_name.toLowerCase()) {
                    await db.run(`
                        INSERT INTO intelligence.entity_variations
                        (group_id, variation, is_primary, source, confidence, added_by)
                        VALUES ($1, $2, FALSE, 'company-entity', 1.0, 'company-handler')
                        ON CONFLICT (variation) DO NOTHING
                    `, [groupId, company.original_name.toLowerCase()]);
                }
                
            } catch (error) {
                console.error(`Error handling company ${company.original_name}:`, error.message);
            }
        }
        
        console.log(`Created ${created} new company entity groups\n`);
        
        // Step 3: Link company products to their parent companies
        const productLinks = {
            'openai': ['chatgpt', 'gpt-4', 'gpt-3', 'dall-e', 'whisper', 'codex'],
            'microsoft': ['copilot', 'azure', 'bing', 'teams', 'office', 'visual studio'],
            'google': ['bard', 'gemini', 'palm', 'bert', 'lamda', 'google cloud'],
            'meta': ['llama', 'facebook', 'instagram', 'whatsapp', 'threads'],
            'amazon': ['aws', 'alexa', 'bedrock', 'codewhisperer'],
            'nvidia': ['cuda', 'tensorrt', 'triton', 'nemo'],
            'anthropic': ['claude'],
            'stability ai': ['stable diffusion', 'stable video', 'stable audio'],
            'adobe': ['firefly', 'photoshop', 'creative cloud', 'premiere'],
            'salesforce': ['einstein', 'tableau', 'slack']
        };
        
        console.log('Creating company-product relationships...');
        let relationshipsCreated = 0;
        
        for (const [companyName, products] of Object.entries(productLinks)) {
            // Get company group
            const companyGroup = await db.get(`
                SELECT id FROM intelligence.entity_groups
                WHERE LOWER(canonical_name) = $1
                AND group_type = 'company'
            `, [companyName]);
            
            if (!companyGroup) continue;
            
            for (const product of products) {
                // Get product group
                const productGroup = await db.get(`
                    SELECT g.id 
                    FROM intelligence.entity_groups g
                    JOIN intelligence.entity_variations v ON g.id = v.group_id
                    WHERE LOWER(v.variation) = $1
                `, [product]);
                
                if (productGroup) {
                    // Create company-owns-product relationship
                    await db.run(`
                        INSERT INTO intelligence.entity_relationships
                        (source_group_id, target_group_id, relationship_type, confidence)
                        VALUES ($1, $2, 'owns', 1.0)
                        ON CONFLICT (source_group_id, target_group_id, relationship_type) 
                        DO NOTHING
                    `, [companyGroup.id, productGroup.id]);
                    relationshipsCreated++;
                }
            }
        }
        
        console.log(`Created ${relationshipsCreated} company-product relationships\n`);
        
        // Step 4: Report on company entities
        const stats = await db.get(`
            SELECT 
                COUNT(DISTINCT g.id) as company_groups,
                COUNT(DISTINCT v.id) as company_variations,
                COUNT(DISTINCT r.id) as company_relationships
            FROM intelligence.entity_groups g
            LEFT JOIN intelligence.entity_variations v ON g.id = v.group_id
            LEFT JOIN intelligence.entity_relationships r ON g.id = r.source_group_id
            WHERE g.group_type = 'company'
        `);
        
        console.log('=== Company Entity Statistics ===');
        console.log(`Company groups: ${stats.company_groups}`);
        console.log(`Company variations: ${stats.company_variations}`);
        console.log(`Company relationships: ${stats.company_relationships}`);
        
        // Show some examples
        const examples = await db.all(`
            SELECT 
                g.canonical_name as company,
                COUNT(DISTINCT r.target_group_id) as owned_products
            FROM intelligence.entity_groups g
            LEFT JOIN intelligence.entity_relationships r 
                ON g.id = r.source_group_id 
                AND r.relationship_type = 'owns'
            WHERE g.group_type = 'company'
            GROUP BY g.id, g.canonical_name
            HAVING COUNT(DISTINCT r.target_group_id) > 0
            ORDER BY owned_products DESC
            LIMIT 10
        `);
        
        console.log('\nCompanies with owned products:');
        examples.forEach(e => {
            console.log(`  ${e.company}: ${e.owned_products} products`);
        });
        
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
}

// Run if called directly
if (require.main === module) {
    handleCompanyEntities()
        .then(() => {
            console.log('\nCompany entity handling complete!');
            process.exit(0);
        })
        .catch(error => {
            console.error('Failed:', error);
            process.exit(1);
        })
        .finally(() => end());
}

module.exports = { handleCompanyEntities };
