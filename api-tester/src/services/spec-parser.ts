import {
  OpenApiSpec,
  EndpointItem,
  TagGroup,
  HttpMethod,
  OpenApiOperation,
} from '../types/openapi';

/**
 * Genera un ejemplo de cuerpo JSON a partir de un esquema OpenAPI
 */
export function generateExampleFromSchema(schema: any): any {
  if (!schema) return null;

  if (schema.example !== undefined) {
    return schema.example;
  }

  if (schema.default !== undefined) {
    return schema.default;
  }

  const type = schema.type;

  if (type === 'object' || schema.properties) {
    const obj: Record<string, any> = {};
    const props = schema.properties || {};
    for (const [key, propSchema] of Object.entries(props)) {
      obj[key] = generateExampleFromSchema(propSchema as any);
    }
    return obj;
  }

  if (type === 'array') {
    if (schema.items) {
      return [generateExampleFromSchema(schema.items)];
    }
    return [];
  }

  if (type === 'string') {
    if (schema.enum && schema.enum.length > 0) return schema.enum[0];
    if (schema.format === 'email') return 'usuario@ejemplo.com';
    if (schema.format === 'uuid') return 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
    if (schema.format === 'date-time') return new Date().toISOString();
    if (schema.format === 'password') return 'ClaveSegura2026!';
    return 'texto_ejemplo';
  }

  if (type === 'number' || type === 'integer') {
    return schema.minimum !== undefined ? schema.minimum : 10;
  }

  if (type === 'boolean') {
    return true;
  }

  return '';
}

/**
 * Resuelve una referencia $ref básica dentro del mismo documento (#/components/schemas/...)
 */
export function resolveRef(ref: string, spec: OpenApiSpec): any {
  if (!ref || !ref.startsWith('#/')) return null;
  const parts = ref.replace('#/', '').split('/');
  let current: any = spec;
  for (const part of parts) {
    if (!current || typeof current !== 'object') return null;
    current = current[part];
  }
  return current;
}

/**
 * Normaliza y analiza un documento OpenAPI/Swagger convirtiéndolo en EndpointItem[]
 */
export function parseOpenApiSpec(spec: OpenApiSpec): {
  endpoints: EndpointItem[];
  tagGroups: TagGroup[];
  allTags: string[];
} {
  const endpoints: EndpointItem[] = [];
  const tagMap = new Map<string, EndpointItem[]>();

  if (!spec || !spec.paths) {
    return { endpoints: [], tagGroups: [], allTags: [] };
  }

  const validMethods: HttpMethod[] = [
    'GET',
    'POST',
    'PUT',
    'PATCH',
    'DELETE',
    'OPTIONS',
    'HEAD',
  ];

  for (const [pathKey, pathObj] of Object.entries(spec.paths)) {
    if (!pathObj || typeof pathObj !== 'object') continue;

    for (const [methodKey, operationObj] of Object.entries(pathObj)) {
      const upperMethod = methodKey.toUpperCase() as HttpMethod;
      if (!validMethods.includes(upperMethod)) continue;

      const operation = operationObj as OpenApiOperation;
      const tag = operation.tags?.[0] || 'General';

      // Parámetros heredados del path + propios de la operación
      const rawParams = [
        ...((pathObj as any).parameters || []),
        ...(operation.parameters || []),
      ];

      // Resolver $ref en parámetros si existen
      const parameters = rawParams.map((p) => {
        if (p.$ref) {
          const resolved = resolveRef(p.$ref, spec);
          return resolved || p;
        }
        return p;
      });

      // Si el requestBody tiene $ref en su esquema, resolverlo
      const requestBody = operation.requestBody ? { ...operation.requestBody } : undefined;
      if (requestBody?.content) {
        for (const mediaType of Object.keys(requestBody.content)) {
          const contentItem = requestBody.content[mediaType];
          if (contentItem?.schema?.$ref) {
            contentItem.schema = resolveRef(contentItem.schema.$ref, spec) || contentItem.schema;
          }
        }
      }

      const id = `${upperMethod}_${pathKey.replace(/[^a-zA-Z0-9]/g, '_')}`;

      const item: EndpointItem = {
        id,
        method: upperMethod,
        path: pathKey,
        summary: operation.summary || `${upperMethod} ${pathKey}`,
        description: operation.description || '',
        tag,
        parameters,
        requestBody,
        responses: operation.responses,
        rawOperation: operation,
      };

      endpoints.push(item);

      if (!tagMap.has(tag)) {
        tagMap.set(tag, []);
      }
      tagMap.get(tag)!.push(item);
    }
  }

  const tagGroups: TagGroup[] = Array.from(tagMap.entries()).map(
    ([tag, groupEndpoints]) => ({
      tag,
      description: spec.tags?.find((t) => t.name === tag)?.description,
      endpoints: groupEndpoints,
    })
  );

  const allTags = Array.from(tagMap.keys()).sort();

  return { endpoints, tagGroups, allTags };
}

