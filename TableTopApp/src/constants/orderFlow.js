// Shared status maps for the waiter/kitchen boards. Statuses mirror the
// CHECK constraints in database/01_schema.sql.

// The tick-off chain: what one press moves an order item to next.
export const NEXT_ACTION = {
  queued:         { next: 'in_progress',    label: 'Preparing',      icon: 'flame-outline',      color: '#1976D2' },
  in_progress:    { next: 'ready_to_serve', label: 'Ready to Serve', icon: 'checkmark-outline',  color: '#388E3C' },
  ready_to_serve: { next: 'served',         label: 'Served',         icon: 'restaurant-outline', color: '#F5891F' },
};

export const ITEM_BADGE = {
  queued:         { label: 'Queued',    bg: '#FFF3E0', text: '#F5891F' },
  in_progress:    { label: 'Preparing', bg: '#E3F2FD', text: '#1976D2' },
  ready_to_serve: { label: 'Ready',     bg: '#E8F5E9', text: '#388E3C' },
  served:         { label: 'Served',    bg: '#EEEEEE', text: '#616161' },
  cancelled:      { label: 'Cancelled', bg: '#FFEBEE', text: '#C62828' },
};

export const ORDER_BADGE = {
  placed:      { label: 'New Order',   bg: '#FFF3E0', text: '#F5891F' },
  in_progress: { label: 'In Progress', bg: '#E3F2FD', text: '#1976D2' },
  ready:       { label: 'All Ready',   bg: '#E8F5E9', text: '#388E3C' },
};

export const CALL_LABEL = {
  call_waiter: 'Call waiter',
  request_bill: 'Requesting the bill',
  assistance: 'Needs assistance',
  other: 'Request',
};
