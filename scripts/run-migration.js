#!/usr/bin/env node
/**
 * Script para ejecutar migraciones SQL en Supabase
 * Usa el Service Role Key para ejecutar SQL directamente
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables manually from .env.local
function loadEnvFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const equalIndex = trimmed.indexOf('=');
        if (equalIndex > 0) {
          const key = trimmed.substring(0, equalIndex).trim();
          let value = trimmed.substring(equalIndex + 1).trim();
          // Remove quotes if present
          if ((value.startsWith('"') && value.endsWith('"')) || 
              (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
          }
          process.env[key] = value;
        }
      }
    }
  } catch (err) {
    console.error(`Error loading ${filePath}:`, err.message);
  }
}

// Load .env.local
loadEnvFile(path.join(__dirname, '..', '.env.local'));

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ Error: Faltan variables de entorno');
  console.error('   Asegúrate de tener NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env.local');
  process.exit(1);
}

async function executeMigration() {
  console.log('🚀 Ejecutando migración de RLS policies...\n');
  
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  // Read migration file
  const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '009_update_rls_for_multiple_logs.sql');
  
  if (!fs.existsSync(migrationPath)) {
    console.error(`❌ Archivo de migración no encontrado: ${migrationPath}`);
    process.exit(1);
  }

  let sql = fs.readFileSync(migrationPath, 'utf8');
  
  // Remove the DO block at the end (verification block) as it may cause issues
  const doBlockIndex = sql.indexOf('DO $$');
  if (doBlockIndex !== -1) {
    sql = sql.substring(0, doBlockIndex);
  }
  
  console.log('📄 SQL a ejecutar:');
  console.log('─'.repeat(60));
  console.log(sql.substring(0, 500) + '...');
  console.log('─'.repeat(60));
  console.log();

  try {
    // Execute SQL using rpc
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      // If exec_sql doesn't exist, try direct query
      console.log('⚠️  RPC exec_sql no disponible, intentando método alternativo...\n');
      
      // Alternative: Execute statements one by one
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'));
      
      console.log(`📝 Ejecutando ${statements.length} statements...\n`);
      
      for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i] + ';';
        console.log(`  [${i + 1}/${statements.length}] ${stmt.substring(0, 80)}...`);
        
        const { error: stmtError } = await supabase.rpc('exec_sql', { 
          sql_query: stmt 
        });
        
        if (stmtError && !stmtError.message.includes('exec_sql')) {
          console.error(`  ❌ Error: ${stmtError.message}`);
        }
      }
    } else {
      console.log('✅ Migración ejecutada exitosamente');
    }
    
    console.log('\n✨ Proceso completado');
    console.log('\n📋 Nota: Si ves errores relacionados con "exec_sql", necesitas:');
    console.log('   1. Ir al SQL Editor de Supabase');
    console.log('   2. Ejecutar el archivo manualmente');
    console.log(`   3. URL: ${SUPABASE_URL}/project/sql`);
    
  } catch (err) {
    console.error('\n❌ Error ejecutando migración:', err.message);
    console.log('\n💡 Solución alternativa:');
    console.log('   1. Ve al SQL Editor de Supabase');
    console.log(`      ${SUPABASE_URL}/project/sql`);
    console.log('   2. Copia y pega el contenido de:');
    console.log(`      ${migrationPath}`);
    console.log('   3. Ejecuta el SQL');
    process.exit(1);
  }
}

executeMigration();
