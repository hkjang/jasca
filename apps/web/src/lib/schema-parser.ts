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
