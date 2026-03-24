#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

function findFiles(dir, pattern) {
  const results = [];
  
  function walk(currentDir) {
    const files = fs.readdirSync(currentDir);
    
    for (const file of files) {
      const fullPath = path.join(currentDir, file);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        if (!file.startsWith('.') && file !== 'node_modules') {
          walk(fullPath);
        }
      } else if (pattern.test(file)) {
        results.push(fullPath);
      }
    }
  }
  
  walk(dir);
  return results;
}

function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const issues = [];
  const warnings = [];
  const suggestions = [];
  
  // Check for hardcoded colors
  const hardcodedColorPattern = /(?:#(?:[0-9a-fA-F]{3}){1,4}|(?:rgb|hsl)a?\s*\([^)]+\))/g;
  const hardcodedMatches = content.match(hardcodedColorPattern);
  if (hardcodedMatches) {
    issues.push(`Colores hardcodeados encontrados: ${hardcodedMatches.length} instancias`);
  }
  
  // Check for inline styles
  const inlineStylePattern = /style=\{\{[^}]+\}\}/g;
  const inlineMatches = content.match(inlineStylePattern);
  if (inlineMatches && inlineMatches.length > 2) {
    warnings.push(`Muchos estilos inline: ${inlineMatches.length} instancias`);
  }
  
  // Check for hardcoded px values instead of Tailwind
  const pxPattern = /\d+px/g;
  const pxMatches = content.match(pxPattern);
  if (pxMatches && pxMatches.length > 5) {
    suggestions.push(`Considera usar clases de Tailwind en lugar de px: ${pxMatches.length} instancias`);
  }
  
  // Check for missing alt attributes
  const imgPattern = /<img[^>]*>/g;
  const imgMatches = content.match(imgPattern) || [];
  const imgWithoutAlt = imgMatches.filter(img => !img.includes('alt='));
  if (imgWithoutAlt.length > 0) {
    issues.push(`Imágenes sin alt attribute: ${imgWithoutAlt.length}`);
  }
  
  // Check for missing aria-labels on buttons
  const buttonPattern = /<Button[^>]*>\s*<(?!p|span|div)[^>]+>\s*<\/Button>/g;
  const iconButtonMatches = content.match(buttonPattern) || [];
  const iconButtonsWithoutAria = iconButtonMatches.filter(btn => !btn.includes('aria-label'));
  if (iconButtonsWithoutAria.length > 0) {
    warnings.push(`Botones de ícono sin aria-label: ${iconButtonsWithoutAria.length}`);
  }
  
  // Check for className with string concatenation
  const classNameConcat = /\$\{[^}]+\s*\+[^}]+\}/g;
  if (classNameConcat.test(content)) {
    suggestions.push('Considera usar cn() para combinar clases');
  }
  
  return {
    file: filePath,
    issues,
    warnings,
    suggestions,
    score: calculateScore(issues, warnings, suggestions)
  };
}

function calculateScore(issues, warnings, suggestions) {
  let score = 100;
  score -= issues.length * 15;
  score -= warnings.length * 5;
  score -= suggestions.length * 2;
  return Math.max(0, Math.min(100, score));
}

function generateReport(results) {
  log('\n=== UI/UX Analysis Report ===\n', 'cyan');
  
  const totalFiles = results.length;
  const filesWithIssues = results.filter(r => r.issues.length > 0).length;
  const filesWithWarnings = results.filter(r => r.warnings.length > 0).length;
  const avgScore = results.reduce((sum, r) => sum + r.score, 0) / totalFiles;
  
  log(`Archivos analizados: ${totalFiles}`, 'blue');
  log(`Archivos con issues: ${filesWithIssues}`, filesWithIssues > 0 ? 'red' : 'green');
  log(`Archivos con warnings: ${filesWithWarnings}`, filesWithWarnings > 0 ? 'yellow' : 'green');
  log(`Score promedio: ${avgScore.toFixed(1)}/100\n`, avgScore >= 80 ? 'green' : avgScore >= 60 ? 'yellow' : 'red');
  
  // Group by score
  const critical = results.filter(r => r.score < 50);
  const needsWork = results.filter(r => r.score >= 50 && r.score < 80);
  const good = results.filter(r => r.score >= 80);
  
  if (critical.length > 0) {
    log('\n🔴 Archivos Críticos (Score < 50):', 'red');
    critical.forEach(r => {
      log(`\n  ${r.file}`, 'red');
      r.issues.forEach(i => log(`    ❌ ${i}`, 'red'));
      r.warnings.forEach(w => log(`    ⚠️ ${w}`, 'yellow'));
    });
  }
  
  if (needsWork.length > 0) {
    log('\n🟡 Archivos que Necesitan Mejoras (Score 50-79):', 'yellow');
    needsWork.forEach(r => {
      log(`\n  ${r.file} (${r.score}/100)`, 'yellow');
      if (r.issues.length > 0) {
        log('  Issues:', 'red');
        r.issues.forEach(i => log(`    - ${i}`, 'red'));
      }
      if (r.warnings.length > 0) {
        log('  Warnings:', 'yellow');
        r.warnings.forEach(w => log(`    - ${w}`, 'yellow'));
      }
      if (r.suggestions.length > 0) {
        log('  Sugerencias:', 'cyan');
        r.suggestions.forEach(s => log(`    - ${s}`, 'cyan'));
      }
    });
  }
  
  if (good.length > 0) {
    log('\n🟢 Archivos Buenos (Score >= 80):', 'green');
    good.slice(0, 5).forEach(r => {
      log(`  ${r.file} (${r.score}/100)`, 'green');
    });
    if (good.length > 5) {
      log(`  ... y ${good.length - 5} más`, 'green');
    }
  }
  
  // Summary suggestions
  log('\n\n📊 Resumen de Mejoras Sugeridas:', 'magenta');
  
  const allSuggestions = {};
  results.forEach(r => {
    [...r.issues, ...r.warnings, ...r.suggestions].forEach(s => {
      allSuggestions[s] = (allSuggestions[s] || 0) + 1;
    });
  });
  
  const sortedSuggestions = Object.entries(allSuggestions)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  
  sortedSuggestions.forEach(([suggestion, count]) => {
    log(`  • ${suggestion} (${count} archivos)`, 'cyan');
  });
  
  log('\n=== Fin del Reporte ===\n', 'cyan');
  
  return {
    totalFiles,
    filesWithIssues,
    filesWithWarnings,
    avgScore,
    criticalCount: critical.length,
    needsWorkCount: needsWork.length,
    goodCount: good.length
  };
}

// Main execution
const args = process.argv.slice(2);
const targetDir = args[0] || '.';
const filePattern = args[1] ? new RegExp(args[1]) : /\.(tsx|jsx|ts|js)$/;

log(`Analizando directorio: ${targetDir}`, 'blue');
log(`Patrón de archivos: ${filePattern}\n`, 'blue');

const files = findFiles(targetDir, filePattern);

if (files.length === 0) {
  log('No se encontraron archivos para analizar.', 'yellow');
  process.exit(0);
}

const results = files.map(analyzeFile);
const summary = generateReport(results);

// Exit with error code if critical issues found
process.exit(summary.criticalCount > 0 ? 1 : 0);