#!/usr/bin/env node

/**
 * DATABASE QUALITY AUDIT - Scan exhaustif de toutes les tables
 *
 * - Découverte auto des tables via pg-meta (schémas configurables)
 * - Pagination par table pour compter: valeurs remplies, par défaut, nulles
 * - Détection générique des colonnes problématiques (faible couverture)
 * - Rapport JSON global + score qualité
 */

require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs').promises

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// === Configuration ===
const SCHEMAS = ['public']            // ajoutez d’autres schémas si vous voulez les auditer
const PAGE_SIZE = 1000                // pagination par table
const LOW_COVERAGE_THRESHOLD = 40     // < 40% = problématique
const DEFAULT_LIKE_CHECK = true       // active la détection “valeurs par défaut”

class DatabaseQualityAuditor {
  constructor() {
    this.auditResults = {}
    this.recommendations = []
  }

  // ------------------------------
  // Meta helpers (pg-meta REST API)
  // ------------------------------
  async metaGet(path, params = {}) {
    const url = new URL(`${SUPABASE_URL}/pg/${path}`)
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null) url.searchParams.set(k, v)
    }
    const res = await fetch(url.toString(), {
      headers: {
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
    })
    if (!res.ok) {
      const txt = await res.text()
      throw new Error(`pg-meta ${path} failed: ${res.status} ${txt}`)
    }
    return res.json()
  }

  async listTables() {
    const all = []
    for (const schema of SCHEMAS) {
      const tables = await this.metaGet('tables', { schema })
      // filtre les tables systèmes communes si besoin
      const filtered = tables.filter(t =>
        !t.name.startsWith('_') &&
        !['supabase_migrations'].includes(t.name)
      )
      all.push(...filtered.map(t => ({ schema, name: t.name })))
    }
    // tri alpha pour stabilité
    all.sort((a, b) => a.schema.localeCompare(b.schema) || a.name.localeCompare(b.name))
    return all
  }

  async listColumns(schema, table) {
    const cols = await this.metaGet('columns', { schema, table })
    // renvoie sous forme simple
    return cols
      .sort((a, b) => a.ordinal_position - b.ordinal_position)
      .map(c => ({
        name: c.name,
        data_type: c.data_type,
        is_nullable: c.is_nullable,
        default_value: c.default_value,
      }))
  }

  // ------------------------------
  // Valeurs / règles de remplissage
  // ------------------------------
  isEmptyObjectOrArray(val) {
    if (Array.isArray(val)) return val.length === 0
    if (val && typeof val === 'object') return Object.keys(val).length === 0
    return false
  }

  isDefaultLike(val) {
    if (!DEFAULT_LIKE_CHECK) return false
    if (val === 0 || val === '0' || val === false || val === '') return true
    if (this.isEmptyObjectOrArray(val)) return true
    return false
  }

  isFilled(val) {
    if (val === null || val === undefined) return false
    if (val === '') return false
    if (this.isEmptyObjectOrArray(val)) return false
    // NOTE: 0/false comptent comme “rempli” d’un point de vue strict,
    // la détection “par défaut” est suivie séparément via isDefaultLike.
    return true
  }

  // ------------------------------
  // Scan d’une table (pagination)
  // ------------------------------
  async scanTable(schema, table) {
    console.log(`\n🔍 Table: ${schema}.${table} — scan en cours...`)

    // Découverte colonnes (stable, sans toucher aux données)
    const columns = await this.listColumns(schema, table)
    if (columns.length === 0) {
      console.log('   ⚠️ Pas de colonnes détectées (vue vide ou table sans colonnes)') 
      return { rows: 0, columns: [], stats: {} }
    }

    // Stats par colonne
    const stats = {}
    for (const col of columns) {
      stats[col.name] = {
        filled: 0,
        nulls: 0,
        default_like: 0,
      }
    }

    // Pagination
    let from = 0
    let batchCount = 0
    let totalRows = 0
    while (true) {
      // on sélectionne toutes les colonnes (évite les HEAD pour ne pas dépendre de count serveur)
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .range(from, from + PAGE_SIZE - 1)

      if (error) throw new Error(`Erreur lecture ${schema}.${table}: ${error.message}`)

      const rows = data || []
      batchCount = rows.length
      totalRows += batchCount

      // accumulateur
      for (const row of rows) {
        for (const col of columns) {
          const v = row[col.name]
          if (v === null || v === undefined) {
            stats[col.name].nulls++
          } else {
            if (this.isFilled(v)) stats[col.name].filled++
            if (this.isDefaultLike(v)) stats[col.name].default_like++
          }
        }
      }

      if (batchCount < PAGE_SIZE) break
      from += PAGE_SIZE
    }

    // Calculs finaux
    const columnAnalysis = {}
    for (const col of columns) {
      const s = stats[col.name]
      const coverage = totalRows === 0 ? 0 : Math.round((s.filled / totalRows) * 100)
      columnAnalysis[col.name] = {
        status: this.getColumnStatus(coverage),
        coverage,
        filled: s.filled,
        nulls: s.nulls,
        default_like: s.default_like,
        total: totalRows,
        data_type: col.data_type,
        is_nullable: col.is_nullable,
        default_value: col.default_value
      }
    }

    this.auditResults[`${schema}.${table}`] = {
      schema,
      table,
      total_rows: totalRows,
      column_analysis: columnAnalysis,
      summary: this.generateTableSummary(columnAnalysis)
    }

    // Affichage console condensé
    console.log(`   📊 Lignes: ${totalRows}`)
    console.log('   🟢 ≥90%:', Object.keys(columnAnalysis).filter(c => columnAnalysis[c].status === 'EXCELLENT').length)
    console.log('   🟡 40–89%:', Object.keys(columnAnalysis).filter(c => ['BON', 'MOYEN'].includes(columnAnalysis[c].status)).length)
    console.log('   🔴 <40%:', Object.keys(columnAnalysis).filter(c => ['FAIBLE', 'VIDE'].includes(columnAnalysis[c].status)).length)

    return {
      rows: totalRows,
      columns,
      stats: columnAnalysis
    }
  }

  getColumnStatus(coverage) {
    if (coverage >= 90) return 'EXCELLENT'
    if (coverage >= 70) return 'BON'
    if (coverage >= 40) return 'MOYEN'
    if (coverage >= 10) return 'FAIBLE'
    return 'VIDE'
  }

  generateTableSummary(columnAnalysis) {
    const columns = Object.keys(columnAnalysis)
    return {
      excellent: columns.filter(c => columnAnalysis[c].status === 'EXCELLENT').length,
      bon:        columns.filter(c => columnAnalysis[c].status === 'BON').length,
      moyen:      columns.filter(c => columnAnalysis[c].status === 'MOYEN').length,
      faible:     columns.filter(c => columnAnalysis[c].status === 'FAIBLE').length,
      vide:       columns.filter(c => columnAnalysis[c].status === 'VIDE').length
    }
  }

  // ------------------------------
  // Recommandations automatiques
  // ------------------------------
  generateRecommendations() {
    const recs = []
    for (const [fullName, tableResult] of Object.entries(this.auditResults)) {
      const { column_analysis, total_rows } = tableResult
      if (!column_analysis || total_rows === 0) continue

      // Colonnes avec couverture très faible
      const lowCols = Object.entries(column_analysis)
        .filter(([, v]) => v.coverage < LOW_COVERAGE_THRESHOLD)
        .map(([k]) => k)

      if (lowCols.length) {
        recs.push({
          priority: 'HIGH',
          table: fullName,
          issue: `Faible couverture (<${LOW_COVERAGE_THRESHOLD}%) sur ${lowCols.length} colonne(s)`,
          columns: lowCols.slice(0, 25), // on évite un listing trop long
          suggestion: 'Vérifier le pipeline d’ingestion (mapping des champs, parsers, transformations) et la source upstream.'
        })
      }

      // Colonnes “toutes remplies” mais avec beaucoup de "default_like"
      const suspiciousDefaults = Object.entries(column_analysis)
        .filter(([, v]) => v.filled > 0 && v.default_like / (v.total || 1) > 0.5) // >50% de valeurs par défaut
        .map(([k]) => k)

      if (suspiciousDefaults.length) {
        recs.push({
          priority: 'MEDIUM',
          table: fullName,
          issue: `Beaucoup de valeurs par défaut sur ${suspiciousDefaults.length} colonne(s)`,
          columns: suspiciousDefaults.slice(0, 25),
          suggestion: 'Confirmer que 0/false/""/objets vides sont des valeurs métier valides et non des placeholders d’ingestion.'
        })
      }
    }

    // Ordonner: HIGH d’abord
    recs.sort((a, b) => (a.priority === 'HIGH' && b.priority !== 'HIGH' ? -1 : 1))
    this.recommendations = recs
  }

  // ------------------------------
  // Scores
  // ------------------------------
  calculateGlobalQualityScore() {
    const tables = Object.values(this.auditResults)
    if (!tables.length) return 0

    // Score = moyenne des scores table (pondération simple par nbre de colonnes)
    const tableScores = tables.map(t => {
      const s = t.summary
      const totalCols = (s?.excellent ?? 0) + (s?.bon ?? 0) + (s?.moyen ?? 0) + (s?.faible ?? 0) + (s?.vide ?? 0)
      if (!totalCols) return 0
      const score =
        (s.excellent * 100 + s.bon * 75 + s.moyen * 50 + s.faible * 25 + s.vide * 0) / totalCols
      return score
    })

    const avg = Math.round(tableScores.reduce((a, b) => a + b, 0) / tableScores.length)
    return avg
  }

  // ------------------------------
  // Rapport
  // ------------------------------
  async saveReport() {
    const report = {
      generated_at: new Date().toISOString(),
      schemas_scanned: SCHEMAS,
      audit_results: this.auditResults,
      recommendations: this.recommendations,
      quality_score: this.calculateGlobalQualityScore()
    }

    await fs.writeFile('./database-quality-audit-report.json', JSON.stringify(report, null, 2))
    console.log('📄 Rapport sauvegardé: database-quality-audit-report.json')
  }

  // ------------------------------
  // Entrée principale
  // ------------------------------
  async runCompleteAudit() {
    console.log('🚀 DÉMARRAGE AUDIT QUALITÉ — Scan de toutes les tables')
    console.log('='.repeat(80))

    try {
      const tables = await this.listTables()
      console.log(`📚 Tables détectées (${tables.length}) : ${tables.map(t => `${t.schema}.${t.name}`).join(', ')}`)

      for (const { schema, name } of tables) {
        await this.scanTable(schema, name)
      }

      this.generateRecommendations()

      // Récap console
      console.log('\n🧾 RÉCAPITULATIF')
      const globalScore = this.calculateGlobalQualityScore()
      console.log(`   Tables auditées: ${Object.keys(this.auditResults).length}`)
      console.log(`   Score qualité global: ${globalScore}/100`)
      if (globalScore >= 80) console.log('   🟢 EXCELLENTE qualité')
      else if (globalScore >= 60) console.log('   🟡 BONNE qualité')
      else console.log('   🔴 Qualité à améliorer')

      // Recommandations
      console.log('\n💡 RECOMMANDATIONS (TOP 10)')
      this.recommendations.slice(0, 10).forEach((r, i) => {
        console.log(`   ${i + 1}. [${r.priority}] ${r.table} — ${r.issue}`)
        if (r.columns?.length) console.log(`      Colonnes: ${r.columns.join(', ')}`)
        if (r.suggestion) console.log(`      Suggestion: ${r.suggestion}`)
      })

      await this.saveReport()
      console.log('\n✅ Audit terminé')
    } catch (err) {
      console.error('💥 Erreur audit:', err.message)
      process.exitCode = 1
    }
  }
}

// Exécution
if (require.main === module) {
  const auditor = new DatabaseQualityAuditor()
  auditor.runCompleteAudit().catch(console.error)
}

module.exports = DatabaseQualityAuditor
