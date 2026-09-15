/** Types mirror the documented PanelFollows v3 objects exactly — see panelfollows.com/en/api-docs */

export interface PanelFollowsServiceField {
  name: string;
  type: "url" | "integer" | "string" | "text_lines";
  required: boolean;
  label: string;
  description: string;
  min?: number;
  max?: number;
  determines_quantity?: boolean;
}

export interface PanelFollowsService {
  object: "service";
  id: number;
  name: string;
  description: string;
  type: string;
  platform: string;
  category: { slug: string; name: string };
  pricing: {
    rate: string; // decimal string, e.g. "1.2340"
    currency: "USD";
    unit: "per_1000" | "per_order";
    unit_note: string;
  };
  limits: { min: number; max: number };
  features: { refill: boolean; cancel: boolean; dripfeed: boolean };
  average_time_seconds: number | null;
  fields: PanelFollowsServiceField[];
  is_active: boolean;
  updated_at: string;
}

export interface PanelFollowsListResponse<T> {
  object: "list";
  data: T[];
  has_more: boolean;
  next_cursor: string | null;
}

export interface PanelFollowsErrorBody {
  object: "error";
  error: {
    type: string;
    code: string;
    message: string;
    param?: string;
    doc_url?: string;
    request_id: string;
  };
}

export class PanelFollowsApiError extends Error {
  constructor(
    public readonly code: string,
    public readonly httpStatus: number,
    message: string,
    public readonly requestId?: string,
  ) {
    super(message);
    this.name = "PanelFollowsApiError";
  }
}
