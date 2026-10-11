export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS' | 'HEAD';

export interface OpenApiParameter {
  name: string;
  in: 'path' | 'query' | 'header' | 'cookie';
  description?: string;
  required?: boolean;
  schema?: any;
  example?: any;
}

export interface OpenApiRequestBody {
  description?: string;
  required?: boolean;
  content?: {
    [mediaType: string]: {
      schema?: any;
      example?: any;
      examples?: Record<string, any>;
    };
  };
}

export interface OpenApiResponse {
  description: string;
  content?: {
    [mediaType: string]: {
      schema?: any;
      example?: any;
    };
  };
}

export interface OpenApiOperation {
  summary?: string;
  description?: string;
  tags?: string[];
  operationId?: string;
  parameters?: OpenApiParameter[];
  requestBody?: OpenApiRequestBody;
  responses?: Record<string, OpenApiResponse>;
}

export interface OpenApiSpec {
  openapi?: string;
  swagger?: string;
  info: {
    title: string;
    version: string;
    description?: string;
  };
  servers?: Array<{
    url: string;
    description?: string;
  }>;
  tags?: Array<{
    name: string;
    description?: string;
  }>;
  paths: {
    [path: string]: {
      [method in string]?: OpenApiOperation;
    };
  };
  components?: {
    schemas?: Record<string, any>;
    securitySchemes?: Record<string, any>;
  };
}

export interface EndpointItem {
  id: string;
  method: HttpMethod;
  path: string;
  summary: string;
  description: string;
  tag: string;
  parameters: OpenApiParameter[];
  requestBody?: OpenApiRequestBody;
  responses?: Record<string, OpenApiResponse>;
  rawOperation: OpenApiOperation;
}

export interface TagGroup {
  tag: string;
  description?: string;
  endpoints: EndpointItem[];
}

