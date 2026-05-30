export interface Chemical {
  chemical_id: number;
  name: string;
  type: string;
  quantity: number;
  unit: string;
  threshold: number;
  last_updated: string;
}

export interface ChemicalFormData {
  name: string;
  type: string;
  quantity: number;
  unit: string;
  threshold: number;
  // Batch info when adding
  expiration_date: string;
  location: string;
}

export interface Batch {
  batch_id: number;
  chemical_id: number;
  chemical_name?: string;
  quantity: number;
  used_quantity: number;
  date_received: string;
  expiration_date: string;
  location: string;
  qr_code: string | null;
}

export interface BatchFormData {
  chemical_id: number;
  quantity: number;
  expiration_date: string;
  location: string;
}
