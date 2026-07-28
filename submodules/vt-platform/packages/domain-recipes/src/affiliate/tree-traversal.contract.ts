export interface AffiliateTreeNode {
  memberId: string;
  parentMemberId?: string;
  depth: number;
}

export interface AffiliateTreeTraversal {
  getUpline(memberId: string, maxDepth?: number): Promise<AffiliateTreeNode[]>;
  getDownline(memberId: string, maxDepth?: number): Promise<AffiliateTreeNode[]>;
}

export interface CommissionCalculationInput {
  tenantId: string;
  orderId: string;
  buyerId: string;
  totalPayment: number;
  completedAt: string;
}

export interface CommissionLedgerEntry {
  idempotencyKey: string;
  tenantId: string;
  orderId: string;
  receiverMemberId: string;
  commissionType: string;
  amount: number;
  sourceRevenue: number;
}

export interface CommissionCalculator {
  calculate(input: CommissionCalculationInput): Promise<CommissionLedgerEntry[]>;
}
