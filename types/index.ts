export type TransactionSource = "danea" | "bank";
export type Direction = "in" | "out";

export type Transaction = {
  id: string;
  source: TransactionSource;
  originalRowIndex: number;

  date: string; // ISO YYYY-MM-DD
  amountCents: number; // negativo per uscite
  absAmountCents: number; // sempre positivo
  direction: Direction;

  description?: string;
  reference?: string;

  raw: Record<string, unknown>;

  meta?: {
    currency?: string;
    account?: string;
    protocol?: string;
    document?: string;
    subtotalCents?: number;
    ignoredReason?: string;
  };
};

export type IgnoredRow = {
  originalRowIndex: number;
  reason: string;
  raw: Record<string, unknown>;
};

export type ImportWarning = {
  rowIndex?: number;
  message: string;
  severity: "info" | "warning" | "error";
};

export type FileProfile = "danea" | "bank" | "unknown";

export type ImportResult = {
  profile: FileProfile;
  transactions: Transaction[];
  ignoredRows: IgnoredRow[];
  warnings: ImportWarning[];
  detectedColumns: Record<string, string>;
};

export type MatchStatus = "exact" | "grouped" | "ambiguous" | "unmatched";
export type MatchType =
  | "one_to_one"
  | "one_to_many"
  | "many_to_one"
  | "many_to_many";
export type ConfirmedBy = "auto" | "user";

export type MatchCandidate = {
  type: MatchType;
  left: Transaction[];
  right: Transaction[];
  leftTotalCents: number;
  rightTotalCents: number;
  amountDiffCents: number;
  confidence: number;
  reason: string;
};

export type MatchResult = {
  id: string;
  status: MatchStatus;
  type?: MatchType;

  left: Transaction[]; // lato Danea
  right: Transaction[]; // lato banca

  leftTotalCents: number;
  rightTotalCents: number;
  amountDiffCents: number;

  confidence: number; // 0–100
  reason: string;

  alternatives?: MatchCandidate[];
  confirmedBy?: ConfirmedBy;
};

export type ReconciliationConfig = {
  dateWindowDays: number;
  amountToleranceCents: number;
  maxGroupSize: number;

  enableExactOneToOne: boolean;
  enableOneToMany: boolean;
  enableManyToOne: boolean;

  useDescriptionSimilarity: boolean;
  minConfidenceForAutoMatch: number;
};

export const DEFAULT_CONFIG: ReconciliationConfig = {
  dateWindowDays: 36500, // date ignorate (100 anni = nessun filtro)
  amountToleranceCents: 0, // importo esatto
  maxGroupSize: 12, // limite tecnico per evitare esplosioni combinatorie
  enableExactOneToOne: true,
  enableOneToMany: true,
  enableManyToOne: true,
  useDescriptionSimilarity: false,
  minConfidenceForAutoMatch: 80,
};

export type ReconciliationStats = {
  totalLeft: number;
  totalRight: number;
  matchedExact: number;
  matchedGrouped: number;
  ambiguous: number;
  unmatchedLeft: number;
  unmatchedRight: number;
  totalLeftCents: number;
  totalRightCents: number;
  matchedLeftCents: number;
  matchedRightCents: number;
};

export type ReconciliationResult = {
  matches: MatchResult[];
  unmatchedLeft: Transaction[];
  unmatchedRight: Transaction[];
  stats: ReconciliationStats;
};

export type ReconciliationInput = {
  left: Transaction[];
  right: Transaction[];
  config: ReconciliationConfig;
};

export type AppStep =
  | "upload"
  | "preview"
  | "settings"
  | "results"
  | "export";

export type FileState = {
  file: File;
  importResult: ImportResult | null;
  loading: boolean;
  error: string | null;
};
