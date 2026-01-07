/**
 * Prisma Schema Parser
 * Parses schema.prisma file and extracts models, fields, relations, and enums
 */

export interface SchemaField {
  name: string;
  type: string;
  isArray: boolean;
  isOptional: boolean;
  isPrimaryKey: boolean;
  isUnique: boolean;
  hasDefault: boolean;
  defaultValue?: string;
  relation?: {
    model: string;
    fields?: string[];
    references?: string[];
    onDelete?: string;
    onUpdate?: string;
  };
  attributes: string[];
}

export interface SchemaModel {
  name: string;
  fields: SchemaField[];
  indexes: string[];
  uniqueConstraints: string[];
}

export interface SchemaEnum {
  name: string;
  values: string[];
}

export interface SchemaRelation {
  from: string;
  to: string;
  fromField: string;
  type: '1:1' | '1:N' | 'N:1' | 'N:M';
  onDelete?: string;
}

export interface ParsedSchema {
  models: SchemaModel[];
  enums: SchemaEnum[];
  relations: SchemaRelation[];
}

/**
 * Parse Prisma schema content
 */
export function parsePrismaSchema(content: string): ParsedSchema {
  const models: SchemaModel[] = [];
  const enums: SchemaEnum[] = [];
  const relations: SchemaRelation[] = [];

  // Remove comments
  const cleanContent = content
    .split('\n')
    .map(line => {
      const commentIndex = line.indexOf('//');
      return commentIndex >= 0 ? line.substring(0, commentIndex) : line;
    })
    .join('\n');

  // Parse enums
  const enumRegex = /enum\s+(\w+)\s*\{([^}]+)\}/g;
  let enumMatch;
  while ((enumMatch = enumRegex.exec(cleanContent)) !== null) {
    const enumName = enumMatch[1];
    const enumBody = enumMatch[2];
    const values = enumBody
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('//'));
    
    enums.push({
      name: enumName,
      values,
    });
  }

  // Parse models
  const modelRegex = /model\s+(\w+)\s*\{([^}]+)\}/g;
  let modelMatch;
  while ((modelMatch = modelRegex.exec(cleanContent)) !== null) {
    const modelName = modelMatch[1];
    const modelBody = modelMatch[2];
    const fields: SchemaField[] = [];
    const indexes: string[] = [];
    const uniqueConstraints: string[] = [];

    const lines = modelBody.split('\n').map(line => line.trim()).filter(line => line);

    for (const line of lines) {
      // Check for @@index or @@unique
      if (line.startsWith('@@index')) {
        indexes.push(line);
        continue;
      }
      if (line.startsWith('@@unique')) {
        uniqueConstraints.push(line);
        continue;
      }
      if (line.startsWith('@@')) {
        continue;
      }

      // Parse field
      const field = parseField(line, modelName);
      if (field) {
        fields.push(field);

        // Extract relation
        if (field.relation) {
          const relationType = field.isArray ? '1:N' : (field.isOptional ? '1:1' : 'N:1');
          relations.push({
            from: modelName,
            to: field.relation.model,
            fromField: field.name,
            type: relationType,
            onDelete: field.relation.onDelete,
          });
        }
      }
    }

    models.push({
      name: modelName,
      fields,
      indexes,
      uniqueConstraints,
    });
  }

  return { models, enums, relations };
}

function parseField(line: string, modelName: string): SchemaField | null {
  // Match field pattern: fieldName Type? @attribute
  const fieldMatch = line.match(/^(\w+)\s+(\w+)(\[\])?(\?)?\s*(.*)?$/);
  if (!fieldMatch) return null;

  const [, name, type, isArrayStr, isOptionalStr, attributesStr] = fieldMatch;
  const attributes = attributesStr ? attributesStr.split(/\s+/).filter(a => a.startsWith('@')) : [];

  const field: SchemaField = {
    name,
    type,
    isArray: !!isArrayStr,
    isOptional: !!isOptionalStr,
    isPrimaryKey: attributes.some(a => a.includes('@id')),
    isUnique: attributes.some(a => a.includes('@unique')),
    hasDefault: attributes.some(a => a.includes('@default')),
    attributes,
  };

  // Extract default value
  const defaultMatch = attributesStr?.match(/@default\(([^)]+)\)/);
  if (defaultMatch) {
    field.defaultValue = defaultMatch[1];
  }

  // Extract relation
  const relationMatch = attributesStr?.match(/@relation\(([^)]+)\)/);
  if (relationMatch) {
    const relationStr = relationMatch[1];
    const fieldsMatch = relationStr.match(/fields:\s*\[([^\]]+)\]/);
    const referencesMatch = relationStr.match(/references:\s*\[([^\]]+)\]/);
    const onDeleteMatch = relationStr.match(/onDelete:\s*(\w+)/);
    const onUpdateMatch = relationStr.match(/onUpdate:\s*(\w+)/);

    // Determine related model - it's the field type
    field.relation = {
      model: type,
      fields: fieldsMatch ? fieldsMatch[1].split(',').map(f => f.trim()) : undefined,
      references: referencesMatch ? referencesMatch[1].split(',').map(r => r.trim()) : undefined,
      onDelete: onDeleteMatch ? onDeleteMatch[1] : undefined,
      onUpdate: onUpdateMatch ? onUpdateMatch[1] : undefined,
    };
  }

  return field;
}

/**
 * Generate Mermaid ERD diagram from parsed schema
 */
export function generateMermaidERD(schema: ParsedSchema, options?: {
  includeFields?: boolean;
  maxFieldsPerModel?: number;
  highlightModel?: string;
}): string {
  const { includeFields = true, maxFieldsPerModel = 15, highlightModel } = options || {};
  
  let mermaid = 'erDiagram\n';

  // Add models with fields
  for (const model of schema.models) {
    mermaid += `    ${model.name} {\n`;
    
    if (includeFields) {
      const fieldsToShow = model.fields.slice(0, maxFieldsPerModel);
      for (const field of fieldsToShow) {
        // Skip relation fields (they're shown as connections)
        if (field.relation && !field.type.match(/^(String|Int|Float|Boolean|DateTime|Json)$/)) {
          continue;
        }
        
        // Mermaid ERD doesn't support special characters in type names
        // Use simple type without [] or ? - those are shown in comments
        const typeStr = field.type.toLowerCase();
        const modifiers: string[] = [];
        if (field.isArray) modifiers.push('array');
        if (field.isOptional) modifiers.push('optional');
        
        let keyIndicator = '';
        if (field.isPrimaryKey) keyIndicator = 'PK';
        else if (field.isUnique) keyIndicator = 'UK';
        else if (field.relation) keyIndicator = 'FK';
        
        // Build the comment part combining key indicator and modifiers
        const commentParts: string[] = [];
        if (keyIndicator) commentParts.push(keyIndicator);
        if (modifiers.length > 0) commentParts.push(modifiers.join(','));
        const comment = commentParts.length > 0 ? ` "${commentParts.join(' ')}"` : '';
        
        mermaid += `        ${typeStr} ${field.name}${comment}\n`;
      }
      
      if (model.fields.length > maxFieldsPerModel) {
        mermaid += `        string more "...${model.fields.length - maxFieldsPerModel} more"\n`;
      }
    }
    
    mermaid += `    }\n`;
  }

  // Add relationships
  const addedRelations = new Set<string>();
  for (const relation of schema.relations) {
    // Create unique key to avoid duplicates
    const key = [relation.from, relation.to].sort().join('-');
    if (addedRelations.has(key)) continue;
    addedRelations.add(key);

    let relationSymbol = '';
    switch (relation.type) {
      case '1:1':
        relationSymbol = '||--||';
        break;
      case '1:N':
        relationSymbol = '||--o{';
        break;
      case 'N:1':
        relationSymbol = '}o--||';
        break;
      case 'N:M':
        relationSymbol = '}o--o{';
        break;
    }

    mermaid += `    ${relation.from} ${relationSymbol} ${relation.to} : "${relation.fromField}"\n`;
  }

  return mermaid;
}

/**
 * Get schema statistics
 */
export function getSchemaStats(schema: ParsedSchema) {
  const totalFields = schema.models.reduce((sum, m) => sum + m.fields.length, 0);
  const totalRelations = schema.relations.length;
  const totalIndexes = schema.models.reduce((sum, m) => sum + m.indexes.length, 0);

  return {
    modelCount: schema.models.length,
    enumCount: schema.enums.length,
    totalFields,
    totalRelations,
    totalIndexes,
    avgFieldsPerModel: Math.round(totalFields / schema.models.length),
  };
}

/**
 * Get detailed schema statistics for dashboard
 */
export function getDetailedSchemaStats(schema: ParsedSchema) {
  const baseStats = getSchemaStats(schema);
  
  // Category distribution
  const MODEL_CATEGORIES: Record<string, string[]> = {
    '조직/프로젝트': ['Organization', 'Project', 'Registry'],
    '사용자/인증': ['User', 'UserRole', 'ApiToken', 'UserSession', 'LoginHistory', 'UserInvitation', 'UserMfa', 'EmailVerification', 'SsoConfig', 'IpWhitelist', 'PasswordPolicy', 'PasswordHistory'],
    '스캔/취약점': ['ScanResult', 'ScanSummary', 'Vulnerability', 'ScanVulnerability', 'VulnerabilityComment', 'VulnerabilityImpact', 'VulnerabilityBookmark', 'MergedVulnerability', 'MitreMapping'],
    '정책/예외': ['Policy', 'PolicyRule', 'PolicyException'],
    '워크플로우': ['VulnerabilityWorkflow', 'FixEvidence'],
    '알림': ['NotificationChannel', 'NotificationRule', 'UserNotification'],
    '보고서': ['ReportTemplate', 'Report'],
    '통합': ['GitIntegration', 'GitRepository', 'IssueTrackerIntegration', 'LinkedIssue'],
    '설정/기타': ['RiskScoreConfig', 'AssetCriticality', 'AuditLog', 'SystemSettings', 'AiExecution'],
  };

  const categoryDistribution: Record<string, number> = {};
  const assignedModels = new Set<string>();
  
  for (const [category, modelNames] of Object.entries(MODEL_CATEGORIES)) {
    const count = schema.models.filter(m => {
      if (modelNames.includes(m.name)) {
        assignedModels.add(m.name);
        return true;
      }
      return false;
    }).length;
    if (count > 0) categoryDistribution[category] = count;
  }
  
  const uncategorized = schema.models.filter(m => !assignedModels.has(m.name)).length;
  if (uncategorized > 0) categoryDistribution['기타'] = uncategorized;

  // Field type distribution
  const fieldTypeDistribution: Record<string, number> = {};
  for (const model of schema.models) {
    for (const field of model.fields) {
      const baseType = field.type;
      fieldTypeDistribution[baseType] = (fieldTypeDistribution[baseType] || 0) + 1;
    }
  }

  // Relation type distribution
  const relationTypeDistribution: Record<string, number> = {
    '1:1': 0,
    '1:N': 0,
    'N:1': 0,
    'N:M': 0,
  };
  for (const rel of schema.relations) {
    relationTypeDistribution[rel.type]++;
  }

  // Top models by fields
  const topModelsByFields = [...schema.models]
    .sort((a, b) => b.fields.length - a.fields.length)
    .slice(0, 5)
    .map(m => ({ name: m.name, count: m.fields.length }));

  // Top models by relations
  const modelRelationCounts: Record<string, number> = {};
  for (const rel of schema.relations) {
    modelRelationCounts[rel.from] = (modelRelationCounts[rel.from] || 0) + 1;
  }
  const topModelsByRelations = Object.entries(modelRelationCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  // Cascade delete count
  const cascadeDeleteCount = schema.relations.filter(r => r.onDelete === 'Cascade').length;

  return {
    ...baseStats,
    categoryDistribution,
    fieldTypeDistribution,
    relationTypeDistribution,
    topModelsByFields,
    topModelsByRelations,
    cascadeDeleteCount,
  };
}

/**
 * Schema comparison result types
 */
export interface SchemaDiff {
  addedModels: string[];
  removedModels: string[];
  modifiedModels: {
    name: string;
    addedFields: string[];
    removedFields: string[];
    modifiedFields: string[];
  }[];
  addedEnums: string[];
  removedEnums: string[];
  modifiedEnums: {
    name: string;
    addedValues: string[];
    removedValues: string[];
  }[];
  addedRelations: SchemaRelation[];
  removedRelations: SchemaRelation[];
}

/**
 * Compare two schemas and return differences
 */
export function compareSchemas(oldSchema: ParsedSchema, newSchema: ParsedSchema): SchemaDiff {
  const diff: SchemaDiff = {
    addedModels: [],
    removedModels: [],
    modifiedModels: [],
    addedEnums: [],
    removedEnums: [],
    modifiedEnums: [],
    addedRelations: [],
    removedRelations: [],
  };

  const oldModelNames = new Set(oldSchema.models.map(m => m.name));
  const newModelNames = new Set(newSchema.models.map(m => m.name));
  const oldEnumNames = new Set(oldSchema.enums.map(e => e.name));
  const newEnumNames = new Set(newSchema.enums.map(e => e.name));

  // Added/removed models
  diff.addedModels = newSchema.models
    .filter(m => !oldModelNames.has(m.name))
    .map(m => m.name);
  diff.removedModels = oldSchema.models
    .filter(m => !newModelNames.has(m.name))
    .map(m => m.name);

  // Modified models
  for (const newModel of newSchema.models) {
    if (!oldModelNames.has(newModel.name)) continue;
    
    const oldModel = oldSchema.models.find(m => m.name === newModel.name)!;
    const oldFieldNames = new Set(oldModel.fields.map(f => f.name));
    const newFieldNames = new Set(newModel.fields.map(f => f.name));

    const addedFields = newModel.fields
      .filter(f => !oldFieldNames.has(f.name))
      .map(f => f.name);
    const removedFields = oldModel.fields
      .filter(f => !newFieldNames.has(f.name))
      .map(f => f.name);
    
    // Modified fields (type or attributes changed)
    const modifiedFields: string[] = [];
    for (const newField of newModel.fields) {
      if (!oldFieldNames.has(newField.name)) continue;
      const oldField = oldModel.fields.find(f => f.name === newField.name)!;
      if (
        oldField.type !== newField.type ||
        oldField.isArray !== newField.isArray ||
        oldField.isOptional !== newField.isOptional ||
        oldField.isPrimaryKey !== newField.isPrimaryKey ||
        oldField.isUnique !== newField.isUnique
      ) {
        modifiedFields.push(newField.name);
      }
    }

    if (addedFields.length > 0 || removedFields.length > 0 || modifiedFields.length > 0) {
      diff.modifiedModels.push({
        name: newModel.name,
        addedFields,
        removedFields,
        modifiedFields,
      });
    }
  }

  // Added/removed enums
  diff.addedEnums = newSchema.enums
    .filter(e => !oldEnumNames.has(e.name))
    .map(e => e.name);
  diff.removedEnums = oldSchema.enums
    .filter(e => !newEnumNames.has(e.name))
    .map(e => e.name);

  // Modified enums
  for (const newEnum of newSchema.enums) {
    if (!oldEnumNames.has(newEnum.name)) continue;
    
    const oldEnum = oldSchema.enums.find(e => e.name === newEnum.name)!;
    const oldValues = new Set(oldEnum.values);
    const newValues = new Set(newEnum.values);

    const addedValues = newEnum.values.filter(v => !oldValues.has(v));
    const removedValues = oldEnum.values.filter(v => !newValues.has(v));

    if (addedValues.length > 0 || removedValues.length > 0) {
      diff.modifiedEnums.push({
        name: newEnum.name,
        addedValues,
        removedValues,
      });
    }
  }

  // Relations comparison
  const relationKey = (r: SchemaRelation) => `${r.from}-${r.to}-${r.fromField}`;
  const oldRelationKeys = new Set(oldSchema.relations.map(relationKey));
  const newRelationKeys = new Set(newSchema.relations.map(relationKey));

  diff.addedRelations = newSchema.relations.filter(r => !oldRelationKeys.has(relationKey(r)));
  diff.removedRelations = oldSchema.relations.filter(r => !newRelationKeys.has(relationKey(r)));

  return diff;
}

/**
 * Generate SQL DDL from schema
 */
export function generateSQLDDL(schema: ParsedSchema, dialect: 'postgresql' | 'mysql' = 'postgresql'): string {
  const lines: string[] = [];
  const typeMap: Record<string, Record<string, string>> = {
    postgresql: {
      String: 'TEXT',
      Int: 'INTEGER',
      Float: 'DOUBLE PRECISION',
      Boolean: 'BOOLEAN',
      DateTime: 'TIMESTAMP WITH TIME ZONE',
      Json: 'JSONB',
      BigInt: 'BIGINT',
      Decimal: 'DECIMAL',
      Bytes: 'BYTEA',
    },
    mysql: {
      String: 'TEXT',
      Int: 'INT',
      Float: 'DOUBLE',
      Boolean: 'TINYINT(1)',
      DateTime: 'DATETIME',
      Json: 'JSON',
      BigInt: 'BIGINT',
      Decimal: 'DECIMAL',
      Bytes: 'BLOB',
    },
  };

  // Generate enum types (PostgreSQL only)
  if (dialect === 'postgresql') {
    for (const enumDef of schema.enums) {
      const values = enumDef.values.map(v => `'${v}'`).join(', ');
      lines.push(`CREATE TYPE "${enumDef.name}" AS ENUM (${values});`);
    }
    if (schema.enums.length > 0) lines.push('');
  }

  // Generate tables
  for (const model of schema.models) {
    const tableName = dialect === 'postgresql' ? `"${model.name}"` : `\`${model.name}\``;
    lines.push(`CREATE TABLE ${tableName} (`);
    
    const columnDefs: string[] = [];
    const constraints: string[] = [];
    
    for (const field of model.fields) {
      if (field.relation && !field.type.match(/^(String|Int|Float|Boolean|DateTime|Json)$/)) {
        continue; // Skip relation fields (not actual columns)
      }

      const colName = dialect === 'postgresql' ? `"${field.name}"` : `\`${field.name}\``;
      let sqlType = typeMap[dialect][field.type] || 'TEXT';
      
      // Check if it's an enum type
      if (schema.enums.some(e => e.name === field.type)) {
        sqlType = dialect === 'postgresql' ? `"${field.type}"` : 'VARCHAR(255)';
      }

      let def = `  ${colName} ${sqlType}`;
      
      if (!field.isOptional && !field.hasDefault) {
        def += ' NOT NULL';
      }
      
      if (field.isPrimaryKey) {
        def += ' PRIMARY KEY';
      }
      
      if (field.isUnique && !field.isPrimaryKey) {
        constraints.push(`  UNIQUE (${colName})`);
      }
      
      columnDefs.push(def);
    }

    lines.push(columnDefs.join(',\n'));
    if (constraints.length > 0) {
      lines.push(',\n' + constraints.join(',\n'));
    }
    lines.push(');');
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Generate Markdown documentation from schema
 */
export function generateMarkdownDocs(schema: ParsedSchema): string {
  const lines: string[] = [];
  
  lines.push('# Database Schema Documentation');
  lines.push('');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push('');
  
  // Statistics
  const stats = getSchemaStats(schema);
  lines.push('## Overview');
  lines.push('');
  lines.push(`| Metric | Count |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Models | ${stats.modelCount} |`);
  lines.push(`| Enums | ${stats.enumCount} |`);
  lines.push(`| Total Fields | ${stats.totalFields} |`);
  lines.push(`| Total Relations | ${stats.totalRelations} |`);
  lines.push(`| Total Indexes | ${stats.totalIndexes} |`);
  lines.push('');

  // Models
  lines.push('## Models');
  lines.push('');
  
  for (const model of schema.models) {
    lines.push(`### ${model.name}`);
    lines.push('');
    lines.push('| Field | Type | Attributes |');
    lines.push('|-------|------|------------|');
    
    for (const field of model.fields) {
      const attrs: string[] = [];
      if (field.isPrimaryKey) attrs.push('PK');
      if (field.isUnique) attrs.push('Unique');
      if (field.isOptional) attrs.push('Optional');
      if (field.isArray) attrs.push('Array');
      if (field.hasDefault) attrs.push(`Default: ${field.defaultValue || 'auto'}`);
      if (field.relation) attrs.push(`→ ${field.relation.model}`);
      
      const type = `${field.type}${field.isArray ? '[]' : ''}${field.isOptional ? '?' : ''}`;
      lines.push(`| ${field.name} | \`${type}\` | ${attrs.join(', ')} |`);
    }
    lines.push('');
  }

  // Enums
  if (schema.enums.length > 0) {
    lines.push('## Enums');
    lines.push('');
    
    for (const enumDef of schema.enums) {
      lines.push(`### ${enumDef.name}`);
      lines.push('');
      lines.push('Values:');
      for (const value of enumDef.values) {
        lines.push(`- \`${value}\``);
      }
      lines.push('');
    }
  }

  return lines.join('\n');
}
