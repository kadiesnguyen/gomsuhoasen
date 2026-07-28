export interface ParentItemInput {
  lineId: string;
  productId: string;
  qty: number;
}

export interface SplitItemInput {
  productId: string;
  qty: number;
}

export interface OrderSplitPlan {
  shouldRebalanceReservation: boolean;
  parentItemsToUpdate: readonly {
    lineId: string;
    qty: number;
  }[];
  childItemsToCreate: readonly {
    parentLineId: string;
    qty: number;
  }[];
  errorReason?:
    | 'STATUS_NOT_ALLOWED'
    | 'MIN_ITEMS_REQUIRED'
    | 'ITEM_NOT_FOUND'
    | 'QUANTITY_EXCEEDED'
    | 'EMPTY_PARENT';
  errorDetails?: Record<string, any>;
}
