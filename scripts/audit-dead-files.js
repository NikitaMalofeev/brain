#!/usr/bin/env node

/**
 * Dead files audit script for Supabase Storage
 * Finds files in storage that are not referenced in database
 * 
 * Usage: node scripts/audit-dead-files.js
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_KEY env variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Tables and columns that contain file references
const FILE_REFERENCES = [
    { table: 'lesson_blocks', column: 'content_url' },
    { table: 'lessons', column: 'cover_image_path' },
    { table: 'course_stages', column: 'cover_image_path' },
    { table: 'materials', column: 'cover_image_path' },
    { table: 'material_blocks', column: 'content_url' },
    { table: 'submissions', column: 'file_url' },
    { table: 'users', column: 'photo_url' },
];

/**
 * Extract file path from URL or return path as is
 */
function extractFilePath(urlOrPath) {
    if (!urlOrPath) return null;

    // If it's a full Supabase Storage URL
    if (urlOrPath.includes('/storage/v1/object/public/media/')) {
        return urlOrPath.split('/storage/v1/object/public/media/')[1];
    }

    // If it's external service URL (Kinescope, YouTube, etc.) - ignore
    if (urlOrPath.startsWith('http') && !urlOrPath.includes(supabaseUrl)) {
        return null;
    }

    // If it's relative path - return as is
    return urlOrPath;
}

/**
 * Get all file references from database
 */
async function getAllFileReferences() {
    const references = [];

    console.log('📋 Collecting file references from database...');

    for (const ref of FILE_REFERENCES) {
        try {
            const { data, error } = await supabase
                .from(ref.table)
                .select(`id, ${ref.column}`)
                .not(ref.column, 'is', null)
                .not(ref.column, 'eq', '');

            if (error) {
                console.warn(`⚠️  Error loading ${ref.table}.${ref.column}:`, error.message);
                continue;
            }

            if (data) {
                for (const row of data) {
                    const urlOrPath = row[ref.column];
                    const filePath = extractFilePath(urlOrPath);

                    if (filePath) {
                        references.push({
                            table: ref.table,
                            column: ref.column,
                            path: filePath,
                            fullUrl: urlOrPath
                        });
                    }
                }
            }

            console.log(`   ✅ ${ref.table}.${ref.column}: ${data?.length || 0} records`);
        } catch (err) {
            console.warn(`⚠️  Error processing ${ref.table}.${ref.column}:`, err);
        }
    }

    return references;
}

/**
 * Get all files from Supabase Storage
 */
async function getAllStorageFiles() {
    console.log('📂 Getting files list from Supabase Storage...');

    const allFiles = [];

    // Get files from all folders
    const folders = ['images', 'audio', 'documents', 'videos'];

    for (const folder of folders) {
        try {
            const { data, error } = await supabase.storage
                .from('media')
                .list(folder, {
                    limit: 1000,
                    sortBy: { column: 'name', order: 'asc' }
                });

            if (error) {
                console.warn(`⚠️  Error loading folder ${folder}:`, error.message);
                continue;
            }

            if (data) {
                for (const file of data) {
                    if (file.name) {
                        allFiles.push(`${folder}/${file.name}`);
                    }
                }
            }

            console.log(`   ✅ ${folder}/: ${data?.length || 0} files`);
        } catch (err) {
            console.warn(`⚠️  Error processing folder ${folder}:`, err);
        }
    }

    return allFiles;
}

/**
 * Main audit function
 */
async function auditDeadFiles() {
    console.log('🔍 DEAD FILES AUDIT FOR SUPABASE STORAGE');
    console.log('==========================================\n');

    try {
        // 1. Get all file references from DB
        const fileReferences = await getAllFileReferences();
        console.log(`\n📊 Found references in DB: ${fileReferences.length}`);

        // 2. Get all files from Storage
        const storageFiles = await getAllStorageFiles();
        console.log(`📊 Found files in Storage: ${storageFiles.length}\n`);

        // 3. Create Set of file paths in DB for fast lookup
        const referencedPaths = new Set(fileReferences.map(ref => ref.path));

        // 4. Find "dead" files
        const deadFiles = storageFiles.filter(filePath => !referencedPaths.has(filePath));

        // 5. Find "broken" references (in DB but not in Storage)
        const brokenReferences = fileReferences.filter(ref => !storageFiles.includes(ref.path));

        // 6. Output results
        console.log('📈 AUDIT RESULTS:');
        console.log('=================');
        console.log(`✅ Files in use: ${referencedPaths.size}`);
        console.log(`💀 Dead files: ${deadFiles.length}`);
        console.log(`💔 Broken references: ${brokenReferences.length}`);

        if (deadFiles.length > 0) {
            console.log('\n💀 DEAD FILES (in Storage but no references in DB):');
            deadFiles.forEach((file, index) => {
                console.log(`${index + 1}. ${file}`);
            });
        }

        if (brokenReferences.length > 0) {
            console.log('\n💔 BROKEN REFERENCES (in DB but file not in Storage):');
            brokenReferences.forEach((ref, index) => {
                console.log(`${index + 1}. ${ref.table}.${ref.column}: ${ref.path}`);
            });
        }

        console.log('\n✅ Audit completed successfully!');

        if (deadFiles.length > 0) {
            console.log('\n💡 RECOMMENDATIONS:');
            console.log('- Create backup before deleting files');
            console.log('- Verify files are really not used');
            console.log('- Delete dead files to free up space');
        }

    } catch (error) {
        console.error('❌ Error during audit:', error);
        process.exit(1);
    }
}

// Run audit
auditDeadFiles(); 